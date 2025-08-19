import { useState } from 'react';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { X } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from '@/hooks/use-toast';
import { emailSchema } from '@shared/schema';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { apiRequest } from '@/lib/queryClient';
import { validateCorporateEmails } from '@/lib/email-validation';

interface AddTeamMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: number;
  teamId: number | null;
}

const formSchema = z.object({
  emails: z.string().min(1, {
    message: "Please enter at least one email address",
  }),
});

export function AddTeamMembersModal({
  isOpen,
  onClose,
  projectId,
  teamId,
}: AddTeamMembersModalProps) {
  const [loading, setLoading] = useState(false);
  const queryClient = useQueryClient();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      emails: '',
    },
  });

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!teamId) {
      toast({
        title: "Error",
        description: "This project is not associated with a team.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Split and trim emails
      const emailList = values.emails
        .split(/[,;\n]/)
        .map(email => email.trim())
        .filter(email => email.length > 0);

      // Validate emails
      const { valid, invalid } = validateCorporateEmails(emailList);
      
      if (invalid.length > 0) {
        toast({
          title: "Invalid email formats",
          description: `The following emails are not valid corporate emails: ${invalid.join(', ')}`,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (valid.length === 0) {
        toast({
          title: "No valid emails",
          description: "Please enter at least one valid corporate email address",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // First, ensure all users exist
      const userPromises = valid.map(async (email) => {
        // Check if user exists with this email
        const checkUserResponse = await fetch(`/api/users/by-email/${encodeURIComponent(email)}`);
        
        if (checkUserResponse.status === 404) {
          // Create user if not found
          return fetch('/api/users', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              email,
              username: email.split('@')[0],
              fullName: email.split('@')[0].replace(/[.]/g, ' '),
              password: Math.random().toString(36).slice(-8), // Random password (will be changed on first login)
            }),
          });
        }
        
        return checkUserResponse;
      });

      const userResults = await Promise.all(userPromises);
      
      // Now add each user to the team
      const addMemberPromises = userResults.map(async (userResponse) => {
        if (!userResponse.ok) {
          console.error("Failed to create or retrieve user:", userResponse.statusText);
          return null;
        }
        
        const userData = await userResponse.json();
        
        // Add user to team
        return fetch(`/api/teams/${teamId}/members`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            userId: userData.id,
            role: "MEMBER" // Default role
          }),
        });
      });

      const results = await Promise.all(addMemberPromises);
      const successCount = results.filter(r => r && r.ok).length;
      
      if (successCount > 0) {
        toast({
          title: "Success!",
          description: `Added ${successCount} member${successCount > 1 ? 's' : ''} to the team.`,
        });
        
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: [`/api/teams/${teamId}/members`] });
        
        // Close the modal
        form.reset();
        onClose();
      } else {
        toast({
          title: "Error",
          description: "Failed to add members to the team.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error adding team members:", error);
      toast({
        title: "Something went wrong",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Add Team Members</span>
            <Button variant="ghost" className="h-6 w-6 p-0" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="emails"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium">Email Addresses</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter email addresses (one per line or separated by commas)"
                      className="min-h-[120px]"
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-neutral-500 mt-1">
                    Enter corporate email addresses. Users who don't exist will be created automatically.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Adding..." : "Add Members"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}