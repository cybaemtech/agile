import { storage } from "./storage";
import { InsertUser, InsertTeam, InsertTeamMember, InsertProject, InsertWorkItem } from "@shared/schema";
import { log } from "./vite";

// Team names with realistic departments
const teamNames = [
  { name: "Engineering Team", description: "Core engineering and development team" },
  { name: "Design Team", description: "UI/UX and product design team" },
  { name: "Marketing Team", description: "Marketing, communications, and brand management" },
  { name: "Operations Team", description: "Internal operations and infrastructure" },
  { name: "Product Team", description: "Product management and strategy" }
];

// Project data
const projectData = [
  { 
    name: "Enterprise Resource Planning System", 
    key: "ERP", 
    description: "Comprehensive ERP solution with integrated modules for all departments" 
  },
  { 
    name: "Customer Experience Platform", 
    key: "CXP", 
    description: "Unified platform for managing all customer interactions and experiences" 
  },
  { 
    name: "Data Analytics Dashboard", 
    key: "DAD", 
    description: "Business intelligence dashboard with advanced analytics capabilities" 
  },
  { 
    name: "Cloud Migration Initiative", 
    key: "CMI", 
    description: "Strategic migration of on-premises systems to cloud infrastructure" 
  },
  { 
    name: "Mobile Workforce Solution", 
    key: "MWS", 
    description: "Cross-platform mobile application for remote workforce management" 
  }
];

// User data - using corporate domains
const userData: InsertUser[] = [
  { username: "jsmith", password: "password123", fullName: "John Smith", email: "jsmith@company.com", isActive: true },
  { username: "mjohnson", password: "password123", fullName: "Maria Johnson", email: "mjohnson@company.com", isActive: true },
  { username: "alee", password: "password123", fullName: "Alex Lee", email: "alee@company.com", isActive: true },
  { username: "schang", password: "password123", fullName: "Sarah Chang", email: "schang@company.com", isActive: true },
  { username: "rthomas", password: "password123", fullName: "Ryan Thomas", email: "rthomas@company.com", isActive: true },
  { username: "jpatel", password: "password123", fullName: "Jessica Patel", email: "jpatel@company.com", isActive: true },
  { username: "mwilson", password: "password123", fullName: "Marcus Wilson", email: "mwilson@company.com", isActive: true },
  { username: "dgarcia", password: "password123", fullName: "Diana Garcia", email: "dgarcia@company.com", isActive: true },
  { username: "tkim", password: "password123", fullName: "Tyler Kim", email: "tkim@company.com", isActive: true },
  { username: "landerson", password: "password123", fullName: "Lisa Anderson", email: "landerson@company.com", isActive: true },
  { username: "emartinez", password: "password123", fullName: "Eduardo Martinez", email: "emartinez@company.com", isActive: true },
  { username: "nbrown", password: "password123", fullName: "Nina Brown", email: "nbrown@company.com", isActive: true },
  { username: "kpark", password: "password123", fullName: "Kevin Park", email: "kpark@company.com", isActive: true },
  { username: "lrobinson", password: "password123", fullName: "Laura Robinson", email: "lrobinson@company.com", isActive: true },
  { username: "dcarter", password: "password123", fullName: "David Carter", email: "dcarter@company.com", isActive: true },
  { username: "mrodriguez", password: "password123", fullName: "Maria Rodriguez", email: "mrodriguez@company.com", isActive: true },
  { username: "atravers", password: "password123", fullName: "Aiden Travers", email: "atravers@company.com", isActive: true },
  { username: "jgillespie", password: "password123", fullName: "Jordan Gillespie", email: "jgillespie@company.com", isActive: true },
  { username: "slopez", password: "password123", fullName: "Sofia Lopez", email: "slopez@company.com", isActive: true },
  { username: "jnguyen", password: "password123", fullName: "Jason Nguyen", email: "jnguyen@company.com", isActive: true }
];

// Epic templates for each project
const epicTemplates = [
  // Enterprise Resource Planning System epics
  [
    { title: "Finance Module", description: "Complete financial management system with accounting features" },
    { title: "Human Resources Module", description: "Employee management, payroll, and benefits administration" },
    { title: "Inventory Management", description: "Real-time inventory tracking and management" }
  ],
  // Customer Experience Platform epics
  [
    { title: "Customer Portal", description: "Self-service customer portal with account management" },
    { title: "Support Ticketing System", description: "Comprehensive support ticket management workflow" },
    { title: "Customer Analytics", description: "Advanced analytics and reporting on customer behavior" }
  ],
  // Data Analytics Dashboard epics
  [
    { title: "Data Visualization", description: "Interactive charts and visual data representations" },
    { title: "Predictive Analytics", description: "Machine learning models for business forecasting" },
    { title: "Reporting System", description: "Customizable report generation and scheduling" }
  ],
  // Cloud Migration Initiative epics
  [
    { title: "Infrastructure Assessment", description: "Evaluate existing systems for migration readiness" },
    { title: "Migration Strategy", description: "Develop comprehensive cloud migration roadmap" },
    { title: "Cloud Implementation", description: "Execute phased migration to cloud infrastructure" }
  ],
  // Mobile Workforce Solution epics
  [
    { title: "Field Operations", description: "Mobile tools for field service management" },
    { title: "Team Collaboration", description: "Real-time communication and collaboration features" },
    { title: "Offline Capabilities", description: "Robust offline functionality with data synchronization" }
  ]
];

