import dotenv from 'dotenv';
dotenv.config(); // ✅ Loads environment variables from .env

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";

const app = express();

import cors from 'cors';
app.use(cors({
  origin: 'http://localhost:5173', // Change if your frontend runs on a different port
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// Function to initialize test data
async function initializeTestData() {
  try {
    // Check if data already exists
    const users = await storage.getUsers();
    if (users.length > 0) {
      log("Test data already exists.");
      return;
    }

    log("Initializing test data...");

    // Create a test user
    const user = await storage.createUser({
      username: "testuser",
      password: "password123",
      fullName: "Test User",
      email: "test.user@company.com",
      avatarUrl: null,
      isActive: true
    });

    // Create a test team
    const team = await storage.createTeam({
      name: "Engineering Team",
      description: "Core engineering team",
      createdBy: user.id,
      isActive: true
    });

    // Add the user to the team
    await storage.addTeamMember({
      teamId: team.id,
      userId: user.id,
      role: "ADMIN"
    });

    // Create a test project
    const project = await storage.createProject({
      name: "Project Management App",
      description: "A comprehensive project management application",
      status: "ACTIVE",
      createdBy: user.id,
      teamId: team.id,
      key: "PROJ", // Project key for work item references
      startDate: new Date(),
      targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) // 90 days from now
    });

    // Create sample work items
    // Epic
    const epic = await storage.createWorkItem({
      title: "User Management System",
      description: "Implement comprehensive user management features",
      type: "EPIC",
      status: "IN_PROGRESS",
      priority: "HIGH",
      projectId: project.id,
      parentId: null,
      assigneeId: user.id,
      reporterId: user.id,
      estimate: 40, // Hours as numeric for better querying
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      externalId: `${project.key}-001` // Will be auto-generated if not provided
    });

    // Feature
    const feature = await storage.createWorkItem({
      title: "User Authentication",
      description: "Implement user authentication with JWT",
      type: "FEATURE",
      status: "TODO",
      priority: "HIGH",
      projectId: project.id,
      parentId: epic.id,
      assigneeId: user.id,
      reporterId: user.id,
      estimate: 20, // Hours as numeric
      externalId: `${project.key}-002` // Will be auto-generated if not provided
    });

    // Story
    const story = await storage.createWorkItem({
      title: "Login Page",
      description: "Create login page with email and password fields",
      type: "STORY",
      status: "TODO",
      priority: "MEDIUM",
      projectId: project.id,
      parentId: feature.id,
      assigneeId: user.id,
      reporterId: user.id,
      estimate: 5, // Story points as numeric
      externalId: `${project.key}-003` // Will be auto-generated if not provided
    });

    // Task
    await storage.createWorkItem({
      title: "Design login form UI",
      description: "Create responsive design for login form",
      type: "TASK",
      status: "TODO",
      priority: "MEDIUM",
      projectId: project.id,
      parentId: story.id,
      assigneeId: user.id,
      reporterId: user.id,
      estimate: 4, // Hours as numeric
      externalId: `${project.key}-004` // Will be auto-generated if not provided
    });

    // Bug
    await storage.createWorkItem({
      title: "Fix form validation",
      description: "Fix validation errors on the login form",
      type: "BUG",
      status: "TODO",
      priority: "HIGH",
      projectId: project.id,
      parentId: story.id,
      assigneeId: user.id,
      reporterId: user.id,
      estimate: 2, // Hours as numeric
      externalId: `${project.key}-005` // Will be auto-generated if not provided
    });

    // Add a comment to a work item
    await storage.createComment(story.id, user.id, "Let's make sure we implement proper form validation here.");

    log("Test data initialized successfully!");
  } catch (error) {
    console.error("Error initializing test data:", error);
  }
}

// Import the data generators
import { generateSampleData } from "./data-generator";
import { generateRandomWorkItems } from "./fixed-data-generator";
import bcrypt from 'bcryptjs';
import { db } from './db';
import { users } from '@shared/schema';

// Function to create sample users with different role types
async function initializeSampleUsers() {
  try {
    log("Creating sample role-based users if they don't exist...");
    
    // Check if sample users already exist
    const existingUsers = await db.select().from(users);
    const adminExists = existingUsers.some(user => user.role === 'ADMIN');
    const scrumMasterExists = existingUsers.some(user => user.role === 'SCRUM_MASTER');
    const regularUserExists = existingUsers.some(user => user.role === 'USER');
    
    if (adminExists && scrumMasterExists && regularUserExists) {
      log("Sample role-based users already exist.");
      return;
    }
    
    const salt = await bcrypt.genSalt(10);
    
    // Hash different passwords for each user type
    const adminHashedPassword = await bcrypt.hash('admin123', salt);
    const scrumHashedPassword = await bcrypt.hash('scrum123', salt);
    const userHashedPassword = await bcrypt.hash('user123', salt);
    
    const sampleUsers = [];
    
    // Create admin user if not exists
    if (!adminExists) {
      const [adminUser] = await db.insert(users).values({
        username: 'admin',
        email: 'admin@example.com',
        password: adminHashedPassword,
        fullName: 'Admin User',
        role: 'ADMIN',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      
      sampleUsers.push(adminUser);
      log("Created ADMIN user - admin@example.com");
    }
    
    // Create scrum master user if not exists
    if (!scrumMasterExists) {
      const [scrumUser] = await db.insert(users).values({
        username: 'scrummaster',
        email: 'scrum@example.com',
        password: scrumHashedPassword,
        fullName: 'Scrum Master',
        role: 'SCRUM_MASTER',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      
      sampleUsers.push(scrumUser);
      log("Created SCRUM_MASTER user - scrum@example.com");
    }
    
    // Create regular user if not exists
    if (!regularUserExists) {
      const [regularUser] = await db.insert(users).values({
        username: 'user',
        email: 'user@example.com',
        password: userHashedPassword,
        fullName: 'Regular User',
        role: 'USER',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      
      sampleUsers.push(regularUser);
      log("Created USER user - user@example.com");
    }
    
    log(`Created ${sampleUsers.length} sample role-based users successfully.`);
  } catch (error) {
    console.error("Error creating sample users:", error);
  }
}

(async () => {
  // Initialize test data before starting the server
  await initializeTestData();
  
  // Generate sample data first (will be skipped if data already exists)
  await generateSampleData();
  
  // Use the improved generator with guaranteed unique IDs
  try {
    // Get existing data count
    const users = await storage.getUsers();
    if (users.length > 0) {
      log("Sample data already exists, generating additional items with fixed generator...");
      await generateRandomWorkItems(150);
    }
  } catch (error) {
    console.error("Error generating additional data:", error);
  }
  
  const server = await registerRoutes(app);
  
  // Create sample users for different roles after server is ready
  await initializeSampleUsers();

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = process.env.PORT || 5000;
server.listen(port, '127.0.0.1', () => {
  log(`✅ Server is running on port ${port}`);
});


})();
