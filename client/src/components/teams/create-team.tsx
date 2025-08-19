import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

// Define the form schema
const teamFormSchema = z.object({
  name: z.string().min(3, { message: "Team name must be at least 3 characters" }),
  description: z.string().optional(),
});

type TeamFormValues = z.infer<typeof teamFormSchema>;

interface CreateTeamProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (team: any) => void;
  userId: number;
}

export function CreateTeam({ 
  isOpen, 
  onClose, 
  onSuccess,
  userId 
}: CreateTeamProps) {
  const { toast } = useToast();
  
  // Set up the form
  const form = useForm<TeamFormValues>({
    resolver: zodResolver(teamFormSchema),
    defaultValues: {
      name: "",
      description: "",
    },
  });
  
  // Handle form submission
  const onSubmit = async (data: TeamFormValues) => {
    try {
      const teamData = {
        name: data.name,
        description: data.description || "",
        createdBy: userId,
      };
      
      const response = await apiRequest("POST", "/api/teams", teamData);
      const newTeam = await response.json();
      
      toast({
        title: "Team created",
        description: "The team has been created successfully.",
      });
      
      onSuccess(newTeam);
      onClose();
    } catch (error) {
      console.error("Error creating team:", error);
      toast({
        title: "Error",
        description: "Could not create the team. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Create New Team</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Team Name</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter team name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      {...field} 
                      placeholder="Enter team description"
                      value={field.value || ""}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter className="mt-6">
              <Button variant="outline" type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">Create Team</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
