import { log } from "./vite";
import { InsertWorkItem } from "@shared/schema";
import { storage } from "./storage";

/**
 * Generate random work items with unique IDs
 */
export async function generateRandomWorkItems(count: number = 150) {
  try {
    log(`Generating ${count} random work items...`);
    
    // Get existing projects and users
    const projects = await storage.getProjects();
    if (projects.length === 0) {
      log("No projects found. Please run data generation first.");
      return false;
    }
    
    const users = await storage.getUsers();
    if (users.length === 0) {
      log("No users found. Please run data generation first.");
      return false;
    }
    
    const adminUser = users.find(u => u.username === "admin") || users[0];
    
    // Create a timestamp-based unique suffix for IDs
    const uniqueTimestamp = Date.now().toString().slice(-8);
    
    // Templates for various item types
    const workItemTemplates = {
      epics: [
        { title: "Platform Integration", description: "Comprehensive integration with third-party platforms" },
        { title: "Performance Optimization", description: "System-wide performance improvements" },
        { title: "Mobile Experience", description: "Enhanced mobile user experience and capabilities" },
        { title: "Analytics Dashboard", description: "Advanced analytics and reporting dashboard" },
        { title: "Compliance Framework", description: "Regulatory compliance and audit framework" }
      ],
      features: [
        { title: "OAuth Integration", description: "Single sign-on with popular OAuth providers" },
        { title: "Real-time Notifications", description: "Push notification system for instant updates" },
        { title: "Data Visualization", description: "Interactive charts and graphs for data visualization" },
        { title: "Offline Mode", description: "Offline capability with data synchronization" },
        { title: "Bulk Operations", description: "Efficient bulk data processing capabilities" },
        { title: "Export Functionality", description: "Data export in multiple formats" },
        { title: "Advanced Filtering", description: "Complex data filtering and search capabilities" },
        { title: "User Permissions", description: "Granular user permission system" }
      ],
      stories: [
        { title: "User Registration Flow", description: "Streamlined user registration process" },
        { title: "Dashboard Widgets", description: "Customizable dashboard widget implementation" },
        { title: "Email Templates", description: "Configurable email notification templates" },
        { title: "Search Autocomplete", description: "Intelligent search with autocomplete suggestions" },
        { title: "Data Import Wizard", description: "Step-by-step data import assistant" },
        { title: "Profile Management", description: "User profile settings and management" },
        { title: "Notification Preferences", description: "User notification preference controls" }
      ],
      tasks: [
        { title: "Implement API Endpoint", description: "Create RESTful API endpoint for data access" },
        { title: "Create Database Schema", description: "Design and implement database schema" },
        { title: "Write Unit Tests", description: "Develop comprehensive unit test suite" },
        { title: "Design UI Components", description: "Create reusable UI component library" },
        { title: "Setup Authentication", description: "Implement secure authentication flow" },
        { title: "Optimize Query Performance", description: "Improve database query performance" },
        { title: "Add Validation Rules", description: "Implement data validation logic" },
        { title: "Create Documentation", description: "Produce user and technical documentation" }
      ],
      bugs: [
        { title: "UI Rendering Issue", description: "Interface elements not rendering correctly" },
        { title: "Data Loading Error", description: "Error when loading data from API" },
        { title: "Validation Failure", description: "Form validation not working as expected" },
        { title: "Performance Degradation", description: "System performance issues under load" },
        { title: "Authentication Error", description: "Users unable to authenticate properly" },
        { title: "Calculation Error", description: "Incorrect calculation results" },
        { title: "Mobile Layout Issue", description: "Layout problems on mobile devices" }
      ]
    };
    
    // Status and priority options for variation
    const statuses = ["TODO", "IN_PROGRESS", "DONE"];
    const priorities = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
    
    // Track total created items
    let createdCount = 0;
    
    // Process each project
    for (const project of projects) {
      // Limit items per project
      const itemsForProject = Math.floor(count / projects.length);
      let projectItemCount = 0;
      
      log(`Creating items for project: ${project.name}`);
      
      // Get existing epics for this project
      const projectItems = await storage.getWorkItemsByProject(project.id);
      const epics = projectItems.filter(item => item.type === "EPIC");
      
      // If no epics exist, create some
      if (epics.length === 0) {
        // Create 1-2 epics
        const epicCount = Math.min(2, itemsForProject);
        for (let i = 0; i < epicCount && projectItemCount < itemsForProject; i++) {
          const template = workItemTemplates.epics[Math.floor(Math.random() * workItemTemplates.epics.length)];
          const assignee = users[Math.floor(Math.random() * users.length)];
          
          const uniqueId = `${uniqueTimestamp}-${project.id}-${createdCount}`;
          
          const epic = await storage.createWorkItem({
            title: template.title,
            description: template.description,
            type: "EPIC",
            status: statuses[Math.floor(Math.random() * statuses.length)],
            priority: priorities[Math.floor(Math.random() * priorities.length)],
            projectId: project.id,
            parentId: null,
            assigneeId: assignee.id,
            reporterId: adminUser.id,
            estimate: 40,
            externalId: `${project.key}-E${uniqueId}`
          });
          
          projectItemCount++;
          createdCount++;
          
          // Create a reference object for projectItemCount to pass by reference
          const projectItemCountRef = { count: projectItemCount };
          
          // Add features to this epic
          await createChildItems(project, epic, "FEATURE", 2, 4, projectItemCountRef, itemsForProject);
          
          // Update the actual projectItemCount from the reference
          projectItemCount = projectItemCountRef.count;
        }
      } else {
        // Use existing epics to add more items
        for (const epic of epics) {
          if (projectItemCount >= itemsForProject) break;
          
          // Get features under this epic
          const features = projectItems.filter(item => 
            item.type === "FEATURE" && item.parentId === epic.id
          );
          
          if (features.length === 0) {
            // Add new features
            const projectItemCountRef = { count: projectItemCount };
            await createChildItems(project, epic, "FEATURE", 2, 3, projectItemCountRef, itemsForProject);
            projectItemCount = projectItemCountRef.count;
          } else {
            // Add items to existing features
            for (const feature of features) {
              if (projectItemCount >= itemsForProject) break;
              
              // Get stories under this feature
              const stories = projectItems.filter(item => 
                item.type === "STORY" && item.parentId === feature.id
              );
              
              if (stories.length === 0) {
                // Add new stories
                const projectItemCountRef = { count: projectItemCount };
                await createChildItems(project, feature, "STORY", 2, 3, projectItemCountRef, itemsForProject);
                projectItemCount = projectItemCountRef.count;
              } else {
                // Add tasks and bugs to existing stories
                for (const story of stories) {
                  if (projectItemCount >= itemsForProject) break;
                  
                  if (Math.random() < 0.7) {
                    // Add tasks
                    const projectItemCountRef = { count: projectItemCount };
                    await createChildItems(project, story, "TASK", 1, 2, projectItemCountRef, itemsForProject);
                    projectItemCount = projectItemCountRef.count;
                  } else {
                    // Add bugs
                    const projectItemCountRef = { count: projectItemCount };
                    await createChildItems(project, story, "BUG", 1, 1, projectItemCountRef, itemsForProject);
                    projectItemCount = projectItemCountRef.count;
                  }
                }
              }
            }
          }
        }
      }
      
      log(`Created ${projectItemCount} items for project ${project.name}`);
    }
    
    log(`Successfully generated ${createdCount} random work items`);
    return true;
    
    // Helper function to create child items
    async function createChildItems(
      projectObj: any, 
      parent: any, 
      type: string, 
      min: number, 
      max: number,
      projectItemCountRef: { count: number },
      maxItemsForProject: number
    ) {
      const itemCount = Math.floor(Math.random() * (max - min + 1)) + min;
      let templates;
      let estimateValue;
      
      switch (type) {
        case "FEATURE":
          templates = workItemTemplates.features;
          estimateValue = 20;
          break;
        case "STORY":
          templates = workItemTemplates.stories;
          estimateValue = 8;
          break;
        case "TASK":
          templates = workItemTemplates.tasks;
          estimateValue = 4;
          break;
        case "BUG":
          templates = workItemTemplates.bugs;
          estimateValue = 3;
          break;
        default:
          templates = workItemTemplates.tasks;
          estimateValue = 4;
      }
      
      for (let i = 0; i < itemCount && projectItemCountRef.count < maxItemsForProject; i++) {
        const template = templates[Math.floor(Math.random() * templates.length)];
        const assignee = users[Math.floor(Math.random() * users.length)];
        
        const typePrefix = type.charAt(0) + (type === "FEATURE" ? "F" : "");
        
        // Generate a shorter unique ID to stay within the varchar(20) limit
        const shortTimestamp = uniqueTimestamp.toString().slice(-4);
        const uniqueId = `${shortTimestamp}${projectObj.id}${createdCount}${i}`;
        
        const item = await storage.createWorkItem({
          title: template.title,
          description: template.description,
          type,
          status: statuses[Math.floor(Math.random() * statuses.length)],
          priority: priorities[Math.floor(Math.random() * priorities.length)],
          projectId: parent.projectId,
          parentId: parent.id,
          assigneeId: assignee.id,
          reporterId: adminUser.id,
          estimate: estimateValue,
          externalId: `${projectObj.key}-${typePrefix}${uniqueId}`
        });
        
        projectItemCountRef.count++;
        createdCount++;
        
        // If this is a feature or story, potentially add children
        if (type === "FEATURE" && Math.random() < 0.8) {
          await createChildItems(projectObj, item, "STORY", 1, 2, projectItemCountRef, maxItemsForProject);
        } else if (type === "STORY" && Math.random() < 0.7) {
          await createChildItems(projectObj, item, "TASK", 1, 2, projectItemCountRef, maxItemsForProject);
        }
      }
    }
    
  } catch (error) {
    log(`Error generating random work items: ${error}`);
    console.error(error);
    return false;
  }
}