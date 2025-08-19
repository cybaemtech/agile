import { pgTable, text, varchar, serial, integer, numeric, boolean, timestamp, pgEnum, uniqueIndex, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { relations } from "drizzle-orm";
import { z } from "zod";

// Status enum for work items
export const statusEnum = pgEnum('status', ['TODO', 'IN_PROGRESS', 'DONE']);

// Priority enum for work items
export const priorityEnum = pgEnum('priority', ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

// Type enum for work items
export const itemTypeEnum = pgEnum('item_type', ['EPIC', 'FEATURE', 'STORY', 'TASK', 'BUG']);

// Role enum for team members
export const roleEnum = pgEnum('role', ['ADMIN', 'MEMBER', 'VIEWER']);

// User role enum for system-wide permissions
export const userRoleEnum = pgEnum('user_role', ['ADMIN', 'SCRUM_MASTER', 'USER']);

// Project status enum
export const projectStatusEnum = pgEnum('project_status', ['PLANNING', 'ACTIVE', 'ARCHIVED', 'COMPLETED']);

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  email: varchar("email", { length: 100 }).notNull().unique(),
  fullName: varchar("full_name", { length: 100 }).notNull(),
  password: varchar("password", { length: 100 }).notNull(),
  avatarUrl: varchar("avatar_url", { length: 255 }),
  isActive: boolean("is_active").default(true).notNull(),
  role: userRoleEnum("user_role").notNull().default("USER"),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    emailIdx: uniqueIndex("user_email_idx").on(table.email),
    usernameIdx: uniqueIndex("user_username_idx").on(table.username),
  };
});

// Teams table
export const teams = pgTable("teams", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  createdBy: integer("created_by").notNull().references(() => users.id, { onDelete: 'set null' }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    nameIdx: index("team_name_idx").on(table.name),
    createdByIdx: index("team_created_by_idx").on(table.createdBy),
  };
});

// TeamMembers junction table
export const teamMembers = pgTable("team_members", {
  id: serial("id").primaryKey(),
  teamId: integer("team_id").notNull().references(() => teams.id, { onDelete: 'cascade' }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: roleEnum("role").notNull().default("MEMBER"),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    teamUserIdx: uniqueIndex("team_user_idx").on(table.teamId, table.userId),
    teamIdx: index("team_member_team_idx").on(table.teamId),
    userIdx: index("team_member_user_idx").on(table.userId),
  };
});

// Projects table
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 10 }).notNull().unique(), // Short project key for work item references (e.g., PROJ)
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  status: projectStatusEnum("status").notNull().default("ACTIVE"),
  createdBy: integer("created_by").notNull().references(() => users.id, { onDelete: 'set null' }),
  teamId: integer("team_id").references(() => teams.id, { onDelete: 'set null' }),
  startDate: timestamp("start_date"),
  targetDate: timestamp("target_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    nameIdx: index("project_name_idx").on(table.name),
    keyIdx: uniqueIndex("project_key_idx").on(table.key),
    teamIdx: index("project_team_idx").on(table.teamId),
    statusIdx: index("project_status_idx").on(table.status),
  };
});

// WorkItems table (for Epics, Features, Stories, Tasks, and Bugs)
export const workItems = pgTable("work_items", {
  id: serial("id").primaryKey(),
  externalId: varchar("external_id", { length: 20 }).notNull(), // e.g. PROJ-001, PROJ-002
  title: varchar("title", { length: 200 }).notNull(),
  description: text("description"),
  type: itemTypeEnum("type").notNull(), // EPIC, FEATURE, STORY, TASK, BUG
  status: statusEnum("status").notNull().default("TODO"), // TODO, IN_PROGRESS, DONE
  priority: priorityEnum("priority").default("MEDIUM"), // LOW, MEDIUM, HIGH, CRITICAL
  projectId: integer("project_id").notNull().references(() => projects.id, { onDelete: 'cascade' }),
  parentId: integer("parent_id").references(() => workItems.id, { onDelete: 'set null' }), // For hierarchy
  assigneeId: integer("assignee_id").references(() => users.id, { onDelete: 'set null' }), // Assigned to
  reporterId: integer("reporter_id").references(() => users.id, { onDelete: 'set null' }), // Created by
  estimate: numeric("estimate"), // Story points or hours as numeric for better querying
  startDate: timestamp("start_date"), // For timeline view
  endDate: timestamp("end_date"), // For timeline view
  completedAt: timestamp("completed_at"), // When item was marked as done
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    externalIdIdx: uniqueIndex("work_item_external_id_idx").on(table.externalId),
    projectIdx: index("work_item_project_idx").on(table.projectId),
    parentIdx: index("work_item_parent_idx").on(table.parentId),
    typeStatusIdx: index("work_item_type_status_idx").on(table.type, table.status),
    assigneeIdx: index("work_item_assignee_idx").on(table.assigneeId),
    reporterIdx: index("work_item_reporter_idx").on(table.reporterId),
  };
});

// Comments on work items
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  workItemId: integer("work_item_id").notNull().references(() => workItems.id, { onDelete: 'cascade' }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => {
  return {
    workItemIdx: index("comment_work_item_idx").on(table.workItemId),
    userIdx: index("comment_user_idx").on(table.userId),
  };
});

