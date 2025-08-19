import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Team } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { validateCorporateEmails } from "@/lib/email-validation";
import { apiRequest } from "@/lib/queryClient";

// Define the form schema with validation
const inviteFormSchema = z.object({
  teamId: z.string(),
  emails: z.string().min(1, "Email addresses are required"),
  role: z.string(),
  newTeamName: z.string().optional(),
});

type InviteFormValues = z.infer<typeof inviteFormSchema>;

interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  teams: Team[];
  onCreateTeam: (name: string) => Promise<Team>;
}

export function InviteModal({ 
  isOpen, 
  onClose, 
  teams,
  onCreateTeam 
}: InviteModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Set up the form
  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      teamId: teams.length > 0 ? teams[0].id.toString() : "new",
      emails: "",
      role: "MEMBER",
      newTeamName: "",
    },
  });
  
  const selectedTeamId = form.watch("teamId");
  const isNewTeam = selectedTeamId === "new";

  // Mutation for inviting users
  const inviteMutation = useMutation({
    mutationFn: async (inviteData: { emails: string[], teamId: string, role: string }) => {
      const results = [];
      for (const email of inviteData.emails) {
        try {
          // Create user
          const userResponse = await apiRequest('POST', '/api/users/invite', {
            email: email.trim(),
            username: email.split('@')[0],
            role: 'USER'
          });
          const user = await userResponse.json();
          
          // Add to team
          await apiRequest('POST', `/api/teams/${inviteData.teamId}/members`, {
            userId: user.id,
            role: inviteData.role
          });
          
          results.push({ success: true, email });
        } catch (error) {
          results.push({ success: false, email, error });
        }
      }
      return results;
    },
    onSuccess: (results) => {
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/teams'] });
      
      if (successful.length > 0) {
        toast({
          title: "Invitations sent",
          description: `${successful.length} member${successful.length > 1 ? "s" : ""} added to team successfully.`,
        });
      }
      
      if (failed.length > 0) {
        toast({
          title: "Some invitations failed",
          description: `${failed.length} invitation${failed.length > 1 ? "s" : ""} could not be sent.`,
          variant: "destructive",
        });
      }
      
      onClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Could not send invitations. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Handle form submission
  const onSubmit = async (data: InviteFormValues) => {
    try {
      // Validate email addresses
      const emails = data.emails.split(/[\s,]+/).filter(email => email.trim());
      const { valid, invalid } = validateCorporateEmails(emails);
      
      if (invalid.length > 0) {
        toast({
          title: "Invalid emails",
          description: `The following emails are not corporate addresses: ${invalid.join(", ")}`,
          variant: "destructive",
        });
        return;
      }
      
      if (valid.length === 0) {
        toast({
          title: "No valid emails",
          description: "Please enter at least one valid corporate email address.",
          variant: "destructive",
        });
        return;
      }
      
      // Handle new team creation if needed
      let teamId = data.teamId;
      if (isNewTeam) {
        if (!data.newTeamName || data.newTeamName.trim() === "") {
          toast({
            title: "Team name required",
            description: "Please enter a name for the new team.",
            variant: "destructive",
          });
          return;
        }
        
        const newTeam = await onCreateTeam(data.newTeamName);
        teamId = newTeam.id.toString();
      }
      
      // Trigger the invitation mutation
      inviteMutation.mutate({
        emails: valid,
        teamId,
        role: data.role
      });
      
    } catch (error) {
      console.error("Error sending invitations:", error);
      toast({
        title: "Error",
        description: "Could not send invitations. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Invite Team Members</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="teamId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Team</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select team" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {teams.map(team => (
                        <SelectItem key={team.id} value={team.id.toString()}>
                          {team.name}
                        </SelectItem>
                      ))}
                      <SelectItem value="new">Create New Team...</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {isNewTeam && (
              <FormField
                control={form.control}
                name="newTeamName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Team Name</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Enter team name" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <FormField
              control={form.control}
              name="emails"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Addresses</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Enter email addresses separated by commas"
                      rows={3}
                    />
                  </FormControl>
                  <FormDescription>
                    Only corporate email domains are allowed.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="MEMBER">Team Member</SelectItem>
                      <SelectItem value="LEAD">Team Lead</SelectItem>
                      <SelectItem value="MANAGER">Project Manager</SelectItem>
                      <SelectItem value="ADMIN">Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="mt-6">
              <Button variant="outline" type="button" onClick={onClose} disabled={inviteMutation.isPending}>
                Cancel
              </Button>
              <Button type="submit" disabled={inviteMutation.isPending}>
                {inviteMutation.isPending ? "Sending..." : "Send Invitations"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
