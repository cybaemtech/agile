import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute, useLocation } from "wouter";
import { Project, User, Team, WorkItem } from "@shared/schema";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { CreateItemModal } from "@/components/modals/create-item-modal";
import { EditItemModal } from "@/components/modals/edit-item-modal";
import { DeleteItemModal } from "@/components/modals/delete-item-modal";
import { AddTeamMembersModal } from "@/components/modals/add-team-members-modal";
import { KanbanBoard } from "@/components/ui/kanban-board";
import { TimelineView } from "@/components/ui/timeline-view";
import { DeadlinesView } from "@/components/ui/deadlines-view";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { useModal } from "@/hooks/use-modal";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Filter, 
  Plus, 
  Layers, 
  ListFilter,
  ArrowDownUp,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Users,
  X,
  UserPlus,
  UserMinus
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { queryClient } from "@/lib/queryClient";

export default function ProjectDetails() {
  const [_, params] = useRoute('/projects/:id');
  const [_path, navigate] = useLocation();
  const projectId = params?.id ? parseInt(params.id) : 0;
  
  // Debug logging for routing
  console.log('Route params:', params);
  console.log('Project ID extracted:', projectId);

  // New project view tab state
  const [projectView, setProjectView] = useState<'overview' | 'board' | 'list' | 'calendar' | 'settings'>('overview');
  
  // Timeline view settings
  const [timeUnit, setTimeUnit] = useState<'Quarter' | 'Month' | 'Week'>('Quarter');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [filterType, setFilterType] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [filterPriority, setFilterPriority] = useState<string[]>([]);
  const [filterAssignee, setFilterAssignee] = useState<number[]>([]);
  const [filterFeature, setFilterFeature] = useState<number | undefined>(undefined);
  
  // State for expanded items in the hierarchical view
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});
  
  const { 
    modalType, 
    isOpen, 
    openModal, 
    closeModal,
    modalProps 
  } = useModal();
  
  const { toast } = useToast();
  
  // Fetch current user
  const { data: currentUser } = useQuery<User>({
    queryKey: ['/api/users/64'], // Using existing user ID 64 for demo
  });
  
  // Fetch project details with better error handling
  const { data: project, isLoading: isProjectLoading, error: projectError, isError } = useQuery<Project>({
    queryKey: [`/api/projects/${projectId}`],
    enabled: !!projectId && projectId > 0,
    retry: 2,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
  
  // Fetch teams
  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ['/api/teams'],
  });
  
  // Fetch all projects for sidebar
  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });
  
  // Fetch work items for this project
  const { data: workItems = [], refetch: refetchWorkItems } = useQuery<WorkItem[]>({
    queryKey: [`/api/projects/${projectId}/work-items`],
  });
  
  // Fetch all users
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users'],
  });
  
  // Function to handle navigation with null check
  const goToProjects = () => {
    if (navigate) navigate('/projects');
  };
  
  // Early return if no valid project ID
  if (!projectId || projectId <= 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Invalid Project</h2>
          <p className="text-gray-600 mb-4">The project ID is invalid or missing.</p>
          <Button onClick={goToProjects}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }
  
  // Archive project handler
  const handleArchiveProject = async () => {
    // Don't proceed if project ID is invalid
    if (!projectId) return;
    
    try {
      // Call API to archive project
      const response = await apiRequest(
        'PATCH',
        `/api/projects/${projectId}`, 
        { status: "ARCHIVED" }
      );
      
      if (response.ok) {
        // Show success message
        toast({
          title: "Project archived",
          description: "The project has been archived successfully",
        });
        
        // Redirect to projects page
        goToProjects();
        
        // Invalidate cache
        await queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.message || "Failed to archive project",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error archiving project:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while archiving the project",
        variant: "destructive",
      });
    }
  };
  
  // Delete project handler
  const handleDeleteProject = async () => {
    // Don't proceed if project ID is invalid
    if (!projectId) return;
    
    // Confirm with user before deleting
    if (project?.name && !window.confirm(`Are you sure you want to delete ${project.name}? This action cannot be undone.`)) {
      return;
    }
    
    try {
      // Call API to delete project
      const response = await apiRequest(
        'DELETE',
        `/api/projects/${projectId}`
      );
      
      if (response.ok) {
        // Show success message
        toast({
          title: "Project deleted",
          description: "The project has been deleted successfully",
        });
        
        // Redirect to projects page
        goToProjects();
        
        // Invalidate cache
        await queryClient.invalidateQueries({ queryKey: ['/api/projects'] });
      } else {
        const errorData = await response.json();
        toast({
          title: "Error",
          description: errorData.message || "Failed to delete project",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error deleting project:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred while deleting the project",
        variant: "destructive",
      });
    }
  };
  
  // Debug logging
  console.log('=== PROJECT DETAILS DEBUG ===');
  console.log('Route params:', params);
  console.log('Project ID extracted:', projectId);
  console.log('Query enabled:', !!projectId && projectId > 0);
  console.log('Project data:', project);
  console.log('Project key:', project?.key);
  console.log('Project loading:', isProjectLoading);
  console.log('Project error:', projectError);
  console.log('Query key:', [`/api/projects/${projectId}`]);
  console.log('============================');
  
  // Show loading state
  if (isProjectLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading project details...</p>
        </div>
      </div>
    );
  }
  
  // Show error state
  if (projectError || !project) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Project Not Found</h2>
          <p className="text-gray-600 mb-4">The project you're looking for doesn't exist or couldn't be loaded.</p>
          <Button onClick={goToProjects}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Projects
          </Button>
        </div>
      </div>
    );
  }
  
  const features = Array.isArray(workItems) ? workItems.filter(item => item.type === 'FEATURE') : [];
  
  const handleWorkItemsUpdate = () => {
    refetchWorkItems();
  };
  
  // Toggle expansion state of an item
  const toggleItemExpansion = (itemId: number) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };
  
  // Organize work items in a hierarchical structure: Epics > Features > Stories > Tasks/Bugs
  const organizeWorkItemsHierarchically = () => {
    if (!Array.isArray(workItems)) return [];
    
    // Extract all items by type
    const epics = workItems.filter(item => item.type === 'EPIC');
    const features = workItems.filter(item => item.type === 'FEATURE');
    const stories = workItems.filter(item => item.type === 'STORY');
    const tasksAndBugs = workItems.filter(item => item.type === 'TASK' || item.type === 'BUG');
    
    // Create the hierarchy
    const hierarchicalItems = [];
    
    // Process epics
    for (const epic of epics) {
      hierarchicalItems.push({
        ...epic,
        level: 0,
        hasChildren: features.some(f => f.parentId === epic.id)
      });
      
      // If this epic is expanded, add its features
      if (expandedItems[epic.id]) {
        const epicFeatures = features.filter(f => f.parentId === epic.id);
        for (const feature of epicFeatures) {
          hierarchicalItems.push({
            ...feature,
            level: 1,
            hasChildren: stories.some(s => s.parentId === feature.id)
          });
          
          // If this feature is expanded, add its stories
          if (expandedItems[feature.id]) {
            const featureStories = stories.filter(s => s.parentId === feature.id);
            for (const story of featureStories) {
              hierarchicalItems.push({
                ...story,
                level: 2,
                hasChildren: tasksAndBugs.some(tb => tb.parentId === story.id)
              });
              
              // If this story is expanded, add its tasks and bugs
              if (expandedItems[story.id]) {
                const storyTasksAndBugs = tasksAndBugs.filter(tb => tb.parentId === story.id);
                for (const taskOrBug of storyTasksAndBugs) {
                  hierarchicalItems.push({
                    ...taskOrBug,
                    level: 3,
                    hasChildren: false
                  });
                }
              }
            }
          }
        }
      }
    }
    
    // Add orphaned features (those without epics)
    const orphanedFeatures = features.filter(f => !f.parentId || !epics.some(e => e.id === f.parentId));
    for (const feature of orphanedFeatures) {
      hierarchicalItems.push({
        ...feature,
        level: 0,
        hasChildren: stories.some(s => s.parentId === feature.id)
      });
      
      // If this feature is expanded, add its stories
      if (expandedItems[feature.id]) {
        const featureStories = stories.filter(s => s.parentId === feature.id);
        for (const story of featureStories) {
          hierarchicalItems.push({
            ...story,
            level: 1,
            hasChildren: tasksAndBugs.some(tb => tb.parentId === story.id)
          });
          
          // If this story is expanded, add its tasks and bugs
          if (expandedItems[story.id]) {
            const storyTasksAndBugs = tasksAndBugs.filter(tb => tb.parentId === story.id);
            for (const taskOrBug of storyTasksAndBugs) {
              hierarchicalItems.push({
                ...taskOrBug,
                level: 2,
                hasChildren: false
              });
            }
          }
        }
      }
    }
    
    // Add orphaned stories
    const orphanedStories = stories.filter(s => !s.parentId || !features.some(f => f.id === s.parentId));
    for (const story of orphanedStories) {
      hierarchicalItems.push({
        ...story,
        level: 0,
        hasChildren: tasksAndBugs.some(tb => tb.parentId === story.id)
      });
      
      // If this story is expanded, add its tasks and bugs
      if (expandedItems[story.id]) {
        const storyTasksAndBugs = tasksAndBugs.filter(tb => tb.parentId === story.id);
        for (const taskOrBug of storyTasksAndBugs) {
          hierarchicalItems.push({
            ...taskOrBug,
            level: 1,
            hasChildren: false
          });
        }
      }
    }
    
    // Add orphaned tasks and bugs
    const orphanedTasksAndBugs = tasksAndBugs.filter(tb => !tb.parentId || !stories.some(s => s.id === tb.parentId));
    for (const taskOrBug of orphanedTasksAndBugs) {
      hierarchicalItems.push({
        ...taskOrBug,
        level: 0,
        hasChildren: false
      });
    }
    
    return hierarchicalItems;
  };
  
  const getFilterTypesOptions = () => {
    return [
      { value: 'STORY', label: 'Stories' },
      { value: 'TASK', label: 'Tasks' },
      { value: 'BUG', label: 'Bugs' },
    ];
  };
  
  // Generic filter handler for string-based filters
  const handleStringFilter = (
    value: string, 
    currentValues: string[], 
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    clearValue: string = "ALL"
  ) => {
    if (value === clearValue) {
      setter([]);
    } else {
      if (currentValues.includes(value)) {
        setter(currentValues.filter(v => v !== value));
      } else {
        setter([...currentValues, value]);
      }
    }
  };
  
  // Generic filter handler for number-based filters
  const handleNumberFilter = (
    value: number, 
    currentValues: number[], 
    setter: React.Dispatch<React.SetStateAction<number[]>>,
    clearValue: number = -1
  ) => {
    if (value === clearValue) {
      setter([]);
    } else {
      if (currentValues.includes(value)) {
        setter(currentValues.filter(v => v !== value));
      } else {
        setter([...currentValues, value]);
      }
    }
  };

  // Handler for type filter
  const handleFilterTypeChange = (value: string) => {
    handleStringFilter(value, filterType, setFilterType);
  };
  
  // Handler for status filter
  const handleFilterStatusChange = (value: string) => {
    handleStringFilter(value, filterStatus, setFilterStatus);
  };
  
  // Handler for priority filter
  const handleFilterPriorityChange = (value: string) => {
    handleStringFilter(value, filterPriority, setFilterPriority);
  };
  
  // Handler for assignee filter
  const handleFilterAssigneeChange = (value: string) => {
    if (value === "all") {
      // Clear the filter to show all assignees
      setFilterAssignee([]);
    } else if (value === "unassigned") {
      // Filter for unassigned items (-1 represents unassigned)
      setFilterAssignee([-1]);
    } else {
      // Filter by specific user ID
      const userId = parseInt(value);
      setFilterAssignee([userId]);
    }
  };
  
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <Sidebar 
        user={currentUser}
        teams={teams}
        projects={projects}
        onCreateTeam={() => openModal("createTeam")}
        onCreateProject={() => openModal("createProject")}
      />
      
      {/* Mobile menu toggle */}
      <div className="md:hidden fixed bottom-4 right-4 z-10">
        <Button
          className="rounded-full shadow-lg p-3 h-12 w-12"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <Layers className="h-5 w-5" />
        </Button>
      </div>
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        
        <main className="flex-1 overflow-auto">
          {/* Project navigation */}
          <div className="bg-white border-b border-neutral-200">
            <div className="flex items-center px-6 py-3">
              <Button variant="ghost" className="mr-6 font-medium" asChild>
                <a href="/projects">
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  Back to projects
                </a>
              </Button>
              
              <nav className="flex space-x-6 overflow-x-auto">
                <a 
                  href="#" 
                  onClick={(e) => { e.preventDefault(); setProjectView('overview'); }}
                  className={`border-b-2 ${
                    projectView === 'overview'
                      ? 'border-primary text-primary' 
                      : 'border-transparent text-neutral-600 hover:text-neutral-900'
                  } font-medium py-3`}
                >
                  Overview
                </a>
                <a 
                  href="#" 
                  onClick={(e) => { e.preventDefault(); setProjectView('board'); }}
                  className={`border-b-2 ${
                    projectView === 'board'
                      ? 'border-primary text-primary' 
                      : 'border-transparent text-neutral-600 hover:text-neutral-900'
                  } font-medium py-3`}
                >
                  Board
                </a>
                <a 
                  href="#" 
                  onClick={(e) => { e.preventDefault(); setProjectView('list'); }}
                  className={`border-b-2 ${
                    projectView === 'list'
                      ? 'border-primary text-primary' 
                      : 'border-transparent text-neutral-600 hover:text-neutral-900'
                  } font-medium py-3`}
                >
                  List
                </a>
                <a 
                  href="#" 
                  onClick={(e) => { e.preventDefault(); setProjectView('calendar'); }}
                  className={`border-b-2 ${
                    projectView === 'calendar'
                      ? 'border-primary text-primary' 
                      : 'border-transparent text-neutral-600 hover:text-neutral-900'
                  } font-medium py-3`}
                >
                  Calendar
                </a>
                <a 
                  href="#" 
                  onClick={(e) => { e.preventDefault(); setProjectView('settings'); }}
                  className={`border-b-2 ${
                    projectView === 'settings'
                      ? 'border-primary text-primary' 
                      : 'border-transparent text-neutral-600 hover:text-neutral-900'
                  } font-medium py-3`}
                >
                  Settings
                </a>
              </nav>
            </div>
          </div>
          
          {/* Project content */}
          <div className="p-6">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-semibold mb-1">{project?.name || 'Loading project...'}</h1>
                <p className="text-neutral-600">{project?.description || 'No description provided'}</p>
              </div>
              {/* Only show Create Item button on specific tabs */}
              {projectView !== 'overview' && projectView !== 'calendar' && projectView !== 'settings' && (
                <div className="flex space-x-3">
                  <Button onClick={() => openModal("createItem")}>
                    <Plus className="mr-2 h-4 w-4" />
                    <span>Create Item</span>
                  </Button>
                </div>
              )}
            </div>

            {/* Overview Tab Content */}
            {projectView === 'overview' && (
              <div>
                <div className="mb-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-4">
                    <div className="mb-4 sm:mb-0 flex items-center">
                      <div className="mr-4">
                        <h3 className="text-lg font-medium">Timeline View</h3>
                      </div>
                      
                      <div className="flex items-center">
                        <Select 
                          defaultValue={timeUnit}
                          onValueChange={(value) => setTimeUnit(value as 'Quarter' | 'Month' | 'Week')}
                        >
                          <SelectTrigger className="h-8 w-32">
                            <SelectValue placeholder="Select view" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Quarter">Quarter</SelectItem>
                            <SelectItem value="Month">Month</SelectItem>
                            <SelectItem value="Week">Week</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm" onClick={() => openModal("createItem")}>
                        <Plus className="h-4 w-4 mr-1" /> New
                      </Button>
                    </div>
                  </div>
                  
                  {/* Timeline View */}
                  <div className="bg-white border rounded-md shadow-sm mb-6">
                    <TimelineView 
                      timeUnit={timeUnit}
                      workItems={workItems}
                      onEditItem={(item) => openModal("editItem", { workItem: item })}
                    />
                  </div>
                  
                  {/* Items with Deadlines section - moved from separate tab */}
                  <div className="bg-white border rounded-md shadow-sm">
                    <div className="p-4 border-b">
                      <h3 className="text-lg font-medium">Items with Deadlines</h3>
                    </div>
                    <DeadlinesView 
                      workItems={Array.isArray(workItems) ? workItems : []}
                      users={Array.isArray(users) ? users : []}
                      projects={project ? [project as Project] : []}
                    />
                  </div>
                </div>
                
                {/* Project statistics and info section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Left panel: Project summary */}
                  <div className="col-span-2">
                    <div className="bg-white border rounded-md shadow-sm p-4">
                      <h3 className="text-lg font-medium mb-4">Work Items</h3>
                      <div className="space-y-4">
                        {/* Hierarchical list of work items */}
                        <div className="border rounded">
                          <div className="flex items-center justify-between bg-neutral-50 p-3 text-sm font-medium text-neutral-700 border-b">
                            <div className="w-6/12">Title</div>
                            <div className="w-2/12">Type</div>
                            <div className="w-2/12">Status</div>
                            <div className="w-2/12">Assignee</div>
                          </div>
                          <div className="overflow-y-auto max-h-96">
                            {organizeWorkItemsHierarchically().map((item: any) => {
                              const indentClass = item.level > 0 
                                ? `pl-${(item.level * 6) + 3}` 
                                : "pl-3";
                              
                              const typeClasses = {
                                'EPIC': 'bg-purple-100 text-purple-800',
                                'FEATURE': 'bg-blue-100 text-blue-800',
                                'STORY': 'bg-green-100 text-green-800',
                                'TASK': 'bg-orange-100 text-orange-800',
                                'BUG': 'bg-red-100 text-red-800'
                              };
                              
                              const statusClasses = {
                                'TODO': 'bg-neutral-100 text-neutral-800',
                                'IN_PROGRESS': 'bg-amber-100 text-amber-800',
                                'DONE': 'bg-emerald-100 text-emerald-800'
                              };
                              
                              return (
                                <div key={item.id} className="hover:bg-neutral-50 border-b text-sm">
                                  <div className="flex items-center py-2">
                                    <div className={`flex items-center w-6/12 ${indentClass}`}>
                                      {item.hasChildren && (
                                        <button 
                                          className="mr-1 focus:outline-none"
                                          onClick={() => toggleItemExpansion(item.id)}
                                        >
                                          {expandedItems[item.id] ? (
                                            <ChevronDown className="h-4 w-4 text-neutral-400" />
                                          ) : (
                                            <ChevronRight className="h-4 w-4 text-neutral-400" />
                                          )}
                                        </button>
                                      )}
                                      {!item.hasChildren && <div className="w-5" />}
                                      <span 
                                        className="truncate cursor-pointer hover:text-primary"
                                        onClick={() => openModal("editItem", { workItem: item })}
                                      >
                                        {item.title}
                                      </span>
                                    </div>
                                    <div className="w-2/12">
                                      <Badge className={typeClasses[item.type]}>
                                        {item.type}
                                      </Badge>
                                    </div>
                                    <div className="w-2/12">
                                      <Badge className={statusClasses[item.status]}>
                                        {item.status.replace('_', ' ')}
                                      </Badge>
                                    </div>
                                    <div className="w-2/12 flex items-center">
                                      {item.assigneeId ? (
                                        <div className="flex items-center">
                                          <div className="h-6 w-6 rounded-full bg-neutral-200 flex items-center justify-center text-xs mr-2">
                                            {users.find(u => u.id === item.assigneeId)?.fullName.substring(0, 2) || "??"}
                                          </div>
                                          <span className="text-xs truncate">
                                            {users.find(u => u.id === item.assigneeId)?.fullName || "Unknown"}
                                          </span>
                                        </div>
                                      ) : (
                                        <span className="text-neutral-500 text-xs">Unassigned</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Right panel: Project info */}
                  <div>
                    <div className="bg-white border rounded-md shadow-sm p-4">
                      <h3 className="text-lg font-medium mb-4">Project Information</h3>
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-sm font-medium mb-1">ID</h4>
                          <p className="text-sm">{project?.key || 'N/A'}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium mb-1">Created by</h4>
                          <p className="text-sm">
                            {currentUser?.fullName || 'Unknown'}
                          </p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium mb-1">Created at</h4>
                          <p className="text-sm">
                            {project?.createdAt 
                              ? new Date(project.createdAt).toLocaleDateString() 
                              : 'N/A'}
                          </p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium mb-1">Start date</h4>
                          <p className="text-sm">
                            {project?.startDate 
                              ? new Date(project.startDate).toLocaleDateString() 
                              : 'No start date set'}
                          </p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium mb-1">Target date</h4>
                          <p className="text-sm">
                            {project?.targetDate 
                              ? new Date(project.targetDate).toLocaleDateString() 
                              : 'No target date set'}
                          </p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium mb-1">Team</h4>
                          <p className="text-sm">
                            {teams && project?.teamId 
                              ? teams.find(t => t.id === project.teamId)?.name 
                              : 'No team assigned'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Board Tab Content */}
            {projectView === 'board' && (
              <div className="bg-white border rounded-md shadow-sm">
                <div className="p-4 border-b flex flex-col md:flex-row gap-4">
                  <Select
                    value={filterFeature ? String(filterFeature) : "all"}
                    onValueChange={(value) => {
                      setFilterFeature(value !== "all" ? parseInt(value) : undefined);
                    }}
                  >
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Filter by feature" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Items</SelectItem>
                      {features.map(feature => (
                        <SelectItem key={feature.id} value={String(feature.id)}>
                          {feature.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {/* Assignee Filter Dropdown */}
                  <Select
                    value={filterAssignee.length === 1 ? String(filterAssignee[0]) : "all"}
                    onValueChange={handleFilterAssigneeChange}
                  >
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Filter by assignee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Assignees</SelectItem>
                      {users && Array.isArray(users) && users.map(user => (
                        <SelectItem key={user.id} value={String(user.id)}>
                          {user.fullName || user.username}
                        </SelectItem>
                      ))}
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <KanbanBoard 
                  projectId={Number(projectId)}
                  users={users || []}
                  workItems={Array.isArray(workItems) 
                    ? workItems.filter(item => {
                        // If feature filter is active, only show items belong to that feature
                        if (filterFeature && item.parentId !== filterFeature) {
                          return false;
                        }
                        
                        // Only show specific types in kanban
                        if (item.type === 'EPIC') {
                          return false;
                        }
                        
                        // If type filters are active, apply them
                        if (filterType.length > 0 && !filterType.includes(item.type)) {
                          return false;
                        }
                        
                        return true;
                      })
                    : []
                  }
                  filter={{
                    assigneeIds: filterAssignee.length > 0 ? filterAssignee : undefined
                  }}
                  onItemEdit={(item) => openModal("editItem", { workItem: item })}
                  onItemDelete={(item) => openModal("deleteItem", { workItem: item })}
                  onStatusChange={async (itemId, status) => {
                    try {
                      const response = await apiRequest(
                        'PATCH',
                        `/api/work-items/${itemId}`,
                        { status }
                      );
                      
                      if (response.ok) {
                        refetchWorkItems();
                      } else {
                        toast({
                          title: "Error",
                          description: "Failed to update item status",
                          variant: "destructive"
                        });
                      }
                    } catch (error) {
                      console.error("Error updating item status:", error);
                      toast({
                        title: "Error",
                        description: "An unexpected error occurred",
                        variant: "destructive"
                      });
                    }
                  }}
                />
              </div>
            )}

            {/* List Tab Content */}
            {projectView === 'list' && (
              <div className="bg-white border rounded-md shadow-sm">
                <div className="p-4 border-b">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-medium">All Work Items</h3>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {/* Type Filter */}
                    <div className="flex items-center">
                      <span className="text-xs font-medium mr-2">Type:</span>
                      <Select 
                        value={filterType.length > 0 ? filterType[0] : "ALL"}
                        onValueChange={handleFilterTypeChange}
                      >
                        <SelectTrigger className="h-8 px-2 text-xs w-28">
                          <SelectValue placeholder="All types" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All types</SelectItem>
                          <SelectItem value="EPIC">Epics</SelectItem>
                          <SelectItem value="FEATURE">Features</SelectItem>
                          <SelectItem value="STORY">Stories</SelectItem>
                          <SelectItem value="TASK">Tasks</SelectItem>
                          <SelectItem value="BUG">Bugs</SelectItem>
                        </SelectContent>
                      </Select>
                      {filterType.length > 0 && (
                        <div className="flex flex-wrap gap-1 ml-1">
                          {filterType.map(type => (
                            <Badge 
                              key={type} 
                              variant="outline" 
                              className="text-xs py-0 h-6"
                              onClick={() => handleFilterTypeChange(type)}
                            >
                              {type}
                              <X className="h-3 w-3 ml-1" />
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Status Filter */}
                    <div className="flex items-center">
                      <span className="text-xs font-medium mr-2">Status:</span>
                      <Select 
                        value={filterStatus.length > 0 ? filterStatus[0] : "ALL"}
                        onValueChange={handleFilterStatusChange}
                      >
                        <SelectTrigger className="h-8 px-2 text-xs w-28">
                          <SelectValue placeholder="All statuses" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All statuses</SelectItem>
                          <SelectItem value="TODO">To Do</SelectItem>
                          <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                          <SelectItem value="DONE">Done</SelectItem>
                        </SelectContent>
                      </Select>
                      {filterStatus.length > 0 && (
                        <div className="flex flex-wrap gap-1 ml-1">
                          {filterStatus.map(status => (
                            <Badge 
                              key={status} 
                              variant="outline" 
                              className="text-xs py-0 h-6"
                              onClick={() => handleFilterStatusChange(status)}
                            >
                              {status.replace('_', ' ')}
                              <X className="h-3 w-3 ml-1" />
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Priority Filter */}
                    <div className="flex items-center">
                      <span className="text-xs font-medium mr-2">Priority:</span>
                      <Select 
                        value={filterPriority.length > 0 ? filterPriority[0] : "ALL"}
                        onValueChange={handleFilterPriorityChange}
                      >
                        <SelectTrigger className="h-8 px-2 text-xs w-28">
                          <SelectValue placeholder="All priorities" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All priorities</SelectItem>
                          <SelectItem value="LOW">Low</SelectItem>
                          <SelectItem value="MEDIUM">Medium</SelectItem>
                          <SelectItem value="HIGH">High</SelectItem>
                          <SelectItem value="CRITICAL">Critical</SelectItem>
                        </SelectContent>
                      </Select>
                      {filterPriority.length > 0 && (
                        <div className="flex flex-wrap gap-1 ml-1">
                          {filterPriority.map(priority => (
                            <Badge 
                              key={priority} 
                              variant="outline" 
                              className="text-xs py-0 h-6"
                              onClick={() => handleFilterPriorityChange(priority)}
                            >
                              {priority}
                              <X className="h-3 w-3 ml-1" />
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    
                    {/* Assignee Filter */}
                    <div className="flex items-center">
                      <span className="text-xs font-medium mr-2">Assignee:</span>
                      <Select 
                        value={filterAssignee.length > 0 ? String(filterAssignee[0]) : "ALL"}
                        onValueChange={handleFilterAssigneeChange}
                      >
                        <SelectTrigger className="h-8 px-2 text-xs w-28">
                          <SelectValue placeholder="All assignees" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ALL">All assignees</SelectItem>
                          {Array.isArray(users) && users.map(user => (
                            <SelectItem key={user.id} value={String(user.id)}>
                              {user.fullName || user.username}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {filterAssignee.length > 0 && (
                        <div className="flex flex-wrap gap-1 ml-1">
                          {filterAssignee.map(userId => {
                            const user = Array.isArray(users) ? users.find(u => u.id === userId) : null;
                            return (
                              <Badge 
                                key={userId} 
                                variant="outline" 
                                className="text-xs py-0 h-6"
                                onClick={() => handleFilterAssigneeChange("all")}
                              >
                                {userId === -1 ? "Unassigned" : (user ? (user.fullName || user.username) : "Unknown User")}
                                <X className="h-3 w-3 ml-1" />
                              </Badge>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-xs">
                    <thead>
                      <tr className="text-left bg-neutral-100 text-xs text-neutral-700 border-b border-neutral-200">
                        <th className="font-medium px-2 py-1.5 border-r border-neutral-200">ID</th>
                        <th className="font-medium px-2 py-1.5 border-r border-neutral-200">Title</th>
                        <th className="font-medium px-2 py-1.5 border-r border-neutral-200">Type</th>
                        <th className="font-medium px-2 py-1.5 border-r border-neutral-200">Status</th>
                        <th className="font-medium px-2 py-1.5 border-r border-neutral-200">Priority</th>
                        <th className="font-medium px-2 py-1.5 border-r border-neutral-200">Assignee</th>
                        <th className="font-medium px-2 py-1.5">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.isArray(workItems) && workItems
                        .filter(item => {
                          // Filter by type if any type filters are selected
                          if (filterType.length > 0 && !filterType.includes(item.type)) {
                            return false;
                          }
                          
                          // Filter by status if any status filters are selected
                          if (filterStatus.length > 0 && !filterStatus.includes(item.status)) {
                            return false;
                          }
                          
                          // Filter by priority if any priority filters are selected
                          if (filterPriority.length > 0 && (!item.priority || !filterPriority.includes(item.priority))) {
                            return false;
                          }
                          
                          // Filter by assignee if any assignee filters are selected
                          if (filterAssignee.length > 0 && (!item.assigneeId || !filterAssignee.includes(item.assigneeId))) {
                            return false;
                          }
                          
                          return true;
                        })
                        .map(item => (
                          <tr key={item.id} className="border-b border-neutral-200 hover:bg-neutral-50 text-xs">
                            <td className="px-2 py-1.5 border-r border-neutral-200">{item.externalId}</td>
                            <td className="px-2 py-1.5 font-medium border-r border-neutral-200">{item.title}</td>
                            <td className="px-2 py-1.5 border-r border-neutral-200">
                              <span className={`inline-block px-1.5 py-0.5 rounded-sm text-xs font-medium ${
                                item.type === 'EPIC' ? 'bg-purple-100 text-purple-800' :
                                item.type === 'FEATURE' ? 'bg-blue-100 text-blue-800' :
                                item.type === 'STORY' ? 'bg-green-100 text-green-800' :
                                item.type === 'TASK' ? 'bg-orange-100 text-orange-800' :
                                'bg-red-100 text-red-800'
                              }`}>
                                {item.type}
                              </span>
                            </td>
                            <td className="px-2 py-1.5 border-r border-neutral-200">
                              <span className={`inline-block px-1.5 py-0.5 rounded-sm text-xs font-medium ${
                                item.status === 'TODO' ? 'bg-neutral-100 text-neutral-800' :
                                item.status === 'IN_PROGRESS' ? 'bg-amber-100 text-amber-800' :
                                'bg-emerald-100 text-emerald-800'
                              }`}>
                                {item.status.replace('_', ' ')}
                              </span>
                            </td>
                            <td className="px-2 py-1.5 border-r border-neutral-200">
                              {item.priority ? (
                                <span className={`inline-block px-1.5 py-0.5 rounded-sm text-xs font-medium ${
                                  item.priority === 'LOW' ? 'bg-neutral-100 text-neutral-800' :
                                  item.priority === 'MEDIUM' ? 'bg-blue-100 text-blue-800' :
                                  item.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                                  'bg-red-100 text-red-800'
                                }`}>
                                  {item.priority}
                                </span>
                              ) : (
                                <span className="text-neutral-400 text-xs">-</span>
                              )}
                            </td>
                            <td className="px-2 py-1.5 border-r border-neutral-200">
                              {item.assigneeId ? (
                                <div className="flex items-center">
                                  <div className="h-4 w-4 rounded-full bg-neutral-200 flex items-center justify-center text-xs mr-1">
                                    {users.find(u => u.id === item.assigneeId)?.fullName.substring(0, 1) || "?"}
                                  </div>
                                  <span className="text-xs truncate max-w-[100px]">
                                    {users.find(u => u.id === item.assigneeId)?.fullName || "Unknown"}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-neutral-400 text-xs">-</span>
                              )}
                            </td>
                            <td className="px-2 py-1.5">
                              <div className="flex space-x-1">
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="h-5 w-5 p-0" 
                                  onClick={() => openModal("editItem", { workItem: item })}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost" 
                                  className="h-5 w-5 p-0 text-red-500" 
                                  onClick={() => openModal("deleteItem", { workItem: item })}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      {(!Array.isArray(workItems) || workItems.length === 0) && (
                        <tr>
                          <td colSpan={7} className="px-2 py-4 text-center text-neutral-500 text-xs">
                            No work items found. Create your first work item to get started.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Calendar Tab Content */}
            {projectView === 'calendar' && (
              <div className="bg-white border rounded-md shadow-sm p-6">
                <h3 className="text-lg font-medium mb-6">Calendar View (Coming soon)</h3>
                <p className="text-neutral-500">
                  Calendar view is under development. It will provide a time-based view of your work items, 
                  allowing you to plan and track work across days, weeks, or months.
                </p>
              </div>
            )}

            {/* Settings Tab Content */}
            {projectView === 'settings' && (
              <div className="bg-white border rounded-md shadow-sm">
                <div className="p-6">
                  <h3 className="text-lg font-medium mb-6">Project Settings</h3>
                  
                  <div className="space-y-8">
                    {/* Project Details Section */}
                    <div>
                      <h4 className="text-md font-medium mb-4">Project Details</h4>
                      <div className="space-y-4">
                        <div>
                          <label htmlFor="projectName" className="block text-sm font-medium mb-1">
                            Project Name
                          </label>
                          <Input 
                            id="projectName" 
                            value={project?.name || ''} 
                            disabled
                            className="max-w-lg"
                          />
                        </div>
                        <div>
                          <label htmlFor="projectKey" className="block text-sm font-medium mb-1">
                            Project Key
                          </label>
                          <Input 
                            id="projectKey" 
                            value={project?.key || 'N/A'} 
                            disabled
                            className="max-w-lg"
                            placeholder="Project key will appear here"
                          />
                          <p className="mt-1 text-sm text-neutral-500">
                            The project key is used in work item IDs and cannot be changed after creation.
                          </p>
                        </div>
                        <div>
                          <label htmlFor="projectDescription" className="block text-sm font-medium mb-1">
                            Description
                          </label>
                          <Textarea 
                            id="projectDescription" 
                            value={project?.description || ''}
                            disabled
                            className="max-w-lg"
                            rows={3}
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Team Section */}
                    <div>
                      <h4 className="text-md font-medium mb-4">Team</h4>
                      <div className="border rounded-md overflow-hidden max-w-3xl">
                        <div className="bg-neutral-50 px-4 py-3 border-b">
                          <div className="flex justify-between items-center">
                            <h5 className="text-sm font-medium">Team Members</h5>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => openModal("addTeamMembers")}
                            >
                              <UserPlus className="h-4 w-4 mr-1" />
                              Add Members
                            </Button>
                          </div>
                        </div>
                        <div className="p-4">
                          {/* Display team members or a message */}
                          <div className="space-y-3">
                            {/* Placeholder for team members listing - will implement in the future */}
                            <p className="text-sm text-neutral-500">
                              Click the "Add Members" button to invite team members by email. 
                              They will receive access to collaborate on this project.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Danger Zone */}
                    <div>
                      <h4 className="text-md font-medium mb-4 text-red-600">Danger Zone</h4>
                      <div className="space-y-4 border border-red-200 rounded-md p-4">
                        <div className="flex items-center justify-between py-4">
                          <div>
                            <h4 className="text-sm font-medium text-red-800">Archive Project</h4>
                            <p className="text-sm text-red-600">Archive this project to hide it from active views.</p>
                          </div>
                          <Button 
                            variant="outline" 
                            className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={handleArchiveProject}
                          >
                            Archive Project
                          </Button>
                        </div>
                        
                        <div className="flex items-center justify-between py-4">
                          <div>
                            <h4 className="text-sm font-medium text-red-800">Delete Project</h4>
                            <p className="text-sm text-red-600">This action cannot be undone. All data will be permanently deleted.</p>
                          </div>
                          <Button 
                            variant="outline" 
                            className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={handleDeleteProject}
                          >
                            Delete Project
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
      
      {/* Modals */}
      {isOpen && modalType === "createItem" && (
        <CreateItemModal 
          isOpen={isOpen} 
          onClose={closeModal}
          onSuccess={handleWorkItemsUpdate}
          projects={projects}
          workItems={workItems}
          users={users}
          currentProject={project}
        />
      )}
      
      {isOpen && modalType === "editItem" && (
        <EditItemModal
          isOpen={isOpen}
          onClose={closeModal}
          onSuccess={handleWorkItemsUpdate}
          workItem={modalProps.workItem}
          workItems={workItems}
          users={users}
        />
      )}
      
      {isOpen && modalType === "deleteItem" && (
        <DeleteItemModal
          isOpen={isOpen}
          onClose={closeModal}
          onSuccess={handleWorkItemsUpdate}
          workItem={modalProps.workItem}
        />
      )}
      
      {isOpen && modalType === "addTeamMembers" && (
        <AddTeamMembersModal
          isOpen={isOpen}
          onClose={closeModal}
          projectId={parseInt(params.id)}
          teamId={project?.teamId || null}
        />
      )}
    </div>
  );
}