// WorkItem history/audit log
export const workItemHistory = pgTable("work_item_history", {
  id: serial("id").primaryKey(),
  workItemId: integer("work_item_id").notNull().references(() => workItems.id, { onDelete: 'cascade' }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  field: varchar("field", { length: 50 }).notNull(), // field that changed
  oldValue: text("old_value"),
  newValue: text("new_value"),
  changedAt: timestamp("changed_at").defaultNow().notNull(),
}, (table) => {
  return {
    workItemIdx: index("history_work_item_idx").on(table.workItemId),
    changedAtIdx: index("history_changed_at_idx").on(table.changedAt),
  };
});

// File attachments for work items
export const attachments = pgTable("attachments", {
  id: serial("id").primaryKey(),
  workItemId: integer("work_item_id").notNull().references(() => workItems.id, { onDelete: 'cascade' }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: 'cascade' }),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  fileSize: integer("file_size").notNull(),
  fileType: varchar("file_type", { length: 100 }).notNull(),
  filePath: varchar("file_path", { length: 255 }).notNull(),
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
}, (table) => {
  return {
    workItemIdx: index("attachment_work_item_idx").on(table.workItemId),
  };
});

// Define table relations
export const usersRelations = relations(users, ({ many }) => ({
  createdTeams: many(teams, { relationName: "userCreatedTeams" }),
  teamMemberships: many(teamMembers, { relationName: "userTeamMemberships" }),
  createdProjects: many(projects, { relationName: "userCreatedProjects" }),
  assignedWorkItems: many(workItems, { relationName: "userAssignedWorkItems" }),
  reportedWorkItems: many(workItems, { relationName: "userReportedWorkItems" }),
  comments: many(comments, { relationName: "userComments" }),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  creator: one(users, {
    fields: [teams.createdBy],
    references: [users.id],
    relationName: "userCreatedTeams",
  }),
  members: many(teamMembers, { relationName: "teamMembers" }),
  projects: many(projects, { relationName: "teamProjects" }),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
    relationName: "teamMembers",
  }),
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
    relationName: "userTeamMemberships",
  }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  creator: one(users, {
    fields: [projects.createdBy],
    references: [users.id],
    relationName: "userCreatedProjects",
  }),
  team: one(teams, {
    fields: [projects.teamId],
    references: [teams.id],
    relationName: "teamProjects",
  }),
  workItems: many(workItems, { relationName: "projectWorkItems" }),
}));

export const workItemsRelations = relations(workItems, ({ one, many }) => ({
  project: one(projects, {
    fields: [workItems.projectId],
    references: [projects.id],
    relationName: "projectWorkItems",
  }),
  parent: one(workItems, {
    fields: [workItems.parentId],
    references: [workItems.id],
    relationName: "childWorkItems",
  }),
  children: many(workItems, { relationName: "childWorkItems" }),
  assignee: one(users, {
    fields: [workItems.assigneeId],
    references: [users.id],
    relationName: "userAssignedWorkItems",
  }),
  reporter: one(users, {
    fields: [workItems.reporterId],
    references: [users.id],
    relationName: "userReportedWorkItems",
  }),
  comments: many(comments, { relationName: "workItemComments" }),
  history: many(workItemHistory, { relationName: "workItemHistory" }),
  attachments: many(attachments, { relationName: "workItemAttachments" }),
}));

export const commentsRelations = relations(comments, ({ one }) => ({
  workItem: one(workItems, {
    fields: [comments.workItemId],
    references: [workItems.id],
    relationName: "workItemComments",
  }),
  user: one(users, {
    fields: [comments.userId],
    references: [users.id],
    relationName: "userComments",
  }),
}));

export const workItemHistoryRelations = relations(workItemHistory, ({ one }) => ({
  workItem: one(workItems, {
    fields: [workItemHistory.workItemId],
    references: [workItems.id],
    relationName: "workItemHistory",
  }),
  user: one(users, {
    fields: [workItemHistory.userId],
    references: [users.id],
  }),
}));

export const attachmentsRelations = relations(attachments, ({ one }) => ({
  workItem: one(workItems, {
    fields: [attachments.workItemId],
    references: [workItems.id],
    relationName: "workItemAttachments",
  }),
  user: one(users, {
    fields: [attachments.userId],
    references: [users.id],
  }),
}));

// Define Zod schemas for insertion
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, updatedAt: true, lastLogin: true });
export const insertTeamSchema = createInsertSchema(teams).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTeamMemberSchema = createInsertSchema(teamMembers).omit({ id: true, joinedAt: true, updatedAt: true });
export const insertProjectSchema = createInsertSchema(projects).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  status: z.enum(['PLANNING', 'ACTIVE', 'ARCHIVED', 'COMPLETED']).default('ACTIVE')
});
export const insertWorkItemSchema = createInsertSchema(workItems).omit({ id: true, createdAt: true, updatedAt: true, completedAt: true });
export const insertCommentSchema = createInsertSchema(comments).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAttachmentSchema = createInsertSchema(attachments).omit({ id: true, uploadedAt: true });

// Email validation for corporate emails
export const emailSchema = z.string().email().refine(
  (email) => {
    const domain = email.split('@')[1];
    // Examples of personal email domains to reject
    const personalDomains = [
      'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 
      'aol.com', 'icloud.com', 'protonmail.com', 'mail.com'
    ];
    return !personalDomains.includes(domain);
  },
  { message: "Only corporate email addresses are allowed" }
);

// Extended schema with corporate email validation
export const insertUserWithValidationSchema = insertUserSchema.extend({
  email: emailSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

// Define types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Team = typeof teams.$inferSelect;
export type InsertTeam = z.infer<typeof insertTeamSchema>;
export type TeamMember = typeof teamMembers.$inferSelect;
export type InsertTeamMember = z.infer<typeof insertTeamMemberSchema>;
export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type WorkItem = typeof workItems.$inferSelect;
export type InsertWorkItem = z.infer<typeof insertWorkItemSchema>;
export type Comment = typeof comments.$inferSelect;
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Attachment = typeof attachments.$inferSelect;
export type InsertAttachment = z.infer<typeof insertAttachmentSchema>;
export type WorkItemHistory = typeof workItemHistory.$inferSelect;
