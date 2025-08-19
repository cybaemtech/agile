import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sidebar } from "@/components/layout/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from "recharts";
import { 
  Loader2, AlertCircle, TrendingUp, Target, 
  Clock, BarChart3, PieChart as PieChartIcon, Activity, AlertTriangle
} from "lucide-react";
import { Project, WorkItem, User, Team } from "@shared/schema";
import { format, parseISO, isValid, startOfWeek, endOfWeek, addWeeks, isBefore } from "date-fns";
import { cn } from "@/lib/utils";

const priorityColors = {
  LOW: '#10b981',
  MEDIUM: '#f59e0b', 
  HIGH: '#f97316',
  CRITICAL: '#ef4444',
};

export default function Reports() {
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [reportScope, setReportScope] = useState<'project' | 'workspace'>('workspace');
  
  // Fetch current user
  const { data: currentUser } = useQuery<User>({
    queryKey: ['/api/users/64'],
  });
  
  // Fetch teams data
  const { data: teams = [] } = useQuery<Team[]>({
    queryKey: ['/api/teams'],
  });
  
  // Fetch projects
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
  
  // Get filtered work items based on scope
  const filteredWorkItems = useMemo(() => {
    if (reportScope === 'workspace') {
      return allWorkItems;
    } else if (selectedProject) {
      return allWorkItems.filter((item: any) => item.projectId === parseInt(selectedProject));
    }
    return [];
  }, [allWorkItems, reportScope, selectedProject]);

  // Analytics calculations
  const analytics = useMemo(() => {
    const items = filteredWorkItems;
    const now = new Date();
    
    // Basic stats
    const totalItems = items.length;
    const completedItems = items.filter(item => item.status === 'DONE').length;
    const inProgressItems = items.filter(item => item.status === 'IN_PROGRESS').length;
    const todoItems = items.filter(item => item.status === 'TODO').length;
    const completionRate = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
    
    // Overdue items
    const overdueItems = items.filter(item => {
      if (item.status === 'DONE') return false;
      if (!item.endDate) return false;
      const endDate = parseISO(item.endDate);
      return isValid(endDate) && isBefore(endDate, now);
    }).length;
    
    // Work items by type
    const typeDistribution = ['EPIC', 'FEATURE', 'STORY', 'TASK', 'BUG'].map(type => {
      const count = items.filter(item => item.type === type).length;
      const completed = items.filter(item => item.type === type && item.status === 'DONE').length;
      return {
        name: type,
        total: count,
        completed: completed,
        completionRate: count > 0 ? Math.round((completed / count) * 100) : 0,
      };
    });
    
    // Priority distribution
    const priorityDistribution = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(priority => ({
      name: priority,
      value: items.filter(item => item.priority === priority).length,
      color: priorityColors[priority as keyof typeof priorityColors],
    }));
    
    // Status distribution for pie chart
    const statusDistribution = [
      { name: 'TODO', value: todoItems, color: '#f59e0b' },
      { name: 'IN_PROGRESS', value: inProgressItems, color: '#3b82f6' },
      { name: 'DONE', value: completedItems, color: '#10b981' }
    ];
    
    // Weekly completion trend (last 8 weeks)
    const weeklyTrend = [];
    for (let i = 7; i >= 0; i--) {
      const weekStart = addWeeks(startOfWeek(now), -i);
      const weekEnd = endOfWeek(weekStart);
      
      const completed = items.filter(item => {
        if (item.status !== 'DONE' || !item.completedAt) return false;
        const completedDate = parseISO(item.completedAt);
        return isValid(completedDate) && 
               completedDate >= weekStart && 
               completedDate <= weekEnd;
      }).length;
      
      const created = items.filter(item => {
        const createdDate = parseISO(item.createdAt);
        return isValid(createdDate) && 
               createdDate >= weekStart && 
               createdDate <= weekEnd;
      }).length;
      
      weeklyTrend.push({
        week: format(weekStart, 'MMM d'),
        completed,
        created,
        net: completed - created
      });
    }
    
    // Project performance (if workspace scope)
    const projectPerformance = reportScope === 'workspace' ? projects.map(project => {
      const projectItems = items.filter((item: any) => item.projectId === project.id);
      const total = projectItems.length;
      const completed = projectItems.filter(item => item.status === 'DONE').length;
      const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
      
      return {
        name: project.key,
        fullName: project.name,
        completion: rate,
        total: total,
        completed: completed,
        overdue: projectItems.filter(item => {
          if (item.status === 'DONE') return false;
          if (!item.endDate) return false;
          const endDate = parseISO(item.endDate);
          return isValid(endDate) && isBefore(endDate, now);
        }).length
      };
    }).filter(p => p.total > 0) : [];
    
    // Velocity (items completed per week over last 4 weeks)
    const velocity = [];
    for (let i = 3; i >= 0; i--) {
      const weekStart = addWeeks(startOfWeek(now), -i);
      const weekEnd = endOfWeek(weekStart);
      
      const completed = items.filter(item => {
        if (item.status !== 'DONE' || !item.completedAt) return false;
        const completedDate = parseISO(item.completedAt);
        return isValid(completedDate) && 
               completedDate >= weekStart && 
               completedDate <= weekEnd;
      }).length;
      
      velocity.push({
        week: format(weekStart, 'MMM d'),
        velocity: completed
      });
    }
    
    const avgVelocity = velocity.length > 0 ? 
      Math.round(velocity.reduce((sum, v) => sum + v.velocity, 0) / velocity.length) : 0;
    
    return {
      totalItems,
      completedItems,
      inProgressItems,
      todoItems,
      completionRate,
      overdueItems,
      typeDistribution,
      priorityDistribution,
      statusDistribution,
      weeklyTrend,
      projectPerformance,
      velocity,
      avgVelocity
    };
  }, [filteredWorkItems, projects, reportScope]);
  
  if (isLoadingProjects || isLoadingWorkItems) {
    return (
      <div className="flex h-screen bg-neutral-50">
        <Sidebar user={currentUser} teams={teams} projects={projects} />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <span className="ml-2">Loading reports...</span>
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
            <p className="text-neutral-600 mb-4">You don't have any projects to report on yet.</p>
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
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Reports & Analytics</h1>
              <p className="text-gray-600">Comprehensive insights into project performance and progress</p>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* Scope Toggle */}
              <div className="flex border rounded-lg">
                <Button
                  variant={reportScope === 'workspace' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setReportScope('workspace')}
                  className="rounded-r-none"
                >
                  Workspace
                </Button>
                <Button
                  variant={reportScope === 'project' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setReportScope('project')}
                  className="rounded-l-none"
                >
                  Project
                </Button>
              </div>
              
              {/* Project Selector */}
              {reportScope === 'project' && (
                <Select 
                  value={selectedProject || undefined} 
                  onValueChange={setSelectedProject}
                >
                  <SelectTrigger className="w-60">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id.toString()}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Items</CardTitle>
                <Target className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.totalItems}</div>
                <p className="text-xs text-gray-600">Work items</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.completionRate}%</div>
                <p className="text-xs text-gray-600">{analytics.completedItems} completed</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">In Progress</CardTitle>
                <Activity className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.inProgressItems}</div>
                <p className="text-xs text-gray-600">Active items</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Overdue</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{analytics.overdueItems}</div>
                <p className="text-xs text-gray-600">Need attention</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Velocity</CardTitle>
                <Clock className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics.avgVelocity}</div>
                <p className="text-xs text-gray-600">Items/week</p>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="overview" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="trends">Trends</TabsTrigger>
              <TabsTrigger value="performance">Performance</TabsTrigger>
              <TabsTrigger value="distribution">Distribution</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Status Distribution Pie Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <PieChartIcon className="h-4 w-4 mr-2" />
                      Status Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={analytics.statusDistribution}
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            label={({ name, value, percent }) => 
                              `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                            }
                          >
                            {analytics.statusDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Work Item Types */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Work Item Types
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {analytics.typeDistribution.map((type, index) => (
                        <div key={type.name} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{type.name}</span>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-gray-600">
                                {type.completed}/{type.total}
                              </span>
                              <Badge 
                                variant="secondary"
                                className={cn(
                                  "text-xs",
                                  type.completionRate >= 80 ? "bg-green-100 text-green-800" :
                                  type.completionRate >= 50 ? "bg-yellow-100 text-yellow-800" :
                                  "bg-red-100 text-red-800"
                                )}
                              >
                                {type.completionRate}%
                              </Badge>
                            </div>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${type.completionRate}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="trends" className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Weekly Completion Trend */}
                <Card>
                  <CardHeader>
                    <CardTitle>Weekly Completion Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={analytics.weeklyTrend}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="week" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Area
                            type="monotone"
                            dataKey="completed"
                            stackId="1"
                            stroke="#10b981"
                            fill="#10b981"
                            name="Completed"
                          />
                          <Area
                            type="monotone"
                            dataKey="created"
                            stackId="2"
                            stroke="#3b82f6"
                            fill="#3b82f6"
                            name="Created"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Velocity Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Team Velocity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics.velocity}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="week" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="velocity" fill="#8b5cf6" name="Items Completed" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="performance" className="space-y-6">
              {reportScope === 'workspace' && analytics.projectPerformance.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Project Performance Comparison</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics.projectPerformance} layout="horizontal">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" domain={[0, 100]} />
                          <YAxis dataKey="name" type="category" width={80} />
                          <Tooltip 
                            formatter={(value: any, name: string) => {
                              if (name === 'Completion Rate') return [`${value}%`, name];
                              return [value, name];
                            }}
                            labelFormatter={(label: string) => {
                              const project = analytics.projectPerformance.find(p => p.name === label);
                              return project ? project.fullName : label;
                            }}
                          />
                          <Legend />
                          <Bar dataKey="completion" fill="#10b981" name="Completion Rate" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                      {analytics.projectPerformance.slice(0, 3).map(project => (
                        <div key={project.name} className="p-4 bg-gray-50 rounded-lg">
                          <div className="font-medium">{project.fullName}</div>
                          <div className="text-sm text-gray-600 mt-1">
                            {project.completed}/{project.total} items completed
                          </div>
                          {project.overdue > 0 && (
                            <div className="text-xs text-red-600 mt-1">
                              {project.overdue} overdue items
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="distribution" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Priority Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={analytics.priorityDistribution}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          fill="#8884d8"
                          dataKey="value"
                          label={({ name, value, percent }) => 
                            value > 0 ? `${name}: ${value} (${(percent * 100).toFixed(0)}%)` : ''
                          }
                        >
                          {analytics.priorityDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}