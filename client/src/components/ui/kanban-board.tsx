import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "react-beautiful-dnd";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CheckIcon, Clock, Flag, ListChecks, Bug, Lightbulb, Layers } from "lucide-react";
import { User, WorkItem } from "@shared/schema";

interface KanbanColumn {
  id: string;
  title: string;
  items: WorkItem[];
  color: string;
}

interface KanbanBoardProps {
  projectId?: number;  // Make projectId optional
  workItems: WorkItem[];
  users?: User[];      // Make users optional
  onWorkItemsUpdate?: () => void;  // Make callback optional
  onItemEdit?: (item: WorkItem) => void;
  onItemDelete?: (item: WorkItem) => void;
  onStatusChange?: (itemId: number, status: string) => void;
  filter?: {
    type?: string[];
    featureId?: number;
    assigneeIds?: number[];
  };
  showAllTypes?: boolean;
}

export function KanbanBoard({ 
  projectId, 
  workItems, 
  users = [], 
  onWorkItemsUpdate,
  onItemEdit,
  onItemDelete,
  onStatusChange,
  filter,
  showAllTypes = false
}: KanbanBoardProps) {
  const { toast } = useToast();
  
  // Filter work items based on criteria
  const filteredItems = workItems.filter(item => {
    // Filter by type if specified
    if (filter?.type && filter.type.length > 0) {
      if (!filter.type.includes(item.type)) {
        return false;
      }
    }
    
    // Filter by assignee if specified
    if (filter?.assigneeIds && filter.assigneeIds.length > 0) {
      if (item.assigneeId === null && filter.assigneeIds.includes(-1)) {
        // Show unassigned items when "Unassigned" is selected (-1 represents unassigned)
        return true;
      } else if (!item.assigneeId || !filter.assigneeIds.includes(item.assigneeId)) {
        return false;
      }
    }
    
    // Filter by feature ID if specified
    if (filter?.featureId !== undefined) {
      // For stories, check direct parentId
      if (item.type === 'STORY') {
        return item.parentId === filter.featureId;
      }
      
      // For tasks and bugs, find parent story and check if it belongs to the feature
      if (item.type === 'TASK' || item.type === 'BUG') {
        const parentStory = workItems.find(wi => wi.id === item.parentId);
        return parentStory?.parentId === filter.featureId;
      }
      
      return false;
    }
    
    // By default, only show Stories, Tasks, and Bugs in Kanban
    // If showAllTypes is true, then show all types
    return showAllTypes || ['STORY', 'TASK', 'BUG'].includes(item.type);
  });
  
  // Organize items by status
  const columns: KanbanColumn[] = [
    { 
      id: 'TODO', 
      title: 'To Do',
      color: 'bg-blue-500',
      items: filteredItems.filter(item => item.status === 'TODO')
    },
    { 
      id: 'IN_PROGRESS', 
      title: 'In Progress',
      color: 'bg-orange-500',
      items: filteredItems.filter(item => item.status === 'IN_PROGRESS')
    },
    { 
      id: 'DONE', 
      title: 'Done',
      color: 'bg-green-500',
      items: filteredItems.filter(item => item.status === 'DONE')
    }
  ];
  
  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;
    
    // Dropped outside a droppable area
    if (!destination) return;
    
    // No change in position
    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) return;
    
    // Find the work item that was dragged
    const itemId = parseInt(draggableId.split('-')[1]);
    const itemToMove = workItems.find(item => item.id === itemId);
    
    if (!itemToMove) return;
    
    // Determine the new status based on the destination column
    const newStatus = destination.droppableId;
    
    try {
      if (onStatusChange) {
        // Use the passed-in status change handler
        onStatusChange(itemId, newStatus);
      } else {
        // Default implementation
        await apiRequest('PATCH', `/api/work-items/${itemId}/status`, { status: newStatus });
      
        // Refresh work items
        if (onWorkItemsUpdate) {
          onWorkItemsUpdate();
        }
      }
      
      toast({
        title: "Item moved",
        description: `${itemToMove.title} moved to ${destination.droppableId.replace('_', ' ')}`,
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Could not update item status. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Get user by ID
  const getUserById = (userId: number | null | undefined) => {
    if (!userId || !users || users.length === 0) return null;
    return users.find(user => user.id === userId);
  };
  
  // Get parent item for a given work item
  const getParentItem = (parentId: number | null | undefined) => {
    if (!parentId) return null;
    return workItems.find(item => item.id === parentId);
  };
  
  // Get child items for a given work item
  const getChildItems = (workItemId: number) => {
    return workItems.filter(item => item.parentId === workItemId);
  };
  
  // Get completion ratio for a story or feature
  const getCompletionRatio = (workItemId: number) => {
    const children = getChildItems(workItemId);
    if (children.length === 0) return "0/0";
    
    const completed = children.filter(child => child.status === 'DONE').length;
    return `${completed}/${children.length}`;
  };
  
  const getItemTypeIcon = (type: string) => {
    switch(type) {
      case 'STORY':
        return <Lightbulb className="h-3 w-3 mr-1" />;
      case 'TASK':
        return <CheckIcon className="h-3 w-3 mr-1" />;
      case 'BUG':
        return <Bug className="h-3 w-3 mr-1" />;
      default:
        return <Layers className="h-3 w-3 mr-1" />;
    }
  };
  
  const getItemTypeBadgeStyles = (type: string) => {
    switch(type) {
      case 'STORY':
        return "bg-blue-100 text-blue-800";
      case 'TASK':
        return "bg-green-100 text-green-800";
      case 'BUG':
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };
  
  const getPriorityBadgeStyles = (priority: string) => {
    switch(priority) {
      case 'LOW':
        return "bg-gray-100 text-gray-800";
      case 'MEDIUM':
        return "bg-yellow-100 text-yellow-800";
      case 'HIGH':
        return "bg-orange-100 text-orange-800";
      case 'CRITICAL':
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };
  
  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 overflow-x-auto">
        {columns.map(column => (
          <div key={column.id}>
            <div className="bg-neutral-100 p-3 rounded-t-lg border border-neutral-200 border-b-0 flex items-center justify-between">
              <h3 className="font-medium flex items-center">
                <span className={`w-3 h-3 rounded-full ${column.color} mr-2`}></span>
                {column.title}
              </h3>
              <Badge variant="outline" className="bg-neutral-200 text-neutral-700">
                {column.items.length}
              </Badge>
            </div>
            
            <Droppable droppableId={column.id}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="kanban-column p-3 bg-neutral-50 rounded-b-lg border border-neutral-200 space-y-3 min-h-[calc(100vh-240px)]"
                >
                  {column.items.map((item, index) => {
                    const assignee = getUserById(item.assigneeId);
                    const parent = getParentItem(item.parentId);
                    
                    return (
                      <Draggable 
                        key={`item-${item.id}`} 
                        draggableId={`item-${item.id}`} 
                        index={index}
                      >
                        {(provided) => (
                          <Card
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className="bg-white cursor-move hover:shadow-md"
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between mb-2">
                                <Badge className={getItemTypeBadgeStyles(item.type)}>
                                  <span className="flex items-center text-xs font-medium">
                                    {getItemTypeIcon(item.type)}
                                    {item.type.charAt(0) + item.type.slice(1).toLowerCase()}
                                  </span>
                                </Badge>
                                <span className="text-xs text-neutral-500">{item.externalId}</span>
                              </div>
                              
                              <h4 className="font-medium mb-2">{item.title}</h4>
                              
                              {item.description && (
                                <p className="text-sm text-neutral-600 mb-3 line-clamp-2">
                                  {item.description}
                                </p>
                              )}
                              
                              <div className="flex items-center justify-between text-xs">
                                {parent && (
                                  <div className="flex items-center">
                                    <span className="text-neutral-500 mr-2">
                                      {parent.type === 'FEATURE' ? 'Feature:' : 'Story:'}
                                    </span>
                                    <span className="font-medium">{parent.externalId}</span>
                                  </div>
                                )}
                                
                                {item.estimate && (
                                  <div>
                                    <span className="text-neutral-500">
                                      {item.type === 'STORY' ? 'Points:' : 'Est:'}
                                    </span>
                                    <span className="font-medium ml-1">{item.estimate}</span>
                                  </div>
                                )}
                              </div>
                              
                              <div className="mt-3 pt-3 border-t border-neutral-100 flex items-center justify-between">
                                <div className="flex -space-x-2">
                                  {assignee && (
                                    <Avatar className="h-6 w-6 border-2 border-white">
                                      <AvatarImage 
                                        src={assignee.avatarUrl || undefined} 
                                        alt={assignee.fullName} 
                                      />
                                      <AvatarFallback className="text-xs">
                                        {assignee.fullName.split(' ').map(n => n[0]).join('')}
                                      </AvatarFallback>
                                    </Avatar>
                                  )}
                                </div>
                                
                                {item.type === 'STORY' ? (
                                  <div className="flex items-center text-neutral-500 text-xs">
                                    <ListChecks className="h-3 w-3 mr-1" />
                                    <span>{getCompletionRatio(item.id)}</span>
                                  </div>
                                ) : (
                                  item.priority && (
                                    <Badge className={getPriorityBadgeStyles(item.priority)}>
                                      <Flag className="h-3 w-3 mr-1" />
                                      <span className="text-xs">{item.priority.charAt(0) + item.priority.slice(1).toLowerCase()}</span>
                                    </Badge>
                                  )
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}