// Feature templates for each epic
const featureTemplates = [
  // Finance Module features
  [
    { title: "General Ledger", description: "Core accounting system with multi-currency support" },
    { title: "Accounts Payable", description: "Vendor management and payment processing" },
    { title: "Accounts Receivable", description: "Customer invoicing and payment collection" },
    { title: "Financial Reporting", description: "Comprehensive financial statements and reports" }
  ],
  // Human Resources Module features
  [
    { title: "Employee Records", description: "Centralized employee information management" },
    { title: "Payroll Processing", description: "Automated payroll calculations and tax handling" },
    { title: "Benefits Administration", description: "Health, retirement, and other benefits management" },
    { title: "Time & Attendance", description: "Time tracking and absence management" }
  ],
  // Inventory Management features
  [
    { title: "Item Tracking", description: "Real-time inventory tracking with barcode support" },
    { title: "Warehouse Management", description: "Multiple location inventory control" },
    { title: "Order Processing", description: "Purchase and sales order management" },
    { title: "Inventory Analytics", description: "Inventory forecasting and optimization" }
  ],
  // Customer Portal features
  [
    { title: "Account Management", description: "Self-service account management capabilities" },
    { title: "Order History", description: "Complete order history and tracking" },
    { title: "Preference Center", description: "Customer preference and communication settings" },
    { title: "Document Access", description: "Secure access to statements and documents" }
  ],
  // Support Ticketing features
  [
    { title: "Ticket Creation", description: "Multi-channel ticket submission" },
    { title: "Ticket Routing", description: "Intelligent routing based on issue type" },
    { title: "Knowledge Base", description: "Self-service knowledge base integration" },
    { title: "SLA Management", description: "Service level agreement tracking and alerts" }
  ],
  // Customer Analytics features
  [
    { title: "Behavior Tracking", description: "Customer behavior and interaction analysis" },
    { title: "Segmentation Tools", description: "Advanced customer segmentation capabilities" },
    { title: "Predictive Models", description: "Churn prediction and lifetime value modeling" },
    { title: "Reporting Dashboard", description: "Interactive customer analytics dashboard" }
  ],
  // Data Visualization features
  [
    { title: "Interactive Charts", description: "Dynamic, interactive data visualization" },
    { title: "Custom Dashboards", description: "User-configurable dashboard layouts" },
    { title: "Export Capabilities", description: "Multiple export formats for visualizations" },
    { title: "Real-time Updates", description: "Live data feeds and visualization updates" }
  ],
  // Predictive Analytics features
  [
    { title: "Forecasting Models", description: "Time-series forecasting for business metrics" },
    { title: "Anomaly Detection", description: "Automated detection of data anomalies" },
    { title: "Recommendation Engine", description: "Personalized recommendations based on ML" },
    { title: "Model Management", description: "Model training and version management" }
  ],
  // Reporting System features
  [
    { title: "Report Builder", description: "Drag-and-drop custom report builder" },
    { title: "Scheduled Reports", description: "Automated report generation and distribution" },
    { title: "Data Integration", description: "Multi-source data integration for reporting" },
    { title: "Compliance Reports", description: "Pre-built compliance and regulatory reports" }
  ],
  // Infrastructure Assessment features
  [
    { title: "System Inventory", description: "Comprehensive system and application inventory" },
    { title: "Dependency Mapping", description: "Application dependency visualization" },
    { title: "Performance Analysis", description: "System performance and capacity analysis" },
    { title: "Risk Assessment", description: "Migration risk identification and mitigation" }
  ],
  // Migration Strategy features
  [
    { title: "Phasing Plan", description: "Multi-phase migration strategy development" },
    { title: "Cost Analysis", description: "Detailed cost-benefit analysis for migration" },
    { title: "Resource Allocation", description: "Team and resource planning for migration" },
    { title: "Rollback Planning", description: "Contingency and rollback plan development" }
  ],
  // Cloud Implementation features
  [
    { title: "Environment Setup", description: "Cloud environment configuration and security" },
    { title: "Data Migration", description: "Secure data transfer to cloud platforms" },
    { title: "Application Refactoring", description: "Application modifications for cloud optimization" },
    { title: "Monitoring Implementation", description: "Cloud-native monitoring and alerting setup" }
  ],
  // Field Operations features
  [
    { title: "Job Assignment", description: "Dynamic assignment and scheduling of field work" },
    { title: "Location Tracking", description: "GPS-based location tracking and routing" },
    { title: "Digital Forms", description: "Mobile forms for field data collection" },
    { title: "Photo Documentation", description: "Photo capture and annotation in the field" }
  ],
  // Team Collaboration features
  [
    { title: "Group Messaging", description: "Team and project-based messaging" },
    { title: "File Sharing", description: "Secure document sharing and collaboration" },
    { title: "Video Conferencing", description: "Integrated video calls and meetings" },
    { title: "Task Management", description: "Collaborative task assignment and tracking" }
  ],
  // Offline Capabilities features
  [
    { title: "Offline Data Access", description: "Access to critical data without connectivity" },
    { title: "Form Submission", description: "Offline form completion and queued submission" },
    { title: "Conflict Resolution", description: "Smart handling of data conflicts after sync" },
    { title: "Selective Sync", description: "Bandwidth-efficient selective data synchronization" }
  ]
];

