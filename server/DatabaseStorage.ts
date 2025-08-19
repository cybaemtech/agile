import { eq, and, desc, asc, isNull, sql } from "drizzle-orm";
import { db } from "./db";
import { IStorage } from "./storage";
import {
  users,
  teams,
  teamMembers,
  projects,
  workItems,
  comments,
  attachments,
  workItemHistory,
  type User,
  type InsertUser,
  type Team,
  type InsertTeam,
  type TeamMember,
  type InsertTeamMember,
  type Project,
  type InsertProject,
  type WorkItem,
  type InsertWorkItem,
  type Comment,
  type InsertComment,
  type Attachment,
  type InsertAttachment,
} from "@shared/schema";

/**
 * Generate external ID for work items using project key and an incremented counter
 */
async function generateExternalId(type: string, projectId: number): Promise<string> {
  // First, get the project key
  const [project] = await db
    .select({ key: projects.key })
    .from(projects)
    .where(eq(projects.id, projectId));
  
  if (!project) {
    throw new Error(`Project with ID ${projectId} not found`);
  }
  
  // Count existing work items for this project to generate the next sequence number
  const countResult = await db
    .select({ count: sql<number>`count(*)` })
    .from(workItems)
    .where(eq(workItems.projectId, projectId));
  
  const count = countResult[0]?.count || 0;
  const nextNumber = count + 1;
  
  // Format to ensure at least 3 digits, e.g., PROJ-001
  return `${project.key}-${nextNumber.toString().padStart(3, '0')}`;
}

