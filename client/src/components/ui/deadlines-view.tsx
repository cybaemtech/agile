import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { WorkItem, User, Project } from "@shared/schema";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { differenceInDays, isAfter, isBefore, isPast, addDays } from "date-fns";
import { formatDate, getUserById } from "@/lib/data-utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface DeadlinesViewProps {
  workItems: WorkItem[];
  users?: User[];
  projects?: Project[];
  multiProject?: boolean;
}

// Calculate risk level based on end date and progress
function calculateRiskLevel(item: WorkItem): "high" | "medium" | "low" {
  // If no end date, default to low risk
  if (!item.endDate) return "low";
  
  const endDate = new Date(item.endDate);
  const today = new Date();
  
  // Get days remaining until end date
  const daysRemaining = differenceInDays(endDate, today);
  
  // Past deadline = high risk
  if (isPast(endDate) && item.status !== "DONE") {
    return "high";
  }
  
  // Calculate total timeline (original estimate)
  let totalTimelineInDays = 30; // Default if no startDate
  
  if (item.startDate) {
    const startDate = new Date(item.startDate);
    totalTimelineInDays = differenceInDays(endDate, startDate);
  }
  
  // If less than 20% of timeline remains and not DONE, it's high risk
  if (daysRemaining < totalTimelineInDays * 0.2 && item.status !== "DONE") {
    return "high";
  }
  
  // If less than 40% of timeline remains and still in TODO, it's high risk
  if (daysRemaining < totalTimelineInDays * 0.4 && item.status === "TODO") {
    return "high";
  }
  
  // If less than 40% of timeline remains and only in IN_PROGRESS, it's medium risk
  if (daysRemaining < totalTimelineInDays * 0.4 && item.status === "IN_PROGRESS") {
    return "medium";
  }
  
  // If less than 60% of timeline remains, it's medium risk if not complete
  if (daysRemaining < totalTimelineInDays * 0.6 && item.status !== "DONE") {
    return "medium";
  }
  
  // Otherwise, low risk
  return "low";
}

