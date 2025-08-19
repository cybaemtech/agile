import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, addWeeks, isSameMonth, isSameDay, parseISO, isValid } from "date-fns";
import { cn } from "@/lib/utils";

type ViewMode = 'month' | 'week';

interface WorkItem {
  id: number;
  externalId: string;
  title: string;
  description: string | null;
  type: 'EPIC' | 'FEATURE' | 'STORY' | 'TASK' | 'BUG';
  status: 'TODO' | 'IN_PROGRESS' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | null;
  projectId: number;
  parentId: number | null;
  assigneeId: number | null;
  reporterId: number;
  estimate: number | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

const priorityColors = {
  LOW: 'bg-green-100 text-green-800 border-green-200',
  MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  HIGH: 'bg-orange-100 text-orange-800 border-orange-200',
  CRITICAL: 'bg-red-100 text-red-800 border-red-200',
};

const typeColors = {
  EPIC: 'bg-purple-100 text-purple-800',
  FEATURE: 'bg-blue-100 text-blue-800',
  STORY: 'bg-green-100 text-green-800',
  TASK: 'bg-gray-100 text-gray-800',
  BUG: 'bg-red-100 text-red-800',
};

export default function Calendar() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  
  // Fetch current user
  const { data: currentUser } = useQuery<any>({
    queryKey: ['/api/users/64'],
  });
  
  // Fetch teams data
  const { data: teams = [] } = useQuery<any[]>({
    queryKey: ['/api/teams'],
  });
  
  // Fetch projects data
  const { data: projects = [] } = useQuery<any[]>({
    queryKey: ['/api/projects'],
  });

  // Fetch all work items from all projects
  const { data: allWorkItems = [] } = useQuery<WorkItem[]>({
    queryKey: ['/api/work-items/all'],
    queryFn: async () => {
      if (!projects.length) return [];
      
      const workItemPromises = projects.map(async (project: any) => {
        const response = await fetch(`/api/projects/${project.id}/work-items`);
        if (!response.ok) return [];
        const items = await response.json();
        return items.map((item: any) => ({
          ...item,
          projectKey: project.key,
          projectName: project.name
        }));
      });
      
      const results = await Promise.all(workItemPromises);
      return results.flat();
    },
    enabled: projects.length > 0,
  });

  // Filter work items that have dates
  const workItemsWithDates = useMemo(() => {
    return allWorkItems.filter((item: any) => {
      const hasStartDate = item.startDate && isValid(parseISO(item.startDate));
      const hasEndDate = item.endDate && isValid(parseISO(item.endDate));
      return hasStartDate || hasEndDate;
    });
  }, [allWorkItems]);

  // Generate calendar days based on view mode
  const calendarDays = useMemo(() => {
    if (viewMode === 'month') {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(currentDate);
      const calendarStart = startOfWeek(monthStart);
      const calendarEnd = endOfWeek(monthEnd);
      
      const days = [];
      let day = calendarStart;
      
      while (day <= calendarEnd) {
        days.push(day);
        day = addDays(day, 1);
      }
      
      return days;
    } else {
      // Week view
      const weekStart = startOfWeek(currentDate);
      const days = [];
      
      for (let i = 0; i < 7; i++) {
        days.push(addDays(weekStart, i));
      }
      
      return days;
    }
  }, [currentDate, viewMode]);

  // Get work items for a specific date
  const getWorkItemsForDate = (date: Date) => {
    return workItemsWithDates.filter((item: any) => {
      const startDate = item.startDate ? parseISO(item.startDate) : null;
      const endDate = item.endDate ? parseISO(item.endDate) : null;
      
      // Check if the date falls within the work item's date range
      if (startDate && endDate) {
        return date >= startDate && date <= endDate;
      } else if (startDate) {
        return isSameDay(date, startDate);
      } else if (endDate) {
        return isSameDay(date, endDate);
      }
      
      return false;
    });
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    if (viewMode === 'month') {
      setCurrentDate(prev => direction === 'next' ? addMonths(prev, 1) : addMonths(prev, -1));
    } else {
      setCurrentDate(prev => direction === 'next' ? addWeeks(prev, 1) : addWeeks(prev, -1));
    }
  };