export class DatabaseStorage implements IStorage {
  // User management methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values({
      ...insertUser,
      isActive: true,
      updatedAt: new Date(),
    }).returning();
    return user;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users).where(eq(users.isActive, true));
  }

  // Team management methods
  async createTeam(insertTeam: InsertTeam): Promise<Team> {
    const [team] = await db.insert(teams).values({
      ...insertTeam,
      isActive: true,
      updatedAt: new Date(),
    }).returning();
    return team;
  }

  async getTeam(id: number): Promise<Team | undefined> {
    const [team] = await db.select().from(teams).where(eq(teams.id, id));
    return team;
  }

  async getTeams(): Promise<Team[]> {
    return await db.select().from(teams).where(eq(teams.isActive, true));
  }

  async getTeamsByUser(userId: number): Promise<Team[]> {
    // Find all teams where the user is a member
    return await db
      .select({
        id: teams.id,
        name: teams.name,
        description: teams.description,
        createdBy: teams.createdBy,
        isActive: teams.isActive,
        createdAt: teams.createdAt,
        updatedAt: teams.updatedAt,
      })
      .from(teams)
      .innerJoin(teamMembers, eq(teams.id, teamMembers.teamId))
      .where(and(
        eq(teamMembers.userId, userId),
        eq(teams.isActive, true)
      ));
  }

  // Team members methods
  async addTeamMember(insertTeamMember: InsertTeamMember): Promise<TeamMember> {
    const [teamMember] = await db.insert(teamMembers).values({
      ...insertTeamMember,
      updatedAt: new Date(),
    }).returning();
    return teamMember;
  }

  async getTeamMembers(teamId: number): Promise<TeamMember[]> {
    return await db
      .select()
      .from(teamMembers)
      .where(eq(teamMembers.teamId, teamId));
  }

  async removeTeamMember(teamId: number, userId: number): Promise<boolean> {
    const result = await db
      .delete(teamMembers)
      .where(
        and(
          eq(teamMembers.teamId, teamId),
          eq(teamMembers.userId, userId)
        )
      );
    
    return result.rowCount > 0;
  }

  // Project management methods
  async createProject(insertProject: InsertProject): Promise<Project> {
    const [project] = await db.insert(projects).values({
      ...insertProject,
      updatedAt: new Date(),
    }).returning();
    return project;
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project;
  }

  async getProjects(): Promise<Project[]> {
    return await db
      .select()
      .from(projects);
  }

  async getProjectsByTeam(teamId: number): Promise<Project[]> {
    return await db
      .select()
      .from(projects)
      .where(eq(projects.teamId, teamId));
  }
  
  async updateProject(id: number, updates: Partial<Project>): Promise<Project | undefined> {
    try {
      const [updatedProject] = await db
        .update(projects)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(eq(projects.id, id))
        .returning();
      
      return updatedProject;
    } catch (error) {
      console.error("Error updating project:", error);
      return undefined;
    }
  }
  
  async deleteProject(id: number): Promise<boolean> {
    try {
      // In a real application, we might want to implement soft delete
      // or check for dependencies before deleting
      const result = await db
        .delete(projects)
        .where(eq(projects.id, id));
      
      return result.rowCount > 0;
    } catch (error) {
      console.error("Error deleting project:", error);
      return false;
    }
  }

  // Work items methods (Epics, Features, Stories, Tasks, Bugs)
  async createWorkItem(insertWorkItem: InsertWorkItem): Promise<WorkItem> {
    // Generate external ID if not provided
    const externalId = insertWorkItem.externalId || 
                      await generateExternalId(insertWorkItem.type, insertWorkItem.projectId);
    
    const [workItem] = await db.insert(workItems).values({
      ...insertWorkItem,
      externalId,
      updatedAt: new Date(),
    }).returning();
    
    return workItem;
  }

  async getWorkItem(id: number): Promise<WorkItem | undefined> {
    const [workItem] = await db.select().from(workItems).where(eq(workItems.id, id));
    return workItem;
  }

  async getWorkItemsByProject(projectId: number): Promise<WorkItem[]> {
    return await db
      .select()
      .from(workItems)
      .where(eq(workItems.projectId, projectId))
      .orderBy(desc(workItems.updatedAt));
  }

  async getWorkItemsByParent(parentId: number): Promise<WorkItem[]> {
    return await db
      .select()
      .from(workItems)
      .where(eq(workItems.parentId, parentId))
      .orderBy(desc(workItems.updatedAt));
  }

  async updateWorkItemStatus(id: number, status: string): Promise<WorkItem | undefined> {
    const now = new Date();
    const values: Record<string, any> = {
      status,
      updatedAt: now,
    };
    
    // If status is DONE, set completedAt
    if (status === "DONE") {
      values.completedAt = now;
    }
    
    const [workItem] = await db
      .update(workItems)
      .set(values)
      .where(eq(workItems.id, id))
      .returning();
    
    return workItem;
  }

  async updateWorkItem(id: number, updates: Partial<WorkItem>): Promise<WorkItem | undefined> {
    // Process date fields to ensure they're proper Date objects
    const processedUpdates: Partial<WorkItem> = { ...updates };
    
    // Handle startDate and endDate specifically
    if (updates.startDate && !(updates.startDate instanceof Date)) {
      try {
        processedUpdates.startDate = new Date(updates.startDate);
      } catch (error) {
        processedUpdates.startDate = null;
      }
    }
    
    if (updates.endDate && !(updates.endDate instanceof Date)) {
      try {
        processedUpdates.endDate = new Date(updates.endDate);
      } catch (error) {
        processedUpdates.endDate = null;
      }
    }
    
    if (updates.dueDate && !(updates.dueDate instanceof Date)) {
      try {
        processedUpdates.dueDate = new Date(updates.dueDate);
      } catch (error) {
        processedUpdates.dueDate = null;
      }
    }
    
    const [workItem] = await db
      .update(workItems)
      .set({
        ...processedUpdates,
        updatedAt: new Date(),
      })
      .where(eq(workItems.id, id))
      .returning();
    
    return workItem;
  }

  async deleteWorkItem(id: number): Promise<boolean> {
    // Check if there are any child items first
    const childItems = await this.getWorkItemsByParent(id);
    if (childItems.length > 0) {
      return false; // Cannot delete if there are child items
    }
    
    const result = await db
      .delete(workItems)
      .where(eq(workItems.id, id));
    
    return result.rowCount > 0;
  }
  
  // Comments methods
  async createComment(workItemId: number, userId: number, content: string): Promise<Comment> {
    const [comment] = await db.insert(comments).values({
      workItemId,
      userId,
      content,
      updatedAt: new Date(),
    }).returning();
    
    return comment;
  }
  
  async getCommentsByWorkItem(workItemId: number): Promise<Comment[]> {
    return await db
      .select()
      .from(comments)
      .where(eq(comments.workItemId, workItemId))
      .orderBy(asc(comments.createdAt));
  }

  // Work item history methods
  async addWorkItemHistoryEntry(
    workItemId: number, 
    userId: number, 
    field: string, 
    oldValue: string | null, 
    newValue: string | null
  ): Promise<void> {
    await db.insert(workItemHistory).values({
      workItemId,
      userId,
      field,
      oldValue,
      newValue,
    });
  }
  
  async getWorkItemHistory(workItemId: number): Promise<any[]> {
    return await db
      .select({
        id: workItemHistory.id,
        field: workItemHistory.field,
        oldValue: workItemHistory.oldValue,
        newValue: workItemHistory.newValue,
        changedAt: workItemHistory.changedAt,
        userId: workItemHistory.userId,
        username: users.username,
        fullName: users.fullName,
      })
      .from(workItemHistory)
      .innerJoin(users, eq(workItemHistory.userId, users.id))
      .where(eq(workItemHistory.workItemId, workItemId))
      .orderBy(desc(workItemHistory.changedAt));
  }
  
  // File attachments methods
  async addAttachment(attachment: InsertAttachment): Promise<Attachment> {
    const [result] = await db.insert(attachments).values(attachment).returning();
    return result;
  }
  
  async getAttachmentsByWorkItem(workItemId: number): Promise<Attachment[]> {
    return await db
      .select()
      .from(attachments)
      .where(eq(attachments.workItemId, workItemId))
      .orderBy(desc(attachments.uploadedAt));
  }
  
  // Advanced queries
  async getWorkItemsWithFilters(filters: {
    projectId?: number;
    types?: string[];
    statuses?: string[];
    priorities?: string[];
    assigneeId?: number | null; // null means unassigned
  }): Promise<WorkItem[]> {
    let query = db.select().from(workItems);
    
    if (filters.projectId !== undefined) {
      query = query.where(eq(workItems.projectId, filters.projectId));
    }
    
    if (filters.types && filters.types.length > 0) {
      query = query.where(sql`${workItems.type} IN ${filters.types}`);
    }
    
    if (filters.statuses && filters.statuses.length > 0) {
      query = query.where(sql`${workItems.status} IN ${filters.statuses}`);
    }
    
    if (filters.priorities && filters.priorities.length > 0) {
      query = query.where(sql`${workItems.priority} IN ${filters.priorities}`);
    }
    
    if (filters.assigneeId !== undefined) {
      if (filters.assigneeId === null) {
        query = query.where(isNull(workItems.assigneeId));
      } else {
        query = query.where(eq(workItems.assigneeId, filters.assigneeId));
      }
    }
    
    return await query.orderBy(desc(workItems.updatedAt));
  }
  
  // Dashboard/reporting methods
  async getWorkItemsCountByStatus(projectId: number): Promise<Record<string, number>> {
    const results = await db
      .select({
        status: workItems.status,
        count: sql<number>`count(*)`,
      })
      .from(workItems)
      .where(eq(workItems.projectId, projectId))
      .groupBy(workItems.status);
    
    return results.reduce((acc, curr) => {
      acc[curr.status] = curr.count;
      return acc;
    }, {} as Record<string, number>);
  }
  
  async getWorkItemsCountByType(projectId: number): Promise<Record<string, number>> {
    const results = await db
      .select({
        type: workItems.type,
        count: sql<number>`count(*)`,
      })
      .from(workItems)
      .where(eq(workItems.projectId, projectId))
      .groupBy(workItems.type);
    
    return results.reduce((acc, curr) => {
      acc[curr.type] = curr.count;
      return acc;
    }, {} as Record<string, number>);
  }

  async getWorkItemsCountByPriority(projectId: number): Promise<Record<string, number>> {
    const results = await db
      .select({
        priority: workItems.priority,
        count: sql<number>`count(*)`,
      })
      .from(workItems)
      .where(eq(workItems.projectId, projectId))
      .groupBy(workItems.priority);
    
    return results.reduce((acc, curr) => {
      acc[curr.priority] = curr.count;
      return acc;
    }, {} as Record<string, number>);
  }
}