// Story templates for features
const storyTemplates = [
  { title: "Design Implementation", description: "Implement the approved design for this feature" },
  { title: "API Integration", description: "Integrate with backend APIs for data exchange" },
  { title: "Unit Test Coverage", description: "Ensure complete unit test coverage for the feature" },
  { title: "Performance Optimization", description: "Optimize performance for the feature" },
  { title: "Documentation", description: "Create user and technical documentation" }
];

// Task templates
const taskTemplates = [
  { title: "Create wireframes", description: "Create wireframes for design review" },
  { title: "Implement frontend components", description: "Create and style the necessary UI components" },
  { title: "Write API endpoints", description: "Create API endpoints for data operations" },
  { title: "Write unit tests", description: "Create comprehensive unit tests" },
  { title: "Perform code review", description: "Review code for quality and standards" },
  { title: "Integration testing", description: "Test integration points between components" },
  { title: "Accessibility testing", description: "Test for accessibility compliance" },
  { title: "Performance testing", description: "Benchmark and optimize performance" },
  { title: "Documentation", description: "Write technical documentation" },
  { title: "Final QA", description: "Perform final quality assurance checks" }
];

// Bug templates
const bugTemplates = [
  { title: "Layout issues in mobile view", description: "UI layout breaks on smaller mobile screens" },
  { title: "Authentication fails with special characters", description: "Users with special characters in credentials can't log in" },
  { title: "Performance degradation with large datasets", description: "System slows down with datasets over certain size" },
  { title: "Cross-browser compatibility issue", description: "Feature doesn't work correctly in specific browsers" },
  { title: "Memory leak in component", description: "Component doesn't clean up resources properly" }
];

/**
 * Clear all existing data from the database
 */
export async function clearAllData() {
  try {
    log("Clearing all existing data...");
    // Import necessary modules
    const db = await import("./db").then(module => module.db);
    const { sql } = await import("drizzle-orm");
    const {
      workItemHistory,
      comments,
      attachments,
      workItems,
      teamMembers,
      projects,
      teams,
      users
    } = await import("@shared/schema");
    
    // Delete all work items first (due to foreign key constraints)
    await db.delete(workItemHistory);
    await db.delete(comments);
    await db.delete(attachments);
    await db.delete(workItems);
    
    // Delete team members and projects
    await db.delete(teamMembers);
    await db.delete(projects);
    
    // Delete teams
    await db.delete(teams);
    
    // Delete users (except admin)
    await db.delete(users).where(sql`id > 1`);
    
    log("All data cleared successfully");
    return true;
  } catch (error) {
    console.error("Error clearing data:", error);
    return false;
  }
}

/**
 * Generate sample data for demonstration purposes
 */
