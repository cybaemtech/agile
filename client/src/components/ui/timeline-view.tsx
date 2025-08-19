import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WorkItem, Project } from "@shared/schema";

type TimeUnit = "Quarter" | "Month" | "Week";

interface TimelineViewProps {
  projectId?: number;
  workItems: WorkItem[];
  timeUnit?: TimeUnit;
  onTimeUnitChange?: (unit: TimeUnit) => void;
  projects?: Project[];
  multiProject?: boolean;
}

export function TimelineView({ 
  projectId, 
  workItems,
  timeUnit = "Quarter",
  onTimeUnitChange,
  projects = [],
  multiProject = false
}: TimelineViewProps) {
  // Filter to get only Epics and Features
  const epics = workItems.filter(item => item.type === 'EPIC');
  const features = workItems.filter(item => item.type === 'FEATURE');
  
  // Get formatted time periods based on selected unit
  const timePeriods = getTimePeriods(timeUnit);
  
  // Get features under an epic
  const getFeaturesForEpic = (epicId: number) => {
    return features.filter(feature => feature.parentId === epicId);
  };
  
  // Helper to get project name if in multi-project view
  const getProjectName = (projectId: number | null) => {
    if (!projectId || !multiProject) return null;
    const project = projects.find(p => p.id === projectId);
    return project ? project.name : null;
  };
  
  // Get the position and span of an item on the timeline
  const getTimelinePosition = (item: WorkItem) => {
    // If no start/end dates, position in first column with span of 1
    if (!item.startDate || !item.endDate) {
      return { start: 0, span: 1 };
    }
    
    const startDate = new Date(item.startDate);
    const endDate = new Date(item.endDate);
    
    let start = 0;
    let span = 1;
    
    if (timeUnit === "Quarter") {
      // Calculate quarter position (0-3 for Q1-Q4)
      const startQuarter = Math.floor(startDate.getMonth() / 3);
      const endQuarter = Math.floor(endDate.getMonth() / 3);
      const startYear = startDate.getFullYear();
      const endYear = endDate.getFullYear();
      
      // Calculate position based on relative quarters from the first time period
      const firstYear = parseInt(timePeriods[0].split(' ')[1]);
      start = (startYear - firstYear) * 4 + startQuarter;
      span = (endYear - startYear) * 4 + (endQuarter - startQuarter) + 1;
    } else if (timeUnit === "Month") {
      // Calculate month position (0-11 for Jan-Dec)
      const startMonth = startDate.getMonth();
      const endMonth = endDate.getMonth();
      const startYear = startDate.getFullYear();
      const endYear = endDate.getFullYear();
      
      // Calculate position based on relative months from the first time period
      const [firstMonth, firstYear] = getMonthYearFromPeriod(timePeriods[0]);
      start = (startYear - firstYear) * 12 + (startMonth - firstMonth);
      span = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
    } else if (timeUnit === "Week") {
      // For simplicity, just show current and next 3 weeks
      // In a real app, this would be more sophisticated
      start = 0;
      span = 1;
    }
    
    // Ensure start and span are valid
    if (start < 0) start = 0;
    if (span < 1) span = 1;
    if (start >= timePeriods.length) start = 0;
    if (start + span > timePeriods.length) span = timePeriods.length - start;
    
    return { start, span };
  };
  
  // Helper to get month/year from a period string
  function getMonthYearFromPeriod(period: string): [number, number] {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const [month, year] = period.split(' ');
    return [months.indexOf(month), parseInt(year)];
  }
  
  // Handle time unit change
  const handleTimeUnitChange = (value: string) => {
    onTimeUnitChange?.(value as TimeUnit);
  };

  return (
    <Card className="bg-white shadow-sm border border-neutral-200">
      <CardHeader className="p-6">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Epics & Features Timeline</CardTitle>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-neutral-600">View by:</span>
            <Select value={timeUnit} onValueChange={handleTimeUnitChange}>
              <SelectTrigger className="bg-white border border-neutral-300 text-neutral-700 rounded-md h-8 w-32">
                <SelectValue placeholder="Quarter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Quarter">Quarter</SelectItem>
                <SelectItem value="Month">Month</SelectItem>
                <SelectItem value="Week">Week</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-6 pt-0">
        <div className="overflow-x-auto pb-2">
          {/* Timeline header */}
          <div className="flex min-w-max border-b border-neutral-200 pb-3">
            <div className="w-64 flex-shrink-0"></div>
            <div className="flex-1 grid" style={{ gridTemplateColumns: `repeat(${timePeriods.length}, minmax(100px, 1fr))` }}>
              {timePeriods.map((period, index) => (
                <div key={index} className="text-sm font-medium text-neutral-500">
                  {period}
                </div>
              ))}
            </div>
          </div>
          
          {/* Timeline content */}
          <div className="min-w-max pt-4">
            {epics.map(epic => {
              const epicFeatures = getFeaturesForEpic(epic.id);
              const epicPosition = getTimelinePosition(epic);
              
              return (
                <div key={epic.id} className="mb-8">
                  {/* Epic header */}
                  <div className="flex items-start mb-3">
                    <div className="w-64 flex-shrink-0 pr-4">
                      <div className="flex items-center">
                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold mr-2">
                          E
                        </div>
                        <div>
                          <h3 className="font-medium">{epic.title}</h3>
                          <div className="flex items-center space-x-1">
                            <p className="text-xs text-neutral-500">{epic.externalId}</p>
                            {multiProject && epic.projectId && (
                              <Badge variant="outline" className="text-xs bg-neutral-100 text-neutral-700 px-1 py-0">
                                {getProjectName(epic.projectId)}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div 
                      className="flex-1 grid" 
                      style={{ gridTemplateColumns: `repeat(${timePeriods.length}, minmax(100px, 1fr))` }}
                    >
                      <div 
                        className={`col-span-${epicPosition.span} col-start-${epicPosition.start + 1} bg-primary/10 rounded-md p-2 border-l-4 border-primary`}
                        style={{ 
                          gridColumn: `${epicPosition.start + 1} / span ${epicPosition.span}` 
                        }}
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">{epic.title}</span>
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${
                              epic.status === 'TODO' ? 'bg-blue-100 text-blue-800' : 
                              epic.status === 'IN_PROGRESS' ? 'bg-orange-100 text-orange-800' : 
                              'bg-green-100 text-green-800'
                            }`}
                          >
                            {epic.status === 'TODO' 
                              ? 'To Do' 
                              : epic.status === 'IN_PROGRESS' 
                                ? 'In Progress' 
                                : 'Done'
                            }
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Features under Epic */}
                  <div className="pl-8">
                    {epicFeatures.map(feature => {
                      const featurePosition = getTimelinePosition(feature);
                      
                      return (
                        <div key={feature.id} className="flex items-start mb-2">
                          <div className="w-64 flex-shrink-0 pr-4">
                            <div className="flex items-center">
                              <div className="w-5 h-5 rounded-md bg-neutral-200 flex items-center justify-center text-neutral-700 text-xs font-bold mr-2">
                                F
                              </div>
                              <div>
                                <h4 className="text-sm font-medium">{feature.title}</h4>
                                <div className="flex items-center space-x-1">
                                  <p className="text-xs text-neutral-500">{feature.externalId}</p>
                                  {multiProject && feature.projectId && (
                                    <Badge variant="outline" className="text-xs bg-neutral-100 text-neutral-700 px-1 py-0">
                                      {getProjectName(feature.projectId)}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div 
                            className="flex-1 grid" 
                            style={{ gridTemplateColumns: `repeat(${timePeriods.length}, minmax(100px, 1fr))` }}
                          >
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <div 
                                    className="bg-neutral-100 rounded-md p-2 h-10"
                                    style={{ 
                                      gridColumn: `${featurePosition.start + 1} / span ${featurePosition.span}` 
                                    }}
                                  >
                                    <div className="truncate text-xs font-medium text-neutral-700">
                                      {feature.title}
                                    </div>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="text-sm font-medium">{feature.title}</div>
                                  <div className="text-xs text-neutral-500">{feature.externalId}</div>
                                  {feature.description && (
                                    <div className="text-xs mt-1 max-w-xs">{feature.description}</div>
                                  )}
                                  <div className="text-xs mt-1">
                                    Status: {feature.status.replace('_', ' ')}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Generate time periods based on the selected unit
function getTimePeriods(unit: TimeUnit): string[] {
  const today = new Date();
  
  if (unit === "Quarter") {
    const currentYear = today.getFullYear();
    return [
      `Q1 ${currentYear}`,
      `Q2 ${currentYear}`,
      `Q3 ${currentYear}`,
      `Q4 ${currentYear}`,
      `Q1 ${currentYear + 1}`,
      `Q2 ${currentYear + 1}`,
      `Q3 ${currentYear + 1}`,
      `Q4 ${currentYear + 1}`,
    ];
  }
  
  if (unit === "Month") {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    let periods = [];
    for (let i = 0; i < 12; i++) {
      const month = (currentMonth + i) % 12;
      const year = currentYear + Math.floor((currentMonth + i) / 12);
      periods.push(`${months[month]} ${year}`);
    }
    return periods;
  }
  
  if (unit === "Week") {
    // Simple implementation showing next few weeks
    // In a real app, this would be more sophisticated
    return [
      "Week 1",
      "Week 2",
      "Week 3",
      "Week 4",
      "Week 5",
      "Week 6",
      "Week 7",
      "Week 8",
    ];
  }
  
  return [];
}
