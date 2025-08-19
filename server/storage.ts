import { 
  users, type User, type InsertUser,
  teams, type Team, type InsertTeam,
  teamMembers, type TeamMember, type InsertTeamMember,
  projects, type Project, type InsertProject,
  workItems, type WorkItem, type InsertWorkItem 
} from "@shared/schema";

function generateExternalId(type: string, currentId: number): string {
  const prefix = type === 'EPIC' ? 'EP' : 
                type === 'FEATURE' ? 'FT' : 
                type === 'STORY' ? 'ST' : 
                type === 'TASK' ? 'TSK' : 
                'BUG';
  
  // Pad with zeros for a 3-digit ID
  return `${prefix}-${String(currentId).padStart(3, '0')}`;
}

export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getUsers(): Promise<User[]>;
  
  // Team management
  createTeam(team: InsertTeam): Promise<Team>;
  getTeam(id: number): Promise<Team | undefined>;
  getTeams(): Promise<Team[]>;
  getTeamsByUser(userId: number): Promise<Team[]>;
  
  // Team members
  addTeamMember(teamMember: InsertTeamMember): Promise<TeamMember>;
  getTeamMembers(teamId: number): Promise<TeamMember[]>;
  removeTeamMember(teamId: number, userId: number): Promise<boolean>;
  
  // Project management
  createProject(project: InsertProject): Promise<Project>;
  getProject(id: number): Promise<Project | undefined>;
  getProjects(): Promise<Project[]>;
  getProjectsByTeam(teamId: number): Promise<Project[]>;
  updateProject(id: number, updates: Partial<Project>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<boolean>;
  
  // Work items management (Epics, Features, Stories, Tasks, Bugs)
  createWorkItem(workItem: InsertWorkItem): Promise<WorkItem>;
  getWorkItem(id: number): Promise<WorkItem | undefined>;
  getWorkItemsByProject(projectId: number): Promise<WorkItem[]>;
  getWorkItemsByParent(parentId: number): Promise<WorkItem[]>;
  updateWorkItemStatus(id: number, status: string): Promise<WorkItem | undefined>;
  updateWorkItem(id: number, workItem: Partial<WorkItem>): Promise<WorkItem | undefined>;
  deleteWorkItem(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private teams: Map<number, Team>;
  private teamMembers: Map<number, TeamMember>;
  private projects: Map<number, Project>;
  private workItems: Map<number, WorkItem>;
  
  private userId: number;
  private teamId: number;
  private teamMemberId: number;
  private projectId: number;
  private workItemId: number;
  
  constructor() {
    this.users = new Map();
    this.teams = new Map();
    this.teamMembers = new Map();
    this.projects = new Map();
    this.workItems = new Map();
    
    this.userId = 1;
    this.teamId = 1;
    this.teamMemberId = 1;
    this.projectId = 1;
    this.workItemId = 1;
  }
  
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }
  
  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email
    );
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username
    );
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userId++;
    const user: User = { ...insertUser, id, createdAt: new Date() };
    this.users.set(id, user);
    return user;
  }
  
  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
  
  // Team methods
  async createTeam(insertTeam: InsertTeam): Promise<Team> {
    const id = this.teamId++;
    const team: Team = { ...insertTeam, id, createdAt: new Date() };
    this.teams.set(id, team);
    return team;
  }
  
  async getTeam(id: number): Promise<Team | undefined> {
    return this.teams.get(id);
  }
  
  async getTeams(): Promise<Team[]> {
    return Array.from(this.teams.values());
  }
  
  async getTeamsByUser(userId: number): Promise<Team[]> {
    const memberTeamIds = Array.from(this.teamMembers.values())
      .filter(tm => tm.userId === userId)
      .map(tm => tm.teamId);
    
    return Array.from(this.teams.values())
      .filter(team => memberTeamIds.includes(team.id));
  }
  
  // Team member methods
  async addTeamMember(insertTeamMember: InsertTeamMember): Promise<TeamMember> {
    const id = this.teamMemberId++;
    const teamMember: TeamMember = { ...insertTeamMember, id, joinedAt: new Date() };
    this.teamMembers.set(id, teamMember);
    return teamMember;
  }
  
  async getTeamMembers(teamId: number): Promise<TeamMember[]> {
    return Array.from(this.teamMembers.values())
      .filter(tm => tm.teamId === teamId);
  }
  
  async removeTeamMember(teamId: number, userId: number): Promise<boolean> {
    const teamMember = Array.from(this.teamMembers.values())
      .find(tm => tm.teamId === teamId && tm.userId === userId);
    
    if (teamMember) {
      this.teamMembers.delete(teamMember.id);
      return true;
    }
    return false;
  }
  
  // Project methods
  async createProject(insertProject: InsertProject): Promise<Project> {
    const id = this.projectId++;
    const project: Project = { ...insertProject, id, createdAt: new Date() };
    this.projects.set(id, project);
    return project;
  }
  
  async getProject(id: number): Promise<Project | undefined> {
    return this.projects.get(id);
  }
  
  async getProjects(): Promise<Project[]> {
    return Array.from(this.projects.values());
  }
  
  async getProjectsByTeam(teamId: number): Promise<Project[]> {
    return Array.from(this.projects.values())
      .filter(project => project.teamId === teamId);
  }
  
  async updateProject(id: number, updates: Partial<Project>): Promise<Project | undefined> {
    const project = this.projects.get(id);
    if (!project) return undefined;
    
    const updatedProject = {
      ...project,
      ...updates,
      updatedAt: new Date()
    };
    
    this.projects.set(id, updatedProject);
    return updatedProject;
  }
  
  async deleteProject(id: number): Promise<boolean> {
    return this.projects.delete(id);
  }
  
  // Work item methods
  async createWorkItem(insertWorkItem: InsertWorkItem): Promise<WorkItem> {
    const id = this.workItemId++;
    
    // Generate external ID based on type (EP-001, FT-001, etc.)
    const externalId = insertWorkItem.externalId || 
                      generateExternalId(insertWorkItem.type, id);
    
    const workItem: WorkItem = { 
      ...insertWorkItem, 
      id, 
      externalId, 
      createdAt: new Date(), 
      updatedAt: new Date() 
    };
    
    this.workItems.set(id, workItem);
    return workItem;
  }
  
  async getWorkItem(id: number): Promise<WorkItem | undefined> {
    return this.workItems.get(id);
  }
  
  async getWorkItemsByProject(projectId: number): Promise<WorkItem[]> {
    return Array.from(this.workItems.values())
      .filter(item => item.projectId === projectId);
  }
  
  async getWorkItemsByParent(parentId: number): Promise<WorkItem[]> {
    return Array.from(this.workItems.values())
      .filter(item => item.parentId === parentId);
  }
  
  async updateWorkItemStatus(id: number, status: string): Promise<WorkItem | undefined> {
    const workItem = this.workItems.get(id);
    
    if (workItem) {
      const updatedItem = { 
        ...workItem, 
        status, 
        updatedAt: new Date() 
      };
      this.workItems.set(id, updatedItem);
      return updatedItem;
    }
    
    return undefined;
  }
  
  async updateWorkItem(id: number, updates: Partial<WorkItem>): Promise<WorkItem | undefined> {
    const workItem = this.workItems.get(id);
    
    if (workItem) {
      const updatedItem = { 
        ...workItem, 
        ...updates, 
        updatedAt: new Date() 
      };
      this.workItems.set(id, updatedItem);
      return updatedItem;
    }
    
    return undefined;
  }
  
  async deleteWorkItem(id: number): Promise<boolean> {
    return this.workItems.delete(id);
  }
}

import { DatabaseStorage } from './DatabaseStorage';

// Use DatabaseStorage for persistent database storage
export const storage = new DatabaseStorage();