export function DeadlinesView({ 
  workItems, 
  users = [], 
  projects = [],
  multiProject = false 
}: DeadlinesViewProps) {
  const [sortOrder, setSortOrder] = useState<"upcoming" | "risk">("upcoming");
  
  // Filter to items with deadlines (using endDate as targetDate for now)
  const itemsWithDeadlines = useMemo(() => {
    return workItems.filter(item => 
      // Only show Epics and Features with end dates
      (item.type === "EPIC" || item.type === "FEATURE") && 
      item.endDate !== null
    );
  }, [workItems]);
  
  // Sort items based on selected sort order
  const sortedItems = useMemo(() => {
    if (sortOrder === "upcoming") {
      // Sort by end date (ascending)
      return [...itemsWithDeadlines].sort((a, b) => {
        if (!a.endDate) return 1;
        if (!b.endDate) return -1;
        return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
      });
    } else {
      // Sort by risk level (high to low) then by end date
      return [...itemsWithDeadlines].sort((a, b) => {
        const riskA = calculateRiskLevel(a);
        const riskB = calculateRiskLevel(b);
        
        // Prioritize risk level
        const riskOrder = { high: 0, medium: 1, low: 2 };
        if (riskOrder[riskA] !== riskOrder[riskB]) {
          return riskOrder[riskA] - riskOrder[riskB];
        }
        
        // If same risk level, sort by date
        if (!a.endDate) return 1;
        if (!b.endDate) return -1;
        return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
      });
    }
  }, [itemsWithDeadlines, sortOrder]);
  
  // Generate risk badge based on risk level
  const getRiskBadge = (item: WorkItem) => {
    const risk = calculateRiskLevel(item);
    const daysRemaining = item.endDate ? differenceInDays(new Date(item.endDate), new Date()) : null;
    
    if (risk === "high") {
      if (daysRemaining !== null && daysRemaining <= 5 && item.status !== "DONE" && item.type === "EPIC") {
        return (
          <div className="flex items-center gap-1">
            <Badge className="bg-red-600 text-white hover:bg-red-700 animate-pulse">Urgent</Badge>
            <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">High Risk</Badge>
          </div>
        );
      }
      return <Badge variant="outline" className="bg-red-50 text-red-600 border-red-200">High Risk</Badge>;
    } else if (risk === "medium") {
      return <Badge variant="outline" className="bg-amber-50 text-amber-600 border-amber-200">Medium Risk</Badge>;
    } else {
      return <Badge variant="outline" className="bg-green-50 text-green-600 border-green-200">Low Risk</Badge>;
    }
  };
  
  // Get timeline progress
  const getTimelineProgress = (item: WorkItem) => {
    if (!item.startDate || !item.endDate) return 0;
    
    const startDate = new Date(item.startDate);
    const endDate = new Date(item.endDate);
    const today = new Date();
    
    // Total timeline duration
    const totalDuration = differenceInDays(endDate, startDate) || 1; // Avoid division by zero
    
    // Time elapsed
    let elapsed = differenceInDays(today, startDate);
    
    // Cap between 0-100%
    elapsed = Math.max(0, Math.min(totalDuration, elapsed));
    
    return Math.round((elapsed / totalDuration) * 100);
  };
  
  // Get days remaining or overdue text
  const getTimeLeftText = (item: WorkItem) => {
    if (!item.endDate) return "No deadline";
    
    const endDate = new Date(item.endDate);
    const today = new Date();
    const daysRemaining = differenceInDays(endDate, today);
    
    if (item.status === "DONE") {
      return "Completed";
    } else if (daysRemaining < 0) {
      return `${Math.abs(daysRemaining)} days overdue`;
    } else if (daysRemaining === 0) {
      return "Due today";
    } else if (daysRemaining === 1) {
      return "Due tomorrow";
    } else if (daysRemaining <= 5) {
      // Special formatting for 5 or fewer days
      return `⚠️ ${daysRemaining} days remaining`;
    } else {
      return `${daysRemaining} days remaining`;
    }
  };
  
  // Get project info for multi-project view
  const getProjectInfo = (item: WorkItem) => {
    if (!multiProject) return null;
    
    const project = projects.find(p => p.id === item.projectId);
    if (!project) return null;
    
    return (
      <Badge variant="outline" className="bg-blue-50 text-blue-600 border-blue-200 mr-2">
        {project.key}
      </Badge>
    );
  };
  
  // Get the type badge for the item
  const getTypeBadge = (type: string) => {
    switch (type) {
      case "EPIC":
        return <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Epic</Badge>;
      case "FEATURE":
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Feature</Badge>;
      default:
        return null;
    }
  };
  
  return (
    <Card className="bg-white shadow-sm border border-neutral-200">
      <CardHeader className="p-6">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            Items with Deadlines ({sortedItems.length})
          </CardTitle>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-neutral-600">Sort by:</span>
            <Select
              key={sortOrder}
              value={sortOrder}
              onValueChange={(value) => setSortOrder(value as "upcoming" | "risk")}
            >
              <SelectTrigger
                className="bg-white border border-neutral-300 text-neutral-700 rounded-md h-8 w-40"
                value={sortOrder}
                onValueChange={(value) => setSortOrder(value as "upcoming" | "risk")}
              >
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="upcoming">Upcoming Deadlines</SelectItem>
                <SelectItem value="risk">Risk Level</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-6 pt-0">
        {sortedItems.length === 0 ? (
          <div className="text-center py-12 text-neutral-500">
            No items with deadlines found.
          </div>
        ) : (
          <div className="space-y-4">
            {sortedItems.map((item) => {
              const timelineProgress = getTimelineProgress(item);
              const assignee = item.assigneeId ? getUserById(users, item.assigneeId) : null;
              
              return (
                <div 
                  key={item.id} 
                  className={`p-4 rounded-md border ${
                    calculateRiskLevel(item) === "high" 
                      ? (differenceInDays(new Date(item.endDate || new Date()), new Date()) <= 5 && item.status !== "DONE" 
                          ? "border-red-300 bg-red-50 shadow-md" 
                          : "border-red-200 bg-red-50")
                      : calculateRiskLevel(item) === "medium"
                        ? "border-amber-200 bg-amber-50"
                        : "border-green-200 bg-green-50"
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center flex-wrap gap-2">
                      {getProjectInfo(item)}
                      {getTypeBadge(item.type)}
                      <h3 className="font-medium">{item.title}</h3>
                    </div>
                    {getRiskBadge(item)}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
                    <div>
                      <div className="flex justify-between">
                        <p className="text-xs text-neutral-500 mb-1">
                          {item.startDate ? `Start: ${formatDate(item.startDate)}` : "Timeline"}
                        </p>
                        <p className="text-xs text-neutral-500 mb-1">{timelineProgress}% complete</p>
                      </div>
                      <div className="flex items-center">
                        <div className="w-full bg-neutral-200 rounded-full h-2 mr-2">
                          <div 
                            className={`h-2 rounded-full ${
                              calculateRiskLevel(item) === "high" 
                                ? "bg-red-500" 
                                : calculateRiskLevel(item) === "medium" 
                                ? "bg-amber-500" 
                                : "bg-green-500"
                            }`} 
                            style={{ width: `${timelineProgress}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <p className="text-xs text-neutral-500 mb-1">Deadline</p>
                      <div className="flex items-center">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <p className="text-sm font-medium">
                                {item.endDate ? formatDate(item.endDate) : "No deadline"}
                              </p>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Status: {item.status}</p>
                              {item.startDate && <p>Start: {formatDate(item.startDate)}</p>}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-xs text-neutral-500 mb-1">Time remaining</p>
                        <p className={`text-sm font-medium ${
                          calculateRiskLevel(item) === "high" ? 
                            (differenceInDays(new Date(item.endDate || new Date()), new Date()) <= 5 && item.status !== "DONE" ? 
                              "text-red-600 bg-red-50 px-2 py-1 rounded-md border border-red-200 font-bold" : 
                              "text-red-600") : 
                          calculateRiskLevel(item) === "medium" ? "text-amber-600" : 
                          "text-green-600"
                        }`}>
                          {getTimeLeftText(item)}
                        </p>
                      </div>
                      
                      {assignee && (
                        <div className="flex items-center">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {assignee.fullName?.split(' ').map((n: string) => n[0]).join('') || 
                               assignee.username?.substring(0, 2)?.toUpperCase() || 'U'}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}