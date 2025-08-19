import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Project, User, WorkItem } from "@shared/schema";
import { insertWorkItemSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Create a schema specifically for the form
const workItemFormSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters" }),
  description: z.string().optional(),
  type: z.string(),
  status: z.string(),
  priority: z.string().optional(),
  projectId: z.number(),
  parentId: z.number().optional().nullable(),
  assigneeId: z.number().optional().nullable(),
  reporterId: z.number().optional().nullable(),
  estimate: z.string().optional(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
  // externalId is not needed in the form as it will be generated on the server
  externalId: z.string().optional(),
});

type WorkItemFormValues = z.infer<typeof workItemFormSchema>;

interface CreateItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  projects: Project[];
  workItems: WorkItem[];
  users: User[];
  currentProject?: Project;
}

export function CreateItemModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  projects,
  workItems,
  users,
  currentProject
}: CreateItemModalProps) {
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState<string>("EPIC");
  
  // Only show valid parent options based on selected type
  const getValidParents = () => {
    switch (selectedType) {
      case "FEATURE":
        return workItems.filter(item => item.type === "EPIC");
      case "STORY":
        return workItems.filter(item => item.type === "FEATURE");
      case "TASK":
      case "BUG":
        return workItems.filter(item => item.type === "STORY");
      default:
        return [];
    }
  };

  // Set up the form
  const form = useForm<WorkItemFormValues>({
    resolver: zodResolver(workItemFormSchema),
    defaultValues: {
      title: "",
      description: "",
      type: selectedType,
      status: "TODO",
      priority: "MEDIUM",
      projectId: currentProject?.id || (projects.length > 0 ? projects[0].id : 0),
      parentId: null,
      assigneeId: null,
      reporterId: users.length > 0 ? users[0].id : 1, // Set current user as default reporter
      estimate: "",
      startDate: null,
      endDate: null,
    },
  });
  
  const handleTypeChange = (value: string) => {
    setSelectedType(value);
    form.setValue("type", value);
    
    // Reset parentId when type changes since the valid parents will change
    form.setValue("parentId", null);
  };
  
  // Handle form submission
  const onSubmit = async (data: WorkItemFormValues) => {
    try {
      console.log("Form data submitted:", data);
      
      // Prepare data for submission
      const submitData = {
        ...data,
        // Ensure proper data types
        projectId: Number(data.projectId),
        // Convert empty strings or "null" strings to null for optional fields
        parentId: data.parentId ? Number(data.parentId) : null,
        assigneeId: data.assigneeId ? Number(data.assigneeId) : null,
        reporterId: data.reporterId ? Number(data.reporterId) : (users.length > 0 ? users[0].id : null),
        estimate: data.estimate || null,
        // Pass dates as null if not provided
        startDate: data.startDate ? null : null,
        endDate: data.endDate ? null : null,
      };
      
      console.log("Submitting data:", submitData);
      const response = await apiRequest("POST", "/api/work-items", submitData);
      console.log("Work item created:", response);
      
      toast({
        title: "Item created",
        description: "The item has been created successfully.",
      });
      
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error creating work item:", error);
      
      // Check if it's a validation error with field-specific errors
      if (error?.response?.data?.errors) {
        const apiErrors = error.response.data.errors;
        console.log("Validation errors:", apiErrors);
        
        // Set field-specific errors
        apiErrors.forEach((err: { path: string; message: string }) => {
          if (form.getValues()[err.path as keyof WorkItemFormValues] !== undefined) {
            form.setError(err.path as any, { message: err.message });
          }
        });
        
        toast({
          title: "Validation error",
          description: "Please check the form fields and try again.",
          variant: "destructive",
        });
      } else if (error?.response?.data?.message) {
        // Show specific error message from API
        toast({
          title: "Error",
          description: error.response.data.message,
          variant: "destructive",
        });
      } else {
        // Generic error
        toast({
          title: "Error",
          description: "Could not create the item. Please try again.",
          variant: "destructive",
        });
      }
    }
  };
  
  // Get estimate label based on selected type
  const getEstimateLabel = () => {
    return selectedType === "STORY" ? "Story Points" : "Estimated Hours";
  };
  
  // Get valid parent label based on selected type
  const getParentLabel = () => {
    switch (selectedType) {
      case "FEATURE": return "Epic";
      case "STORY": return "Feature";
      case "TASK": 
      case "BUG": return "Story";
      default: return "Parent";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Create New Item</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <div className="mb-4">
              <FormLabel className="block text-sm font-medium text-neutral-700 mb-1">Item Type</FormLabel>
              <div className="grid grid-cols-5 gap-2">
                {["EPIC", "FEATURE", "STORY", "TASK", "BUG"].map(type => (
                  <Button
                    key={type}
                    type="button"
                    variant={selectedType === type ? "default" : "outline"}
                    className="py-2 h-9"
                    onClick={() => handleTypeChange(type)}
                  >
                    {type.charAt(0) + type.slice(1).toLowerCase()}
                  </Button>
                ))}
              </div>
            </div>
            
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Enter title" />
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
                      placeholder="Enter description"
                      value={field.value || ""}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="projectId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Project</FormLabel>
                    <Select
                      value={field.value.toString()}
                      onValueChange={(value) => field.onChange(parseInt(value))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select project" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {projects.map(project => (
                          <SelectItem key={project.id} value={project.id.toString()}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="parentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{getParentLabel()}</FormLabel>
                    <Select
                      value={field.value?.toString() || "none"}
                      onValueChange={(value) => field.onChange(value && value !== "none" ? parseInt(value) : null)}
                      disabled={selectedType === "EPIC" || getValidParents().length === 0}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={`Select ${getParentLabel().toLowerCase()}`} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {getValidParents().map(item => (
                          <SelectItem key={item.id} value={item.id.toString()}>
                            {item.title} ({item.externalId})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="assigneeId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Assignee</FormLabel>
                    <Select
                      value={field.value?.toString() || "unassigned"}
                      onValueChange={(value) => field.onChange(value && value !== "unassigned" ? parseInt(value) : null)}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select assignee" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {users.map(user => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            {user.fullName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="TODO">To Do</SelectItem>
                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                        <SelectItem value="DONE">Done</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select
                      value={field.value || "MEDIUM"}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="LOW">Low</SelectItem>
                        <SelectItem value="MEDIUM">Medium</SelectItem>
                        <SelectItem value="HIGH">High</SelectItem>
                        <SelectItem value="CRITICAL">Critical</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="estimate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{getEstimateLabel()}</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder={selectedType === "STORY" ? "Story points" : "Hours"}
                        value={field.value || ""} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {(selectedType === "EPIC" || selectedType === "FEATURE") && (
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="startDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="date"
                          value={field.value || ""} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="endDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="date"
                          value={field.value || ""} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
            
            <DialogFooter className="mt-6">
              <Button variant="outline" type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">Create Item</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