  const formatDateHeader = () => {
    if (viewMode === 'month') {
      return format(currentDate, 'MMMM yyyy');
    } else {
      const weekStart = startOfWeek(currentDate);
      const weekEnd = endOfWeek(currentDate);
      return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
    }
  };

  return (
    <div className="flex h-screen bg-neutral-50">
      <Sidebar
        user={currentUser}
        teams={teams}
        projects={projects}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-auto p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <Button variant="ghost" className="mr-6 font-medium" asChild>
                <a href="/projects">
                  <ArrowLeft className="mr-1 h-4 w-4" />
                  Back to projects
                </a>
              </Button>
              <h1 className="text-2xl font-bold flex items-center">
                <CalendarIcon className="mr-2 h-6 w-6" />
                Calendar
              </h1>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* View Mode Toggle */}
              <div className="flex border rounded-lg">
                <Button
                  variant={viewMode === 'month' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('month')}
                  className="rounded-r-none"
                >
                  Month
                </Button>
                <Button
                  variant={viewMode === 'week' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('week')}
                  className="rounded-l-none"
                >
                  Week
                </Button>
              </div>
              
              {/* Navigation */}
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={() => navigateDate('prev')}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
                  Today
                </Button>
                <Button variant="outline" size="sm" onClick={() => navigateDate('next')}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              
              <h2 className="text-lg font-semibold min-w-[200px] text-center">
                {formatDateHeader()}
              </h2>
            </div>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {viewMode === 'month' ? 'Monthly View' : 'Weekly View'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {/* Calendar Grid */}
              <div className={cn(
                "grid gap-1",
                viewMode === 'month' ? "grid-cols-7" : "grid-cols-7"
              )}>
                {/* Day Headers */}
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                  <div key={day} className="p-2 text-center font-semibold text-sm text-gray-600 border-b">
                    {day}
                  </div>
                ))}
                
                {/* Calendar Days */}
                {calendarDays.map((day, index) => {
                  const workItems = getWorkItemsForDate(day);
                  const isCurrentMonth = viewMode === 'week' || isSameMonth(day, currentDate);
                  const isToday = isSameDay(day, new Date());
                  
                  return (
                    <div
                      key={index}
                      className={cn(
                        "border border-gray-200 min-h-[120px] p-1",
                        !isCurrentMonth && "bg-gray-50 text-gray-400",
                        isToday && "bg-blue-50 border-blue-300"
                      )}
                    >
                      <div className={cn(
                        "text-sm font-medium p-1",
                        isToday && "text-blue-600"
                      )}>
                        {format(day, 'd')}
                      </div>
                      
                      {/* Work Items */}
                      <div className="space-y-1">
                        {workItems.slice(0, viewMode === 'month' ? 3 : 8).map((item: any) => (
                          <div
                            key={item.id}
                            className={cn(
                              "text-xs p-1 rounded text-center cursor-pointer hover:opacity-80 border",
                              typeColors[item.type as keyof typeof typeColors]
                            )}
                            title={`${item.externalId}: ${item.title} (${item.projectName})`}
                          >
                            <div className="font-medium truncate">{item.externalId}</div>
                            <div className="truncate">{item.title}</div>
                            {item.priority && (
                              <Badge
                                variant="secondary"
                                className={cn(
                                  "text-xs px-1 py-0",
                                  priorityColors[item.priority as keyof typeof priorityColors]
                                )}
                              >
                                {item.priority}
                              </Badge>
                            )}
                          </div>
                        ))}
                        {workItems.length > (viewMode === 'month' ? 3 : 8) && (
                          <div className="text-xs text-gray-500 text-center">
                            +{workItems.length - (viewMode === 'month' ? 3 : 8)} more
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Legend */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-semibold mb-2">Legend</h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div>
                    <div className="text-sm font-medium mb-1">Work Item Types</div>
                    <div className="space-y-1">
                      {Object.entries(typeColors).map(([type, color]) => (
                        <div key={type} className="flex items-center space-x-2">
                          <div className={cn("w-3 h-3 rounded", color)}></div>
                          <span className="text-xs">{type}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm font-medium mb-1">Priority Levels</div>
                    <div className="space-y-1">
                      {Object.entries(priorityColors).map(([priority, color]) => (
                        <div key={priority} className="flex items-center space-x-2">
                          <div className={cn("w-3 h-3 rounded border", color)}></div>
                          <span className="text-xs">{priority}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}