export async function generateSampleData() {
  try {
    // Check if we already have more than our test user
    const users = await storage.getUsers();
    if (users.length > 1) {
      log("Sample data already exists, skipping generation");
      return;
    }

    log("Generating sample data...");
    
    // Get existing test user or create a new admin user if none exists
    let adminUser = users[0];
    if (!adminUser) {
      adminUser = await storage.createUser({
        username: "admin",
        password: "admin123",
        fullName: "Admin User",
        email: "admin@company.com",
        isActive: true,
      });
      log(`Created admin user with ID ${adminUser.id}`);
    }

    // Create users
    const createdUsers = [adminUser];
    for (const user of userData) {
      try {
        const createdUser = await storage.createUser(user);
        createdUsers.push(createdUser);
        log(`Created user: ${createdUser.fullName}`);
      } catch (error) {
        console.error(`Error creating user ${user.username}:`, error);
      }
    }

    // Create teams
    const createdTeams = [];
    for (const teamData of teamNames) {
      try {
        const team = await storage.createTeam({
          name: teamData.name,
          description: teamData.description,
          createdBy: adminUser.id,
          isActive: true,
        });
        createdTeams.push(team);
        log(`Created team: ${team.name}`);

        // Add team members (4 per team)
        const availableUsers = [...createdUsers];
        // Always add admin to each team
        await storage.addTeamMember({
          teamId: team.id,
          userId: adminUser.id,
          role: "ADMIN",
        });
        
        // Add 3 more random members
        for (let i = 0; i < 3; i++) {
          // Remove admin and get a random user
          const randomIndex = Math.floor(Math.random() * (availableUsers.length - 1)) + 1;
          const user = availableUsers[randomIndex];
          // Remove this user from available pool
          availableUsers.splice(randomIndex, 1);
          
          await storage.addTeamMember({
            teamId: team.id,
            userId: user.id,
            role: "MEMBER",
          });
          log(`Added ${user.fullName} to ${team.name}`);
        }
      } catch (error) {
        console.error(`Error creating team ${teamData.name}:`, error);
      }
    }

    // Create projects (assign to random teams)
    const createdProjects = [];
    for (let i = 0; i < projectData.length; i++) {
      try {
        const projectInfo = projectData[i];
        const randomTeam = createdTeams[Math.floor(Math.random() * createdTeams.length)];
        
        const project = await storage.createProject({
          name: projectInfo.name,
          key: projectInfo.key,
          description: projectInfo.description,
          status: "ACTIVE",
          createdBy: adminUser.id,
          teamId: randomTeam.id,
          startDate: new Date(),
          targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
        });
        
        createdProjects.push(project);
        log(`Created project: ${project.name}`);

        // Create epics for this project
        const epicTemplatesForProject = epicTemplates[i];
        for (const epicTemplate of epicTemplatesForProject) {
          const randomAssignee = createdUsers[Math.floor(Math.random() * createdUsers.length)];
          
          const epic = await storage.createWorkItem({
            title: epicTemplate.title,
            description: epicTemplate.description,
            type: "EPIC",
            status: "IN_PROGRESS",
            priority: "HIGH",
            projectId: project.id,
            parentId: null,
            assigneeId: randomAssignee.id,
            reporterId: adminUser.id,
            estimate: 40,
            startDate: new Date(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
            externalId: `${project.key}-E${i + 1}${epicTemplatesForProject.indexOf(epicTemplate) + 1}`
          });
          
          log(`Created epic: ${epic.title}`);
          
          // Create features for this epic
          const featureIndex = epicTemplatesForProject.indexOf(epicTemplate) % featureTemplates.length;
          const featureTemplatesForEpic = featureTemplates[featureIndex];
          
          for (const featureTemplate of featureTemplatesForEpic) {
            const randomAssignee = createdUsers[Math.floor(Math.random() * createdUsers.length)];
            
            const feature = await storage.createWorkItem({
              title: featureTemplate.title,
              description: featureTemplate.description,
              type: "FEATURE",
              status: "TODO",
              priority: "MEDIUM",
              projectId: project.id,
              parentId: epic.id,
              assigneeId: randomAssignee.id,
              reporterId: adminUser.id,
              estimate: 20,
              externalId: `${project.key}-F${i + 1}${featureTemplatesForEpic.indexOf(featureTemplate) + 1}`
            });
            
            log(`Created feature: ${feature.title}`);
            
            // Create stories for each feature
            for (let j = 0; j < 3; j++) {
              const storyTemplate = storyTemplates[j % storyTemplates.length];
              const randomAssignee = createdUsers[Math.floor(Math.random() * createdUsers.length)];
              
              const story = await storage.createWorkItem({
                title: `${featureTemplate.title} ${storyTemplate.title}`,
                description: storyTemplate.description,
                type: "STORY",
                status: "TODO",
                priority: "MEDIUM",
                projectId: project.id,
                parentId: feature.id,
                assigneeId: randomAssignee.id,
                reporterId: adminUser.id,
                estimate: 8,
                externalId: `${project.key}-S${i + 1}${j + 1}`
              });
              
              // Create tasks for this story (3-4 tasks per story)
              const numTasks = Math.floor(Math.random() * 2) + 3; // 3-4 tasks
              for (let k = 0; k < numTasks; k++) {
                const taskTemplate = taskTemplates[k % taskTemplates.length];
                const randomAssignee = createdUsers[Math.floor(Math.random() * createdUsers.length)];
                
                await storage.createWorkItem({
                  title: `${taskTemplate.title} for ${storyTemplate.title}`,
                  description: taskTemplate.description,
                  type: "TASK",
                  status: "TODO",
                  priority: "MEDIUM",
                  projectId: project.id,
                  parentId: story.id,
                  assigneeId: randomAssignee.id,
                  reporterId: adminUser.id,
                  estimate: 4,
                  externalId: `${project.key}-T${i + 1}${j + 1}${k + 1}`
                });
              }
              
              // Create 1-2 bugs for some stories (30% chance)
              if (Math.random() < 0.3) {
                const numBugs = Math.floor(Math.random() * 2) + 1; // 1-2 bugs
                for (let k = 0; k < numBugs; k++) {
                  const bugTemplate = bugTemplates[Math.floor(Math.random() * bugTemplates.length)];
                  const randomAssignee = createdUsers[Math.floor(Math.random() * createdUsers.length)];
                  
                  await storage.createWorkItem({
                    title: bugTemplate.title,
                    description: bugTemplate.description,
                    type: "BUG",
                    status: "TODO",
                    priority: "HIGH",
                    projectId: project.id,
                    parentId: story.id,
                    assigneeId: randomAssignee.id,
                    reporterId: adminUser.id,
                    estimate: 3,
                    externalId: `${project.key}-B${i + 1}${j + 1}${k + 1}`
                  });
                }
              }
            }
          }
        }
      } catch (error) {
        console.error(`Error creating project ${projectData[i].name}:`, error);
      }
    }

    log("Sample data generation completed successfully");
    
  } catch (error) {
    console.error("Error generating sample data:", error);
  }
}

/**
 * Additional realistic work item templates for different projects
 */
const additionalWorkItemTemplates = {
  epics: [
    // Project Management Tool epics
    { title: "Reporting and Analytics", description: "Comprehensive reporting and analytics capabilities" },
    { title: "Integration Framework", description: "Framework for integration with external systems and tools" },
    { title: "Resource Management", description: "Tools and features for effective resource management" },
    
    // Customer Portal epics
    { title: "Customer Support Module", description: "Integrated customer support and ticketing functionality" },
    { title: "User Profile Enhancement", description: "Enhanced user profiles with preferences and history" },
    { title: "Document Management", description: "Document upload, management, and sharing capabilities" },
    
    // Mobile App epics
    { title: "Media Sharing", description: "Rich media sharing and processing features" },
    { title: "Social Features", description: "Social networking capabilities and friend connections" },
    { title: "Location Services", description: "GPS and location-based services integration" },
    
    // Infrastructure epics
    { title: "Disaster Recovery", description: "Comprehensive disaster recovery and business continuity" },
    { title: "Security Infrastructure", description: "Enhanced security measures and compliance capabilities" },
    { title: "Performance Optimization", description: "System-wide performance enhancements and optimizations" }
  ],
  
  features: [
    // Reporting features
    { title: "Custom Report Builder", description: "Interface for creating custom reports with data visualization" },
    { title: "Scheduled Reports", description: "Capability to schedule automated report generation and delivery" },
    { title: "Data Export Options", description: "Multiple export formats for reports and raw data" },
    
    // Integration features
    { title: "REST API Framework", description: "Comprehensive REST API for external integrations" },
    { title: "Webhook Support", description: "Webhook system for real-time event notifications" },
    { title: "Third-party OAuth", description: "Integration with third-party OAuth providers" },
    
    // Resource Management features
    { title: "Resource Allocation", description: "Tools for allocating and tracking resources across projects" },
    { title: "Capacity Planning", description: "Capacity planning and forecasting tools" },
    { title: "Time Tracking", description: "Time tracking and reporting capabilities" },
    
    // Customer Support features
    { title: "Ticket System", description: "Support ticket creation and management" },
    { title: "Knowledge Base", description: "Searchable knowledge base for customer self-service" },
    { title: "Live Chat", description: "Integrated live chat support capabilities" },
    
    // User Profile features
    { title: "Activity History", description: "Comprehensive user activity history and timeline" },
    { title: "Preference Management", description: "User preference and settings management" },
    { title: "Subscription Management", description: "User subscription and notification preferences" },
    
    // Document Management features
    { title: "Document Upload", description: "Secure document upload with metadata" },
    { title: "Version Control", description: "Document version control and history" },
    { title: "Document Sharing", description: "Secure document sharing with permission control" },
    
    // Media Sharing features
    { title: "Photo Library", description: "Photo management with albums and tagging" },
    { title: "Video Processing", description: "Video upload and streaming capabilities" },
    { title: "Media Comments", description: "Commenting and interaction features for media items" },
    
    // Social features
    { title: "User Connections", description: "Friend/connection management system" },
    { title: "Activity Feed", description: "Social activity feed with customization options" },
    { title: "Messaging System", description: "Private messaging between users" },
    
    // Location features
    { title: "Location Tracking", description: "Real-time location tracking and history" },
    { title: "Geofencing", description: "Geofence creation and event triggering" },
    { title: "Location Sharing", description: "Temporary location sharing with other users" },
    
    // Disaster Recovery features
    { title: "Backup System", description: "Automated backup system with multiple storage options" },
    { title: "Recovery Procedures", description: "Streamlined recovery procedures and testing" },
    { title: "High Availability", description: "High availability infrastructure setup" },
    
    // Security features
    { title: "Advanced Authentication", description: "Multi-factor and biometric authentication options" },
    { title: "Audit Logging", description: "Comprehensive audit logging system" },
    { title: "Compliance Reports", description: "Automated compliance reporting and certification" },
    
    // Performance features
    { title: "Caching System", description: "Intelligent caching for performance optimization" },
    { title: "Load Balancing", description: "Advanced load balancing for high traffic scenarios" },
    { title: "Database Optimization", description: "Database query optimization and index management" }
  ],
  
  stories: [
    { title: "User Interface Implementation", description: "Implement the user interface design for this feature" },
    { title: "Backend Service Development", description: "Develop backend services to support this feature" },
    { title: "API Documentation", description: "Create detailed API documentation for developers" },
    { title: "Database Schema Enhancement", description: "Enhance database schema to support this feature" },
    { title: "Security Review", description: "Complete security review and implement recommendations" },
    { title: "Mobile Responsiveness", description: "Ensure feature works well on all mobile devices" },
    { title: "Performance Testing", description: "Conduct performance testing and optimization" },
    { title: "User Acceptance Testing", description: "Coordinate user acceptance testing process" },
    { title: "Cross-browser Compatibility", description: "Ensure compatibility across major browsers" },
    { title: "Integration Testing", description: "Test integration with other system components" },
    { title: "Automated Test Development", description: "Develop automated tests for this feature" },
    { title: "Documentation Update", description: "Update user and technical documentation" }
  ],
  
  tasks: [
    { title: "Design wireframes", description: "Create detailed wireframes for UI components" },
    { title: "Implement frontend components", description: "Develop and style necessary UI components" },
    { title: "Create database migrations", description: "Write and test database migration scripts" },
    { title: "Write API endpoints", description: "Implement API endpoints following REST best practices" },
    { title: "Implement authentication logic", description: "Add proper authentication and authorization" },
    { title: "Create validation logic", description: "Implement input validation and error handling" },
    { title: "Write unit tests", description: "Create comprehensive unit tests for code coverage" },
    { title: "Implement integration tests", description: "Write end-to-end and integration tests" },
    { title: "Optimize database queries", description: "Review and optimize database queries for performance" },
    { title: "Add error handling", description: "Implement proper error handling and logging" },
    { title: "Perform code review", description: "Complete code review and address feedback" },
    { title: "Set up monitoring", description: "Configure monitoring and alerting for new feature" },
    { title: "Create user documentation", description: "Write user-facing documentation and help content" },
    { title: "Implement logging", description: "Add appropriate logging for tracking and debugging" },
    { title: "Review accessibility", description: "Ensure UI meets accessibility standards" },
    { title: "Setup feature flags", description: "Implement feature flags for controlled rollout" },
    { title: "Create demo script", description: "Prepare demonstration script for stakeholders" },
    { title: "Performance profiling", description: "Identify and fix performance bottlenecks" },
    { title: "Security testing", description: "Perform security testing and vulnerability assessment" },
    { title: "Cross-browser testing", description: "Test functionality across different browsers" }
  ],
  
  bugs: [
    { title: "Form submission fails with special characters", description: "Users cannot submit forms containing special characters in text fields" },
    { title: "Session timeout occurs too quickly", description: "Users are being logged out after only a few minutes of inactivity" },
    { title: "Data not refreshing automatically", description: "Updated data doesn't appear until page refresh" },
    { title: "Error when uploading large files", description: "System errors when uploading files larger than 10MB" },
    { title: "Mobile menu not working on iOS", description: "Navigation menu doesn't open correctly on iOS devices" },
    { title: "Export feature generates corrupted files", description: "PDF exports are sometimes corrupted with certain data" },
    { title: "Search results missing recent items", description: "Recently added items do not appear in search results" },
    { title: "Date filters not respecting timezone", description: "Date filtering shows incorrect results due to timezone issues" },
    { title: "Password reset emails not received", description: "Some users report not receiving password reset emails" },
    { title: "High CPU usage during PDF generation", description: "Server experiences high CPU spikes during PDF exports" },
    { title: "UI breaks at specific viewport widths", description: "Layout issues appear between 768px and 992px screen widths" },
    { title: "Permission denied error for valid users", description: "Some users with correct permissions see access denied" },
    { title: "Drag and drop not working in Firefox", description: "Drag and drop functionality fails specifically in Firefox" },
    { title: "Notifications show incorrect counts", description: "Notification badge shows wrong number of unread items" },
    { title: "Report totals calculating incorrectly", description: "Summary totals in reports don't match detailed line items" }
  ]
};

/**
 * Generate additional 150 realistic work items across all projects
 */
export async function generateAdditionalData() {
  try {
    // Get existing projects
    const projects = await storage.getProjects();
    if (projects.length === 0) {
      log("No projects found for adding additional data");
      return;
    }

    // Get existing users for assignments
    const users = await storage.getUsers();
    if (users.length === 0) {
      log("No users found for assignments");
      return;
    }
    
    // Admin user for reporting
    const adminUser = users[0];
    
    log("Generating additional 150 work items across projects...");
    
    // We'll distribute the 150 items across all projects
    // with a mix of epics, features, stories, tasks, and bugs
    const itemsPerProject = Math.floor(150 / projects.length);
    let totalItemsCreated = 0;
    
    // Status options for variety
    const statusOptions = ["TODO", "IN_PROGRESS", "DONE"];
    const priorityOptions = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
    
    // Distribution percentages (rough guidelines)
    // 5% Epics, 15% Features, 30% Stories, 35% Tasks, 15% Bugs
    
    for (const project of projects) {
      // Track items created for this project
      let projectItemsCreated = 0;
      
      // Create 1-2 new epics per project
      const numEpics = Math.min(2, Math.ceil(itemsPerProject * 0.05));
      
      for (let e = 0; e < numEpics && totalItemsCreated < 150; e++) {
        // Get a random epic template
        const epicTemplate = additionalWorkItemTemplates.epics[Math.floor(Math.random() * additionalWorkItemTemplates.epics.length)];
        const randomAssignee = users[Math.floor(Math.random() * users.length)];
        const epicStatus = statusOptions[Math.floor(Math.random() * statusOptions.length)];
        
        // Create a unique external ID
        const epicExternalId = `${project.key}-E${Date.now().toString().slice(-4)}-${e + 1}`;
        
        // Create the epic
        const epic = await storage.createWorkItem({
          title: epicTemplate.title,
          description: epicTemplate.description,
          type: "EPIC",
          status: epicStatus,
          priority: priorityOptions[Math.floor(Math.random() * priorityOptions.length)],
          projectId: project.id,
          parentId: null,
          assigneeId: randomAssignee.id,
          reporterId: adminUser.id,
          estimate: 30 + Math.floor(Math.random() * 30), // 30-60 hours
          startDate: new Date(),
          endDate: new Date(Date.now() + (30 + Math.floor(Math.random() * 60)) * 24 * 60 * 60 * 1000), // 30-90 days
          externalId: epicExternalId
        });
        
        totalItemsCreated++;
        projectItemsCreated++;
        
        // Create 3-5 features per epic (15% of total items)
        const numFeatures = Math.min(5, Math.ceil((itemsPerProject * 0.15) / numEpics));
        
        for (let f = 0; f < numFeatures && totalItemsCreated < 150; f++) {
          // Get a random feature template
          const featureTemplate = additionalWorkItemTemplates.features[Math.floor(Math.random() * additionalWorkItemTemplates.features.length)];
          const randomAssignee = users[Math.floor(Math.random() * users.length)];
          const featureStatus = statusOptions[Math.floor(Math.random() * statusOptions.length)];
          
          // Create a unique external ID
          const featureExternalId = `${project.key}-F${Date.now().toString().slice(-4)}-${f + 1}`;
          
          // Create the feature
          const feature = await storage.createWorkItem({
            title: featureTemplate.title,
            description: featureTemplate.description,
            type: "FEATURE",
            status: featureStatus,
            priority: priorityOptions[Math.floor(Math.random() * priorityOptions.length)],
            projectId: project.id,
            parentId: epic.id,
            assigneeId: randomAssignee.id,
            reporterId: adminUser.id,
            estimate: 15 + Math.floor(Math.random() * 16), // 15-30 hours
            startDate: epicStatus === "TODO" ? null : new Date(),
            endDate: epicStatus === "DONE" ? new Date() : null,
            externalId: featureExternalId
          });
          
          totalItemsCreated++;
          projectItemsCreated++;
          
          // Create 4-6 stories per feature (30% of total items)
          const numStories = Math.min(6, Math.ceil((itemsPerProject * 0.3) / (numEpics * numFeatures)));
          
          for (let s = 0; s < numStories && totalItemsCreated < 150; s++) {
            // Get a random story template
            const storyTemplate = additionalWorkItemTemplates.stories[Math.floor(Math.random() * additionalWorkItemTemplates.stories.length)];
            const randomAssignee = users[Math.floor(Math.random() * users.length)];
            const storyStatus = featureStatus === "TODO" ? "TODO" : 
                               featureStatus === "DONE" ? "DONE" : 
                               statusOptions[Math.floor(Math.random() * statusOptions.length)];
            
            // Create a unique external ID
            const storyExternalId = `${project.key}-S${Date.now().toString().slice(-4)}-${s + 1}`;
            
            // Create the story
            const story = await storage.createWorkItem({
              title: `${featureTemplate.title} - ${storyTemplate.title}`,
              description: storyTemplate.description,
              type: "STORY",
              status: storyStatus,
              priority: priorityOptions[Math.floor(Math.random() * priorityOptions.length)],
              projectId: project.id,
              parentId: feature.id,
              assigneeId: randomAssignee.id,
              reporterId: adminUser.id,
              estimate: 5 + Math.floor(Math.random() * 6), // 5-10 hours
              externalId: storyExternalId
            });
            
            totalItemsCreated++;
            projectItemsCreated++;
            
            // Create 2-4 tasks per story (35% of total items)
            const numTasks = Math.min(4, Math.ceil((itemsPerProject * 0.35) / (numEpics * numFeatures * numStories)));
            
            for (let t = 0; t < numTasks && totalItemsCreated < 150; t++) {
              // Get a random task template
              const taskTemplate = additionalWorkItemTemplates.tasks[Math.floor(Math.random() * additionalWorkItemTemplates.tasks.length)];
              const randomAssignee = users[Math.floor(Math.random() * users.length)];
              const taskStatus = storyStatus === "TODO" ? "TODO" : 
                               storyStatus === "DONE" ? "DONE" : 
                               statusOptions[Math.floor(Math.random() * statusOptions.length)];
              
              // Create a unique external ID
              const taskExternalId = `${project.key}-T${Date.now().toString().slice(-4)}-${t + 1}`;
              
              // Create the task
              await storage.createWorkItem({
                title: `${taskTemplate.title} for ${storyTemplate.title}`,
                description: taskTemplate.description,
                type: "TASK",
                status: taskStatus,
                priority: priorityOptions[Math.floor(Math.random() * priorityOptions.length)],
                projectId: project.id,
                parentId: story.id,
                assigneeId: randomAssignee.id,
                reporterId: adminUser.id,
                estimate: 1 + Math.floor(Math.random() * 5), // 1-5 hours
                externalId: taskExternalId
              });
              
              totalItemsCreated++;
              projectItemsCreated++;
            }
            
            // Maybe create 1-2 bugs per story (15% of total items, 50% chance per story)
            if (Math.random() < 0.5) {
              const numBugs = Math.min(2, Math.ceil((itemsPerProject * 0.15) / (numEpics * numFeatures * numStories * 0.5)));
              
              for (let b = 0; b < numBugs && totalItemsCreated < 150; b++) {
                // Get a random bug template
                const bugTemplate = additionalWorkItemTemplates.bugs[Math.floor(Math.random() * additionalWorkItemTemplates.bugs.length)];
                const randomAssignee = users[Math.floor(Math.random() * users.length)];
                
                // Bugs can be in various states regardless of parent
                const bugStatus = statusOptions[Math.floor(Math.random() * statusOptions.length)];
                
                // Create a unique external ID
                const bugExternalId = `${project.key}-B${Date.now().toString().slice(-4)}-${b + 1}`;
                
                // Create the bug
                await storage.createWorkItem({
                  title: bugTemplate.title,
                  description: bugTemplate.description,
                  type: "BUG",
                  status: bugStatus,
                  priority: priorityOptions[Math.floor(Math.random() * 3) + 1], // Bugs tend to be MEDIUM-CRITICAL
                  projectId: project.id,
                  parentId: story.id,
                  assigneeId: randomAssignee.id,
                  reporterId: adminUser.id,
                  estimate: 1 + Math.floor(Math.random() * 4), // 1-4 hours
                  externalId: bugExternalId
                });
                
                totalItemsCreated++;
                projectItemsCreated++;
              }
            }
            
            // Break if we've reached our target
            if (totalItemsCreated >= 150) break;
          }
          
          // Break if we've reached our target
          if (totalItemsCreated >= 150) break;
        }
        
        // Break if we've reached our target
        if (totalItemsCreated >= 150) break;
      }
      
      log(`Created ${projectItemsCreated} items for project: ${project.name}`);
      
      // Break if we've reached our target
      if (totalItemsCreated >= 150) break;
    }
    
    log(`Successfully generated ${totalItemsCreated} additional work items across ${projects.length} projects`);
    
  } catch (error) {
    console.error("Error generating additional data:", error);
  }
}