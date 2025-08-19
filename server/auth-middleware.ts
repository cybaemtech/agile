import { Request, Response, NextFunction } from "express";
import { db } from "./db";
import { users, workItems } from "@shared/schema";
import { eq } from "drizzle-orm";

/**
 * Middleware to check if the current user has admin role
 */
export const isAdmin = async (req: Request, res: Response, next: NextFunction) => {
  // Get the user ID from the session
  const userId = (req as any).session?.userId;
  
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized: Not logged in" });
  }
  
  try {
    // Get the user record to check role
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    
    if (!user) {
      return res.status(401).json({ message: "Unauthorized: User not found" });
    }
    
    if (user.role !== "ADMIN") {
      return res.status(403).json({ message: "Forbidden: Admin access required" });
    }
    
    // User is an admin, proceed
    next();
  } catch (error) {
    console.error("Error in admin middleware:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Middleware to check if the current user has Scrum Master role (or higher)
 */
export const isScrumMasterOrAdmin = async (req: Request, res: Response, next: NextFunction) => {
  // Get the user ID from the session
  const userId = (req as any).session?.userId;
  
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized: Not logged in" });
  }
  
  try {
    // Get the user record to check role
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    
    if (!user) {
      return res.status(401).json({ message: "Unauthorized: User not found" });
    }
    
    if (user.role !== "ADMIN" && user.role !== "SCRUM_MASTER") {
      return res.status(403).json({ message: "Forbidden: Scrum Master or Admin access required" });
    }
    
    // User is a Scrum Master or Admin, proceed
    next();
  } catch (error) {
    console.error("Error in scrum master middleware:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Middleware to check if a user can manage work items of specific types
 * Used to restrict regular users from creating/editing Epics and Features
 */
export const canManageWorkItemType = (allowedTypes: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Get the requested work item type from the request
    const workItemType = req.body.type;
    
    if (!workItemType) {
      return res.status(400).json({ message: "Work item type is required" });
    }
    
    // Get the user ID from the session
    const userId = (req as any).session?.userId;
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized: Not logged in" });
    }
    
    try {
      // Get the user record to check role
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      
      if (!user) {
        return res.status(401).json({ message: "Unauthorized: User not found" });
      }
      
      // Admins and Scrum Masters can manage all work item types
      if (user.role === "ADMIN" || user.role === "SCRUM_MASTER") {
        return next();
      }
      
      // Regular users can only manage allowed types
      if (!allowedTypes.includes(workItemType)) {
        return res.status(403).json({ 
          message: `Regular users can only create/edit ${allowedTypes.join(", ")}` 
        });
      }
      
      // User can manage this work item type, proceed
      next();
    } catch (error) {
      console.error("Error in work item type middleware:", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  };
};

/**
 * Middleware to check if a user can delete a work item
 * Regular users cannot delete any work items
 * Scrum Masters can delete Story, Task, Bug
 * Admins can delete any work item
 */
export const canDeleteWorkItem = async (req: Request, res: Response, next: NextFunction) => {
  // Get the user ID from the session
  const userId = (req as any).session?.userId;
  
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized: Not logged in" });
  }
  
  try {
    // Get the user record to check role
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    
    if (!user) {
      return res.status(401).json({ message: "Unauthorized: User not found" });
    }
    
    // If admin, allow deletion
    if (user.role === "ADMIN") {
      return next();
    }
    
    // For Scrum Master, we need to check the work item type
    if (user.role === "SCRUM_MASTER") {
      // Get the ID of the work item to be deleted
      const workItemId = parseInt(req.params.id);
      
      if (isNaN(workItemId)) {
        return res.status(400).json({ message: "Invalid work item ID" });
      }
      
      // Get the work item to check its type
      const [workItem] = await db
        .select()
        .from(workItems)
        .where(eq(workItems.id, workItemId));
      
      if (!workItem) {
        return res.status(404).json({ message: "Work item not found" });
      }
      
      // Scrum Masters can only delete STORY, TASK, BUG
      if (["STORY", "TASK", "BUG"].includes(workItem.type)) {
        return next();
      } else {
        return res.status(403).json({ 
          message: "Scrum Masters can only delete Stories, Tasks, and Bugs" 
        });
      }
    }
    
    // Regular users cannot delete any work items
    return res.status(403).json({ message: "Regular users cannot delete work items" });
    
  } catch (error) {
    console.error("Error in delete work item middleware:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Middleware to check if a user can delete a project or team
 * Only Admins can delete projects and teams
 */
export const canDeleteEntity = async (req: Request, res: Response, next: NextFunction) => {
  // Get the user ID from the session
  const userId = (req as any).session?.userId;
  
  if (!userId) {
    return res.status(401).json({ message: "Unauthorized: Not logged in" });
  }
  
  try {
    // Get the user record to check role
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    
    if (!user) {
      return res.status(401).json({ message: "Unauthorized: User not found" });
    }
    
    // Only admins can delete projects and teams
    if (user.role !== "ADMIN") {
      return res.status(403).json({ message: "Only administrators can delete projects and teams" });
    }
    
    // User is an admin, proceed
    next();
  } catch (error) {
    console.error("Error in delete entity middleware:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};