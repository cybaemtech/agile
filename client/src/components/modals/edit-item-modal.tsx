import { useState, useEffect } from "react";
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
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// Create a schema specifically for the form
const workItemFormSchema = z.object({
  title: z.string().min(3, { message: "Title must be at least 3 characters" }),
  description: z.string().optional(),
  status: z.string(),
  priority: z.string().optional(),
  assigneeId: z.number().optional().nullable(),
  estimate: z.string().optional(),
  startDate: z.string().optional().nullable(),
  endDate: z.string().optional().nullable(),
});

type WorkItemFormValues = z.infer<typeof workItemFormSchema>;

interface EditItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  workItem?: WorkItem;
  users: User[];
}

export function EditItemModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  workItem,
  users
}: EditItemModalProps) {
  const { toast } = useToast();
  
  console.log("EditItemModal - isOpen:", isOpen);
  console.log("EditItemModal - workItem:", workItem);
  
  // Set up the form
  const form = useForm<WorkItemFormValues>({
    resolver: zodResolver(workItemFormSchema),
    defaultValues: {
      title: "",
      description: "",
      status: "TODO",
      priority: "MEDIUM",
      assigneeId: null,
      estimate: "",
      startDate: null,
      endDate: null,
    },
  });
  
  // Update form when workItem changes
  useEffect(() => {
    if (workItem) {
      // Format dates for the form
      const startDateFormatted = workItem.startDate 
        ? new Date(workItem.startDate).toISOString().split('T')[0]
        : null;
      
      const endDateFormatted = workItem.endDate
        ? new Date(workItem.endDate).toISOString().split('T')[0]
        : null;
      
      form.reset({
        title: workItem.title,
        description: workItem.description || "",
        status: workItem.status,
        priority: workItem.priority || "MEDIUM",
        assigneeId: workItem.assigneeId,
        estimate: workItem.estimate?.toString() || "",
        startDate: startDateFormatted,
        endDate: endDateFormatted,
      });
    }
  }, [workItem, form.reset]);
  
  // Handle form submission
  const onSubmit = async (data: WorkItemFormValues) => {
    if (!workItem) {
      toast({
        title: "Error",
        description: "No work item provided for editing.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      console.log("Form data submitted:", data);
      
      // Prepare data for submission
      const submitData = {
        ...data,
        // Convert empty strings or "null" strings to null for optional fields
        assigneeId: data.assigneeId || null,
        estimate: data.estimate || null,
        // Format dates properly - send as Date objects to avoid string parsing issues
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
      };
      
      console.log("Submitting data:", submitData);
      const response = await apiRequest("PATCH", `/api/work-items/${workItem.id}`, submitData);
      console.log("Work item updated:", response);
      
      toast({
        title: "Item updated",
        description: "The item has been updated successfully.",
      });
      
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error updating work item:", error);
      
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
          description: "Could not update the item. Please try again.",
          variant: "destructive",
        });
      }
    }
  };
  
  // Get estimate label based on selected type
  const getEstimateLabel = () => {
    return workItem?.type === "STORY" ? "Story Points" : "Estimated Hours";
  };
  
  if (!workItem) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">Edit {workItem.externalId}: {workItem.title}</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
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
                      onValueChange={val => field.onChange(val === "unassigned" ? null : parseInt(val))}
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
                            {user.username || user.email}
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
                name="estimate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{getEstimateLabel()}</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder={workItem.type === "STORY" ? "Story points" : "Hours"}
                        value={field.value || ""} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            {/* Show date fields for Epics and Features */}
            {(workItem.type === "EPIC" || workItem.type === "FEATURE") && (
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
              <Button type="submit">Update Item</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}