import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { WorkItem } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { AlertTriangle } from "lucide-react";

interface DeleteItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  workItem?: WorkItem;
}

export function DeleteItemModal({ 
  isOpen, 
  onClose, 
  onSuccess,
  workItem
}: DeleteItemModalProps) {
  const { toast } = useToast();
  
  console.log("DeleteItemModal - isOpen:", isOpen);
  console.log("DeleteItemModal - workItem:", workItem);
  
  const handleDelete = async () => {
    if (!workItem) {
      toast({
        title: "Error",
        description: "No work item provided for deletion.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await apiRequest("DELETE", `/api/work-items/${workItem.id}`, null);
      
      toast({
        title: "Item deleted",
        description: "The item has been deleted successfully.",
      });
      
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error deleting work item:", error);
      
      if (error?.response?.data?.message) {
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
          description: "Could not delete the item. Please try again.",
          variant: "destructive",
        });
      }
    }
  };
  
  if (!workItem) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <div className="flex items-center text-amber-600 mb-2">
            <AlertTriangle className="h-5 w-5 mr-2" />
            <DialogTitle className="text-lg font-semibold">Delete Work Item</DialogTitle>
          </div>
          <DialogDescription className="text-neutral-600">
            Are you sure you want to delete <span className="font-medium text-neutral-800">{workItem.externalId}: {workItem.title}</span>?
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        
        {/* Show warning if this item might have children */}
        {workItem.type === "EPIC" || workItem.type === "FEATURE" || workItem.type === "STORY" ? (
          <div className="bg-amber-50 p-3 rounded-md text-sm text-amber-800 border border-amber-200 mb-3">
            <p className="font-medium">Warning:</p>
            <p>If this {workItem.type.toLowerCase()} has any child items, it cannot be deleted until they are removed or reassigned.</p>
          </div>
        ) : null}
        
        <DialogFooter className="mt-6">
          <Button variant="outline" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}