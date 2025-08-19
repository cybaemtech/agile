import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, AlertCircle, BarChart3, Calendar, Clock, Target, TrendingUp, Users, CheckCircle, AlertTriangle, Bug, Zap } from "lucide-react";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useLocation } from "wouter";
import { Project, WorkItem, User, Team } from "@shared/schema";
import { cn } from "@/lib/utils";
import { format, parseISO, isValid, isBefore, isAfter, addDays, differenceInDays } from "date-fns";

interface DashboardStats {
  totalProjects: number;
  activeProjects: number;
  totalWorkItems: number;
  completedWorkItems: number;
  inProgressWorkItems: number;
  overdueWorkItems: number;
  completionRate: number;
}

interface ProjectProgress {
  project: Project;
  totalItems: number;
  completedItems: number;
  inProgressItems: number;
  overdueItems: number;
  completionRate: number;
  recentActivity: WorkItem[];
}

const priorityColors = {
  LOW: 'bg-green-100 text-green-800 border-green-200',
  MEDIUM: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  HIGH: 'bg-orange-100 text-orange-800 border-orange-200',
  CRITICAL: 'bg-red-100 text-red-800 border-red-200',
};

const typeIcons = {
  EPIC: Target,
  FEATURE: Zap,
  STORY: CheckCircle,
  TASK: Clock,
  BUG: Bug,
};

