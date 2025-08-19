import { WorkItem, User, Team } from "@shared/schema";

/**
 * Calculate statistics for work items in a project
 */
export function calculateProjectStats(workItems: WorkItem[]) {
  // Total counts
  const totalItems = workItems.length;
  const completedItems = workItems.filter(item => item.status === 'DONE').length;
  const completionPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  // Calculate average time to resolve for completed items
  let avgTimeToResolve = 0;
  const completedWithDates = workItems.filter(item => 
    item.status === 'DONE' && item.createdAt && item.completedAt
  );
  
  if (completedWithDates.length > 0) {
    const totalDays = completedWithDates.reduce((sum, item) => {
      const createdDate = new Date(item.createdAt);
      const completedDate = new Date(item.completedAt as Date);
      const daysDiff = Math.ceil((completedDate.getTime() - createdDate.getTime()) / (1000 * 3600 * 24));
      return sum + daysDiff;
    }, 0);
    avgTimeToResolve = Math.round(totalDays / completedWithDates.length);
  }

  // Status counts
  const statusCounts = {
    'TODO': workItems.filter(item => item.status === 'TODO').length,
    'IN_PROGRESS': workItems.filter(item => item.status === 'IN_PROGRESS').length,
    'DONE': completedItems,
  };

  // Type counts
  const typeCounts = {
    'EPIC': workItems.filter(item => item.type === 'EPIC').length,
    'FEATURE': workItems.filter(item => item.type === 'FEATURE').length,
    'STORY': workItems.filter(item => item.type === 'STORY').length,
    'TASK': workItems.filter(item => item.type === 'TASK').length,
    'BUG': workItems.filter(item => item.type === 'BUG').length,
  };

  // Priority counts
  const priorityCounts = {
    'LOW': workItems.filter(item => item.priority === 'LOW').length,
    'MEDIUM': workItems.filter(item => item.priority === 'MEDIUM').length,
    'HIGH': workItems.filter(item => item.priority === 'HIGH').length,
    'CRITICAL': workItems.filter(item => item.priority === 'CRITICAL').length,
  };

  return {
    totalItems,
    completedItems,
    completionPercentage,
    avgTimeToResolve,
    statusCounts,
    typeCounts,
    priorityCounts,
    todoCount: statusCounts['TODO'],
    inProgressCount: statusCounts['IN_PROGRESS'],
    doneCount: statusCounts['DONE'],
    epics: typeCounts['EPIC'],
    features: typeCounts['FEATURE'],
    stories: typeCounts['STORY'],
    tasks: typeCounts['TASK'],
    bugs: typeCounts['BUG'],
  };
}

/**
 * Get formatted title for work item type
 */
export function getItemTypeTitle(type: string): string {
  switch(type) {
    case 'EPIC': return 'Epic';
    case 'FEATURE': return 'Feature';
    case 'STORY': return 'Story';
    case 'TASK': return 'Task';
    case 'BUG': return 'Bug';
    default: return type;
  }
}

/**
 * Get formatted title for item status
 */
export function getStatusTitle(status: string): string {
  switch(status) {
    case 'TODO': return 'To Do';
    case 'IN_PROGRESS': return 'In Progress';
    case 'DONE': return 'Done';
    default: return status;
  }
}

/**
 * Get status color based on status value
 */
export function getStatusColor(status: string): string {
  switch(status) {
    case 'TODO': return 'bg-blue-500';
    case 'IN_PROGRESS': return 'bg-orange-500';
    case 'DONE': return 'bg-green-500';
    default: return 'bg-gray-500';
  }
}

/**
 * Get priority color based on priority value
 */
export function getPriorityColor(priority: string): string {
  switch(priority) {
    case 'LOW': return 'bg-gray-100 text-gray-800';
    case 'MEDIUM': return 'bg-yellow-100 text-yellow-800';
    case 'HIGH': return 'bg-orange-100 text-orange-800';
    case 'CRITICAL': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
}

/**
 * Get work items that are children of a specific parent
 */
export function getChildWorkItems(workItems: WorkItem[], parentId: number): WorkItem[] {
  return workItems.filter(item => item.parentId === parentId);
}

/**
 * Get team initials from team name (first letter of each word, max 2 characters)
 */
export function getTeamInitials(teamName: string): string {
  return teamName
    .split(' ')
    .map(word => word[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();
}

/**
 * Get user initials from full name (first letter of each name part)
 */
export function getUserInitials(fullName: string): string {
  return fullName
    .split(' ')
    .map(name => name[0])
    .join('')
    .toUpperCase();
}

/**
 * Format a date in a readable format
 */
export function formatDate(date: Date | string): string {
  if (!date) return '';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }).format(dateObj);
}

/**
 * Get the user object by ID from a list of users
 */
export function getUserById(users: User[], userId: number | null | undefined): User | undefined {
  if (!userId) return undefined;
  return users.find(user => user.id === userId);
}

/**
 * Get the team object by ID from a list of teams
 */
export function getTeamById(teams: Team[], teamId: number | null | undefined): Team | undefined {
  if (!teamId) return undefined;
  return teams.find(team => team.id === teamId);
}
