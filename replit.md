# AgileTracker - Project Management System

## Overview

AgileTracker is a comprehensive project management application created for Cybaem, designed to manage projects, teams, and work items in an agile development environment. The system supports hierarchical work item management (Epics, Features, Stories, Tasks, and Bugs) with robust project and team collaboration features.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite for build tooling
- **Styling**: Tailwind CSS with shadcn/ui component library
- **State Management**: TanStack Query (React Query) for server state management
- **Routing**: Wouter for client-side routing
- **Form Handling**: React Hook Form with Zod validation
- **UI Components**: Radix UI primitives with custom styling

### Backend Architecture
- **Runtime**: Node.js with Express.js server
- **Language**: TypeScript with ES modules
- **Database ORM**: Drizzle ORM with PostgreSQL dialect
- **Authentication**: Session-based authentication with bcrypt password hashing
- **Database Provider**: Neon serverless PostgreSQL

### Project Structure
```
├── client/                 # Frontend application
│   ├── src/
│   │   ├── components/     # Reusable UI components
│   │   ├── hooks/          # Custom React hooks
│   │   ├── lib/            # Utility functions
│   │   └── pages/          # Route components
├── server/                 # Backend application
│   ├── auth-middleware.ts  # Authentication middleware
│   ├── auth-routes.ts      # Authentication endpoints
│   ├── routes.ts           # API route definitions
│   └── db.ts              # Database configuration
├── shared/                 # Shared types and schemas
│   └── schema.ts          # Database schema and Zod validation
└── migrations/            # Database migration files
```

## Key Components

### Data Models
- **Users**: System users with role-based permissions (ADMIN, SCRUM_MASTER, USER)
- **Teams**: Organizational units for collaboration
- **Projects**: Main containers for work with unique keys and team assignments
- **Work Items**: Hierarchical task management (Epic → Feature → Story/Task/Bug)
- **Comments & Attachments**: Supporting content for work items

### Authentication & Authorization
- Session-based authentication with role-based access control
- Middleware protection for admin and scrum master operations
- Secure password hashing with bcrypt

### UI Features
- **Kanban Board**: Drag-and-drop task management with status columns
- **Timeline View**: Gantt-chart style project visualization
- **Calendar View**: Date-based work item scheduling
- **Deadlines View**: Risk assessment and deadline tracking
- **Reports**: Analytics and progress visualization

### Core Functionality
- Project and team creation/management
- Hierarchical work item organization
- Real-time collaboration features
- Advanced filtering and search capabilities
- Progress tracking and reporting

## Data Flow

1. **User Authentication**: Login flow establishes user session
2. **Data Fetching**: React Query manages server state with automatic caching
3. **CRUD Operations**: RESTful API endpoints handle data mutations
4. **Real-time Updates**: Query invalidation ensures UI consistency
5. **Form Validation**: Client and server-side validation using Zod schemas

## External Dependencies

### Production Dependencies
- **@neondatabase/serverless**: Neon PostgreSQL serverless driver
- **@tanstack/react-query**: Server state management
- **@radix-ui/***: Headless UI component primitives
- **drizzle-orm**: Type-safe database ORM
- **bcryptjs**: Password hashing
- **express-session**: Session management
- **react-hook-form**: Form state management
- **zod**: Runtime type validation

### Development Dependencies
- **Vite**: Build tool and dev server
- **TypeScript**: Type safety
- **Tailwind CSS**: Utility-first styling
- **ESBuild**: Fast bundling for production

## Deployment Strategy

### Development
- Vite dev server with HMR for frontend
- tsx for running TypeScript server with hot reload
- Environment variables for database configuration

### Production Build
- Frontend: Vite build outputs to `dist/public`
- Backend: ESBuild bundles server to `dist/index.js`
- Database: Drizzle migrations applied via `db:push` command

### Environment Configuration
- `DATABASE_URL`: Required PostgreSQL connection string
- `SESSION_SECRET`: Session encryption key
- `NODE_ENV`: Environment mode (development/production)

## Changelog

- June 27, 2025. Initial setup
- June 27, 2025. Enhanced Reports functionality with comprehensive analytics, charts, and statistical insights
- June 27, 2025. Redesigned sidebar with horizontal scrolling cards for projects and teams to solve scalability issues with 10-15+ items
- June 27, 2025. Removed PROJECTS and TEAMS sections from sidebar completely for cleaner interface design
- July 2, 2025. Implemented database-synced invitation system without email sending - invited users are created in database and appear in team management dropdowns
- July 2, 2025. Fixed "Back to teams" navigation issue using programmatic navigation instead of Link components to prevent authentication redirects
- July 2, 2025. Removed "Add Member" button from team details page as requested by user to streamline the interface

## User Preferences

Preferred communication style: Simple, everyday language.
UI/UX Priority: Scalable design that works well with 10-15+ projects and teams without crowding the interface.
Sidebar Design: Clean, minimal sidebar without project/team sections - user prefers accessing these through main navigation only.