export default function Dashboard() {
  const [, setLocation] = useLocation();
  
  // Fetch current user
  const { data: currentUser } = useQuery<User>({
    queryKey: ['/api/users/64'],
  });
  
  // Fetch teams data
  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ['/api/teams'],
  });
  
  // Fetch list of projects
  const { 
    data: projects = [], 
    isLoading: isLoadingProjects 
  } = useQuery<Project[]>({
    queryKey: ['/api/projects'],
  });
  
  // Fetch all work items from all projects
  const { data: allWorkItems = [], isLoading: isLoadingWorkItems } = useQuery<WorkItem[]>({
    queryKey: ['/api/work-items/all'],
    queryFn: async () => {
      if (!projects.length) return [];
      
      const workItemPromises = projects.map(async (project: Project) => {
        const response = await fetch(`/api/projects/${project.id}/work-items`);
        if (!response.ok) return [];
        const items = await response.json();
        return items.map((item: WorkItem) => ({
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

  // Calculate dashboard statistics
  const dashboardStats = useMemo((): DashboardStats => {
    const totalProjects = projects.length;
    const activeProjects = projects.filter(p => p.status === 'ACTIVE').length;
    const totalWorkItems = allWorkItems.length;
    const completedWorkItems = allWorkItems.filter(item => item.status === 'DONE').length;
    const inProgressWorkItems = allWorkItems.filter(item => item.status === 'IN_PROGRESS').length;
    
    // Calculate overdue items (items with end dates that have passed and are not completed)
    const now = new Date();
    const overdueWorkItems = allWorkItems.filter(item => {
      if (item.status === 'DONE') return false;
      if (!item.endDate) return false;
      const endDate = typeof item.endDate === 'string' ? parseISO(item.endDate) : item.endDate;
      return isValid(endDate) && isBefore(endDate, now);
    }).length;
    
    const completionRate = totalWorkItems > 0 ? Math.round((completedWorkItems / totalWorkItems) * 100) : 0;
    
    return {
      totalProjects,
      activeProjects,
      totalWorkItems,
      completedWorkItems,
      inProgressWorkItems,
      overdueWorkItems,
      completionRate,
    };
  }, [projects, allWorkItems]);

  // Calculate project progress
  const projectProgress = useMemo((): ProjectProgress[] => {
    return projects.map(project => {
      const projectItems = allWorkItems.filter((item: any) => item.projectId === project.id);
      const totalItems = projectItems.length;
      const completedItems = projectItems.filter(item => item.status === 'DONE').length;
      const inProgressItems = projectItems.filter(item => item.status === 'IN_PROGRESS').length;
      
      const now = new Date();
      const overdueItems = projectItems.filter(item => {
        if (item.status === 'DONE') return false;
        if (!item.endDate) return false;
        const endDate = typeof item.endDate === 'string' ? parseISO(item.endDate) : item.endDate;
        return isValid(endDate) && isBefore(endDate, now);
      }).length;
      
      const completionRate = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
      
      // Get recent activity (items updated in last 7 days)
      const sevenDaysAgo = addDays(new Date(), -7);
      const recentActivity = projectItems
        .filter(item => {
          const updatedAt = typeof item.updatedAt === 'string' ? parseISO(item.updatedAt) : item.updatedAt;
          return isValid(updatedAt) && isAfter(updatedAt, sevenDaysAgo);
        })
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 5);
      
      return {
        project,
        totalItems,
        completedItems,
        inProgressItems,
        overdueItems,
        completionRate,
        recentActivity,
      };
    });
  }, [projects, allWorkItems]);

  // Get work items by type
  const workItemsByType = useMemo(() => {
    const types = ['EPIC', 'FEATURE', 'STORY', 'TASK', 'BUG'];
    return types.map(type => ({
      type,
      count: allWorkItems.filter(item => item.type === type).length,
      completed: allWorkItems.filter(item => item.type === type && item.status === 'DONE').length,
    }));
  }, [allWorkItems]);

  // Get upcoming deadlines
  const upcomingDeadlines = useMemo(() => {
    const now = new Date();
    const nextTwoWeeks = addDays(now, 14);
    
    return allWorkItems
      .filter(item => {
        if (item.status === 'DONE') return false;
        if (!item.endDate) return false;
        const endDate = typeof item.endDate === 'string' ? parseISO(item.endDate) : item.endDate;
        return isValid(endDate) && isAfter(endDate, now) && isBefore(endDate, nextTwoWeeks);
      })
      .sort((a, b) => {
        const dateA = typeof a.endDate === 'string' ? parseISO(a.endDate!) : a.endDate!;
        const dateB = typeof b.endDate === 'string' ? parseISO(b.endDate!) : b.endDate!;
        return dateA.getTime() - dateB.getTime();
      })
      .slice(0, 15);
  }, [allWorkItems]);

  if (isLoadingProjects || isLoadingWorkItems) {
    return (
      <div className="flex h-screen bg-neutral-50">
        <Sidebar user={currentUser} teams={teams} projects={projects} />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-2">Loading dashboard...</span>
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="flex h-screen bg-neutral-50">
        <Sidebar user={currentUser} teams={teams} projects={projects} />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Projects Found</h3>
            <p className="text-neutral-600 mb-4">You don't have any projects yet.</p>
            <button 
              onClick={() => setLocation('/projects')}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Go to Projects
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-neutral-50">
      <Sidebar user={currentUser} teams={teams} projects={projects} />
      
      <div className="flex-1 overflow-auto">
        <main className="p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
            <p className="text-gray-600">Overview of your project portfolio and work progress</p>
          </div>

          {/* Key Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
                <BarChart3 className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardStats.totalProjects}</div>
                <p className="text-xs text-gray-600">
                  {dashboardStats.activeProjects} active
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Work Items</CardTitle>
                <Target className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardStats.totalWorkItems}</div>
                <p className="text-xs text-gray-600">
                  {dashboardStats.inProgressWorkItems} in progress
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboardStats.completionRate}%</div>
                <p className="text-xs text-gray-600">
                  {dashboardStats.completedWorkItems} completed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overdue Items</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{dashboardStats.overdueWorkItems}</div>
                <p className="text-xs text-gray-600">
                  Require attention
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Project Progress */}
            <Card>
              <CardHeader>
                <CardTitle>Project Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {projectProgress.map(progress => (
                    <div key={progress.project.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{progress.project.name}</h4>
                          <p className="text-sm text-gray-600">{progress.project.key}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-sm font-medium">{progress.completionRate}%</span>
                          <p className="text-xs text-gray-600">
                            {progress.completedItems}/{progress.totalItems} items
                          </p>
                        </div>
                      </div>
                      <Progress value={progress.completionRate} className="h-2" />
                      {progress.overdueItems > 0 && (
                        <p className="text-xs text-red-600">
                          {progress.overdueItems} overdue items
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Work Items by Type */}
            <Card>
              <CardHeader>
                <CardTitle>Work Items by Type</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {workItemsByType.map(({ type, count, completed }) => {
                    const Icon = typeIcons[type as keyof typeof typeIcons];
                    const completionRate = count > 0 ? Math.round((completed / count) * 100) : 0;
                    
                    return (
                      <div key={type} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Icon className="h-4 w-4 text-gray-600" />
                          <span className="font-medium">{type}</span>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="text-sm text-gray-600">
                            {completed}/{count}
                          </span>
                          <div className="w-16">
                            <Progress value={completionRate} className="h-2" />
                          </div>
                          <span className="text-sm font-medium w-10 text-right">
                            {completionRate}%
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upcoming Deadlines */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    Upcoming Deadlines
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {upcomingDeadlines.length} items
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingDeadlines.length > 0 ? (
                  <div className="space-y-3">
                    {upcomingDeadlines.map(item => {
                      const endDate = typeof item.endDate === 'string' ? parseISO(item.endDate) : new Date(item.endDate!);
                      const daysUntilDeadline = differenceInDays(endDate, new Date());
                      const isUrgent = daysUntilDeadline <= 3;
                      const isWarning = daysUntilDeadline <= 7 && daysUntilDeadline > 3;
                      
                      return (
                        <div 
                          key={item.id} 
                          className={cn(
                            "flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer hover:bg-gray-50",
                            isUrgent ? "border-red-200 bg-red-50" : isWarning ? "border-yellow-200 bg-yellow-50" : "border-gray-200 bg-gray-50"
                          )}
                          onClick={() => setLocation(`/projects/${(item as any).projectId}`)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              <p className="font-medium truncate">{item.externalId}</p>
                              {isUrgent && (
                                <AlertTriangle className="h-4 w-4 text-red-500" />
                              )}
                              {isWarning && (
                                <Clock className="h-4 w-4 text-yellow-500" />
                              )}
                            </div>
                            <p className="text-sm text-gray-600 truncate">{item.title}</p>
                            <div className="flex items-center space-x-2 mt-2">
                              {item.priority && (
                                <Badge
                                  variant="secondary"
                                  className={cn(
                                    "text-xs",
                                    priorityColors[item.priority as keyof typeof priorityColors]
                                  )}
                                >
                                  {item.priority}
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-xs">
                                {item.type}
                              </Badge>
                              <Badge
                                variant="secondary"
                                className={cn(
                                  "text-xs",
                                  item.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                                )}
                              >
                                {item.status.replace('_', ' ')}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-right ml-4">
                            <div className={cn(
                              "text-sm font-medium mb-1",
                              isUrgent ? "text-red-600" : isWarning ? "text-yellow-600" : "text-gray-900"
                            )}>
                              {daysUntilDeadline === 0 ? 'Due Today' :
                               daysUntilDeadline === 1 ? 'Due Tomorrow' :
                               `${daysUntilDeadline} days`}
                            </div>
                            <p className="text-xs text-gray-500">
                              {format(endDate, 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-600 mb-2">No upcoming deadlines</p>
                    <p className="text-sm text-gray-500">All caught up for the next 2 weeks!</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {projectProgress
                    .flatMap(p => p.recentActivity.map(item => ({ ...item, projectName: p.project.name })))
                    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                    .slice(0, 8)
                    .map(item => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.externalId}</p>
                          <p className="text-sm text-gray-600 truncate">{item.title}</p>
                          <p className="text-xs text-gray-500">{(item as any).projectName}</p>
                        </div>
                        <div className="text-right ml-4">
                          <Badge
                            variant={item.status === 'DONE' ? 'default' : item.status === 'IN_PROGRESS' ? 'secondary' : 'outline'}
                            className="text-xs"
                          >
                            {item.status.replace('_', ' ')}
                          </Badge>
                          <p className="text-xs text-gray-600 mt-1">
                            {(() => {
                              const updatedAt = typeof item.updatedAt === 'string' ? parseISO(item.updatedAt) : new Date(item.updatedAt);
                              return format(updatedAt, 'MMM d');
                            })()}
                          </p>
                        </div>
                      </div>
                    ))}
                  {projectProgress.every(p => p.recentActivity.length === 0) && (
                    <p className="text-gray-600 text-center py-8">No recent activity</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}