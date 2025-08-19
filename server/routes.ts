import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { 
  insertUserSchema, 
  insertTeamSchema, 
  insertTeamMemberSchema, 
  insertProjectSchema, 
  insertWorkItemSchema,
  emailSchema,
  users,
  teams,
  teamMembers,
  projects,
  workItems,
  workItemHistory,
  comments,
  attachments
} from "@shared/schema";
import { ZodError, z } from "zod";
import { 
  isAdmin, 
  isScrumMasterOrAdmin, 
  canManageWorkItemType, 
  canDeleteWorkItem, 
  canDeleteEntity 
} from "./auth-middleware";
import session from "express-session";
import authRouter from "./auth-routes";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up session middleware
  app.use(session({
    secret: process.env.SESSION_SECRET || 'project-management-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false, // Always false for local dev; set true for production with HTTPS
      sameSite: 'lax', // Allows cookies for local dev and most cross-origin setups
      maxAge: 7 * 24 * 60 * 60 * 1000, // 1 week
    }
  }));

  // Register auth routes
  app.use('/api/auth', authRouter);
  // DEV ONLY: Route to clear all data
  app.delete('/api/dev/clear-database', async (req, res) => {
    try {
      if (process.env.NODE_ENV !== 'development') {
        return res.status(403).json({ message: 'Forbidden in production environment' });
      }
      
      // Clear all tables in the correct order (respecting foreign key constraints)
      await db.delete(comments);
      await db.delete(workItemHistory);
      await db.delete(attachments);
      await db.delete(workItems);
      await db.delete(projects);
      await db.delete(teamMembers);
      await db.delete(teams);
      await db.delete(users);
      
      return res.json({ message: 'All database tables cleared successfully' });
    } catch (error) {
      console.error('Error clearing database:', error);
      return res.status(500).json({ message: 'Error clearing database', error: String(error) });
    }
  });
  // Error handling middleware for Zod validation errors
  const handleZodError = (error: unknown, res: Response) => {
    if (error instanceof ZodError) {
      const formattedErrors = error.errors.map(err => ({
        path: err.path.join('.'),
        message: err.message
      }));
      return res.status(400).json({ message: "Validation error", errors: formattedErrors });
    }
    
    console.error("Unexpected error:", error);
    return res.status(500).json({ message: "Internal server error" });
  };

  // User routes
  app.post('/api/users', async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Validate email is corporate
      try {
        emailSchema.parse(userData.email);
      } catch (error) {
        return res.status(400).json({ message: "Only corporate email addresses are allowed" });
      }
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.status(409).json({ message: "User with this email already exists" });
      }
      
      const user = await storage.createUser(userData);
      
      // Don't return password in response
      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      handleZodError(error, res);
    }
  });

  app.get('/api/users', async (_req, res) => {
    try {
      const users = await storage.getUsers();
      // Remove passwords from response
      const usersWithoutPasswords = users.map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
      });
      res.json(usersWithoutPasswords);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get user by email
  app.get('/api/users/by-email/:email', async (req, res) => {
    try {
      const email = decodeURIComponent(req.params.email);
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't return password in response
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error fetching user by email:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  app.get('/api/users/:id', async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Don't return password in response
      const { password, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error fetching user by email:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // User invitation endpoint - creates user if not exists
  app.post('/api/users/invite', async (req, res) => {
    try {
      const { email, username, role } = req.body;
      
      // Validate email is corporate
      try {
        emailSchema.parse(email);
      } catch (error) {
        return res.status(400).json({ message: "Only corporate email addresses are allowed" });
      }
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        // Return existing user without password
        const { password, ...userWithoutPassword } = existingUser;
        return res.json(userWithoutPassword);
      }
      
      // Create new user with default password
      const userData = {
        email,
        username,
        fullName: username || email.split('@')[0], // Use username as default full name
        password: 'defaultPassword123', // Default password for invited users
        role: role || 'USER'
      };
      
      const user = await storage.createUser(userData);
      
      // Don't return password in response
      const { password, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error("Error inviting user:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Team routes
  // Create team (Admin only)
  app.post('/api/teams', isAdmin, async (req, res) => {
    try {
      const teamData = insertTeamSchema.parse(req.body);
      const team = await storage.createTeam(teamData);
      res.status(201).json(team);
    } catch (error) {
      handleZodError(error, res);
    }
  });

  app.get('/api/teams', async (_req, res) => {
    try {
      const teams = await storage.getTeams();
      res.json(teams);
    } catch (error) {
      console.error("Error fetching teams:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get('/api/teams/:id', async (req, res) => {
    try {
      const teamId = parseInt(req.params.id);
      const team = await storage.getTeam(teamId);
      
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }
      
      res.json(team);
    } catch (error) {
      console.error("Error fetching team:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get('/api/users/:userId/teams', async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const teams = await storage.getTeamsByUser(userId);
      res.json(teams);
    } catch (error) {
      console.error("Error fetching user teams:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Team members routes
  // Add team member (Admin and Scrum Master)
  app.post('/api/teams/:teamId/members', async (req, res) => {
    try {
      const teamId = parseInt(req.params.teamId);
      
      // Check if team exists
      const team = await storage.getTeam(teamId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }
      
      const memberData = insertTeamMemberSchema.parse({
        ...req.body,
        teamId
      });
      
      // Validate if user exists
      const user = await storage.getUser(memberData.userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const teamMember = await storage.addTeamMember(memberData);
      res.status(201).json(teamMember);
    } catch (error) {
      handleZodError(error, res);
    }
  });

  app.get('/api/teams/:teamId/members', async (req, res) => {
    try {
      const teamId = parseInt(req.params.teamId);
      
      // Check if team exists
      const team = await storage.getTeam(teamId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }
      
      const members = await storage.getTeamMembers(teamId);
      
      // Get full user data for each member
      const memberDetails = await Promise.all(
        members.map(async (member) => {
          const user = await storage.getUser(member.userId);
          if (!user) return { ...member, user: null };
          
          // Remove password from user data
          const { password, ...userWithoutPassword } = user;
          return { ...member, user: userWithoutPassword };
        })
      );
      
      res.json(memberDetails);
    } catch (error) {
      console.error("Error fetching team members:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Remove team member (Admin and Scrum Master)
  app.delete('/api/teams/:teamId/members/:userId', isScrumMasterOrAdmin, async (req, res) => {
    try {
      const teamId = parseInt(req.params.teamId);
      const userId = parseInt(req.params.userId);
      
      const removed = await storage.removeTeamMember(teamId, userId);
      
      if (!removed) {
        return res.status(404).json({ message: "Team member not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error removing team member:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Project routes
  // Create project (Admin and Scrum Master only)
  app.post('/api/projects', isScrumMasterOrAdmin, async (req, res) => {
    try {
      console.log("[DEBUG] Project creation request body:", req.body);
      console.log("[DEBUG] User session exists:", !!req.session);
      
      const projectData = insertProjectSchema.parse(req.body);
      console.log("[DEBUG] Parsed project data:", projectData);
      
      // Validate if team exists (if teamId is provided)
      if (projectData.teamId) {
        const team = await storage.getTeam(projectData.teamId);
        if (!team) {
          console.log("[DEBUG] Team not found:", projectData.teamId);
          return res.status(404).json({ message: "Team not found" });
        }
      }
      
      // Validate if user exists
      const user = await storage.getUser(projectData.createdBy);
      if (!user) {
        console.log("[DEBUG] User not found:", projectData.createdBy);
        return res.status(404).json({ message: "User not found" });
      }
      console.log("[DEBUG] Found user:", { id: user.id, username: user.username });
      
      const project = await storage.createProject(projectData);
      console.log("[DEBUG] Project created successfully:", project);
      res.status(201).json(project);
    } catch (error) {
      // Check for specific database errors
      if (error && typeof error === 'object' && 'code' in error) {
        // Handle unique constraint violation
        if (error.code === '23505') {
          // Extract the duplicate field from the error detail
          const errorDetail = 'detail' in error ? String(error.detail) : '';
          const duplicateMatch = /Key \((\w+)\)=\(([^)]+)\) already exists/.exec(errorDetail);
          if (duplicateMatch) {
            const [, field, value] = duplicateMatch;
            return res.status(409).json({ 
              message: `Conflict error`, 
              errors: [{ path: field, message: `The ${field} "${value}" is already taken` }]
            });
          }
        }
      }
      
      // Otherwise handle as standard validation error
      console.log("[DEBUG] Project creation error:", error);
      console.log("[DEBUG] Error type:", typeof error);
      if (error && typeof error === 'object') {
        console.log("[DEBUG] Error properties:", Object.keys(error));
      }
      handleZodError(error, res);
    }
  });

  app.get('/api/projects', async (_req, res) => {
    try {
      const projects = await storage.getProjects();
      console.log(`[DEBUG] Fetched ${projects.length} projects:`, projects.map(p => ({ id: p.id, name: p.name, status: p.status })));
      res.json(projects);
    } catch (error) {
      console.error("Error fetching projects:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get('/api/projects/:id', async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      const project = await storage.getProject(projectId);
      
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      res.json(project);
    } catch (error) {
      console.error("Error fetching project:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get('/api/teams/:teamId/projects', async (req, res) => {
    try {
      const teamId = parseInt(req.params.teamId);
      
      // Check if team exists
      const team = await storage.getTeam(teamId);
      if (!team) {
        return res.status(404).json({ message: "Team not found" });
      }
      
      const projects = await storage.getProjectsByTeam(teamId);
      res.json(projects);
    } catch (error) {
      console.error("Error fetching team projects:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Update a project (for archiving or other updates)
  // Update project (Admin and Scrum Master only)
  app.patch('/api/projects/:id', isScrumMasterOrAdmin, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      // Check if project exists
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Update the project with the provided fields
      const updatedProject = await storage.updateProject(projectId, req.body);
      
      if (!updatedProject) {
        return res.status(400).json({ message: "Failed to update project" });
      }
      
      res.json(updatedProject);
    } catch (error) {
      console.error("Error updating project:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });
  
  // Delete a project (Admin only)
  app.delete('/api/projects/:id', canDeleteEntity, async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      
      // Check if project exists
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Delete the project
      const success = await storage.deleteProject(projectId);
      
      if (!success) {
        return res.status(400).json({ message: "Failed to delete project" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting project:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Work items routes (Epics, Features, Stories, Tasks, Bugs)
  // Create work item (restricted by user role)
  app.post('/api/work-items', canManageWorkItemType(['STORY', 'TASK', 'BUG']), async (req, res) => {
    try {
      // Create a modified schema that makes externalId optional
      const modifiedSchema = insertWorkItemSchema.extend({
        externalId: z.string().optional(),
      });
      
      const formData = req.body;
      const workItemData = modifiedSchema.parse(formData);
      
      // Validate if project exists
      const project = await storage.getProject(workItemData.projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      // Validate if parent exists (if parentId is provided)
      if (workItemData.parentId) {
        const parent = await storage.getWorkItem(workItemData.parentId);
        if (!parent) {
          return res.status(404).json({ message: "Parent work item not found" });
        }
        
        // Validate parent-child relationship constraints
        if (!validateParentChildRelationship(parent.type as string, workItemData.type as string)) {
          const childTypeDisplay = typeof workItemData.type === 'string' ? workItemData.type.toLowerCase() : workItemData.type;
          const parentTypeDisplay = typeof parent.type === 'string' ? parent.type.toLowerCase() : parent.type;
          
          return res.status(400).json({ 
            message: "Invalid parent-child relationship",
            details: `A ${childTypeDisplay} cannot have a ${parentTypeDisplay} as parent`
          });
        }
      }
      
      // Validate if assignee exists (if assigneeId is provided)
      if (workItemData.assigneeId) {
        const assignee = await storage.getUser(workItemData.assigneeId);
        if (!assignee) {
          return res.status(404).json({ message: "Assignee not found" });
        }
      }
      
      // Validate if reporter exists (if reporterId is provided)
      if (workItemData.reporterId) {
        const reporter = await storage.getUser(workItemData.reporterId);
        if (!reporter) {
          return res.status(404).json({ message: "Reporter not found" });
        }
      }
      
      const workItem = await storage.createWorkItem(workItemData);
      res.status(201).json(workItem);
    } catch (error) {
      handleZodError(error, res);
    }
  });

  app.get('/api/projects/:projectId/work-items', async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      
      // Check if project exists
      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      
      const workItems = await storage.getWorkItemsByProject(projectId);
      res.json(workItems);
    } catch (error) {
      console.error("Error fetching work items:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get('/api/work-items/:id', async (req, res) => {
    try {
      const workItemId = parseInt(req.params.id);
      const workItem = await storage.getWorkItem(workItemId);
      
      if (!workItem) {
        return res.status(404).json({ message: "Work item not found" });
      }
      
      res.json(workItem);
    } catch (error) {
      console.error("Error fetching work item:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get('/api/work-items/:parentId/children', async (req, res) => {
    try {
      const parentId = parseInt(req.params.parentId);
      
      // Check if parent work item exists
      const parent = await storage.getWorkItem(parentId);
      if (!parent) {
        return res.status(404).json({ message: "Parent work item not found" });
      }
      
      const children = await storage.getWorkItemsByParent(parentId);
      res.json(children);
    } catch (error) {
      console.error("Error fetching child work items:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update work item status (all users can update status)
  app.patch('/api/work-items/:id/status', async (req, res) => {
    try {
      const workItemId = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!status || !['TODO', 'IN_PROGRESS', 'DONE'].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      const workItem = await storage.updateWorkItemStatus(workItemId, status);
      
      if (!workItem) {
        return res.status(404).json({ message: "Work item not found" });
      }
      
      res.json(workItem);
    } catch (error) {
      console.error("Error updating work item status:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update work item (restricted by user role)
  app.patch('/api/work-items/:id', canManageWorkItemType(['STORY', 'TASK', 'BUG']), async (req, res) => {
    try {
      const workItemId = parseInt(req.params.id);
      const updates = req.body;
      
      // Don't allow updating id, externalId, createdAt
      const { id, externalId, createdAt, ...validUpdates } = updates;
      
      // Explicit date field validation
      if (validUpdates.startDate) {
        try {
          validUpdates.startDate = new Date(validUpdates.startDate);
        } catch (error) {
          console.warn("Invalid startDate:", validUpdates.startDate);
          validUpdates.startDate = null;
        }
      }
      
      if (validUpdates.endDate) {
        try {
          validUpdates.endDate = new Date(validUpdates.endDate);
        } catch (error) {
          console.warn("Invalid endDate:", validUpdates.endDate);
          validUpdates.endDate = null;
        }
      }
      
      if (validUpdates.dueDate) {
        try {
          validUpdates.dueDate = new Date(validUpdates.dueDate);
        } catch (error) {
          console.warn("Invalid dueDate:", validUpdates.dueDate);
          validUpdates.dueDate = null;
        }
      }
      
      // Double-check the workItem exists before attempting an update
      const existingWorkItem = await storage.getWorkItem(workItemId);
      if (!existingWorkItem) {
        return res.status(404).json({ message: "Work item not found" });
      }
      
      const workItem = await storage.updateWorkItem(workItemId, validUpdates);
      
      if (!workItem) {
        return res.status(404).json({ message: "Work item not found" });
      }
      
      res.json(workItem);
    } catch (error) {
      console.error("Error updating work item:", error);
      res.status(500).json({ 
        message: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Delete work item (Admins can delete any, Scrum Masters only Story/Task/Bug)
  app.delete('/api/work-items/:id', canDeleteWorkItem, async (req, res) => {
    try {
      const workItemId = parseInt(req.params.id);
      
      // Check if there are child items
      const children = await storage.getWorkItemsByParent(workItemId);
      if (children.length > 0) {
        return res.status(400).json({ 
          message: "Cannot delete work item with children",
          details: "Delete all child items first or assign them to another parent"
        });
      }
      
      const deleted = await storage.deleteWorkItem(workItemId);
      
      if (!deleted) {
        return res.status(404).json({ message: "Work item not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting work item:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Helper function to validate parent-child relationships
  function validateParentChildRelationship(parentType: string, childType: string): boolean {
    const validRelationships: Record<string, string[]> = {
      'EPIC': ['FEATURE'],
      'FEATURE': ['STORY'],
      'STORY': ['TASK', 'BUG'],
      'TASK': [],
      'BUG': []
    };
    
    return validRelationships[parentType]?.includes(childType) || false;
  }

  // Get project statistics
  app.get("/api/projects/:id/statistics", async (req, res) => {
    try {
      const projectId = parseInt(req.params.id);
      if (isNaN(projectId)) {
        return res.status(400).json({ message: "Invalid project ID" });
      }

      const project = await storage.getProject(projectId);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }

      // Get all work items for the project
      const workItems = await storage.getWorkItemsByProject(projectId);
      
      // Get counts by status
      const statusCounts = await storage.getWorkItemsCountByStatus(projectId);
      
      // Get counts by type
      const typeCounts = await storage.getWorkItemsCountByType(projectId);
      
      // Get counts by priority
      const priorityCounts = await storage.getWorkItemsCountByPriority(projectId);
      
      // Calculate total items and completion percentage
      const totalItems = workItems.length;
      const completedItems = workItems.filter(item => item.status === 'DONE').length;
      const completionPercentage = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;
      
      // Calculate average time to resolve (for completed items with start and completion dates)
      let avgTimeToResolve = 0;
      let itemsWithResolveTime = 0;
      
      workItems.forEach(item => {
        if (item.status === 'DONE' && item.startDate && item.completedAt) {
          const startTime = new Date(item.startDate).getTime();
          const completedTime = new Date(item.completedAt).getTime();
          const resolveTime = completedTime - startTime;
          
          if (resolveTime > 0) {
            avgTimeToResolve += resolveTime;
            itemsWithResolveTime++;
          }
        }
      });
      
      if (itemsWithResolveTime > 0) {
        // Convert to days
        avgTimeToResolve = Math.round(avgTimeToResolve / (1000 * 60 * 60 * 24) / itemsWithResolveTime);
      }
      
      // Collect assignee data
      const assigneesMap = new Map();
      for (const item of workItems) {
        if (item.assigneeId) {
          const count = assigneesMap.get(item.assigneeId) || 0;
          assigneesMap.set(item.assigneeId, count + 1);
        }
      }
      
      // Get assignee details
      const assigneeStats = [];
      for (const [assigneeId, count] of assigneesMap.entries()) {
        const user = await storage.getUser(assigneeId);
        if (user) {
          const completed = workItems.filter(item => 
            item.assigneeId === assigneeId && item.status === 'DONE'
          ).length;
          
          assigneeStats.push({
            id: assigneeId,
            name: user.fullName,
            totalAssigned: count,
            completed,
            inProgress: workItems.filter(item => 
              item.assigneeId === assigneeId && item.status === 'IN_PROGRESS'
            ).length,
            todo: workItems.filter(item => 
              item.assigneeId === assigneeId && item.status === 'TODO'
            ).length,
            completionRate: count > 0 ? Math.round((completed / count) * 100) : 0
          });
        }
      }
      
      // Return the statistics
      res.json({
        totalItems,
        completedItems,
        completionPercentage,
        avgTimeToResolve,
        statusCounts,
        typeCounts,
        priorityCounts,
        assigneeStats,
        // Add project timeline info
        timeline: {
          startDate: project.startDate,
          targetDate: project.targetDate,
          daysRemaining: project.targetDate ? 
            Math.round((new Date(project.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 
            null
        }
      });
    } catch (error) {
      console.error("Error fetching project statistics:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Data management endpoints for development and testing
  app.post("/api/dev/reset-data", async (req, res) => {
    try {
      // Import data generator functions
      const { clearAllData, generateSampleData } = await import("./data-generator");
      const { generateRandomWorkItems } = await import("./fixed-data-generator");
      
      // Get count parameter (default to 150)
      const count = req.body.count || 150;
      
      // Clear all existing data
      const cleared = await clearAllData();
      if (!cleared) {
        return res.status(500).json({ message: "Failed to clear data" });
      }
      
      // Generate core sample data
      await generateSampleData();
      
      // Generate additional random work items with our fixed generator
      await generateRandomWorkItems(count);
      
      res.json({ 
        message: "Data reset successful",
        details: `All data has been cleared and new sample data has been generated with ${count} work items`
      });
    } catch (error) {
      console.error("Error resetting data:", error);
      res.status(500).json({ message: "Error resetting data" });
    }
  });
  
  // Fixed data generator endpoint - to efficiently add items with guaranteed unique IDs
  app.post("/api/dev/generate-items", async (req, res) => {
    try {
      const count = req.body.count || 150;
      const { generateRandomWorkItems } = await import("./fixed-data-generator");
      
      const result = await generateRandomWorkItems(count);
      
      if (result) {
        res.json({ 
          message: "Random work items generated successfully",
          details: `Generated ${count} work items with unique IDs`
        });
      } else {
        res.status(500).json({ 
          message: "Failed to generate random work items",
          details: "See server logs for more information" 
        });
      }
    } catch (error) {
      console.error("Error generating random work items:", error);
      res.status(500).json({ message: "Error generating random work items" });
    }
  });

  // Endpoint to get current data counts for verification
  app.get("/api/dev/data-status", async (_req, res) => {
    try {
      const users = await storage.getUsers();
      const teams = await storage.getTeams();
      const projects = await storage.getProjects();
      
      // Count work items by type
      const counts = {
        users: users.length,
        teams: teams.length,
        projects: projects.length,
        workItems: {
          total: 0,
          epics: 0,
          features: 0,
          stories: 0,
          tasks: 0,
          bugs: 0
        }
      };
      
      // Count work items for each project
      for (const project of projects) {
        const workItems = await storage.getWorkItemsByProject(project.id);
        counts.workItems.total += workItems.length;
        
        // Count by type
        counts.workItems.epics += workItems.filter(item => item.type === 'EPIC').length;
        counts.workItems.features += workItems.filter(item => item.type === 'FEATURE').length;
        counts.workItems.stories += workItems.filter(item => item.type === 'STORY').length;
        counts.workItems.tasks += workItems.filter(item => item.type === 'TASK').length;
        counts.workItems.bugs += workItems.filter(item => item.type === 'BUG').length;
      }
      
      res.json(counts);
    } catch (error) {
      console.error("Error getting data status:", error);
      res.status(500).json({ message: "Error getting data status" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
