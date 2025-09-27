# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Architecture Overview

This is a monorepo for Serrbi, a job marketplace platform with two main applications and shared packages:

### Applications
- **web** (`apps/web`) - Main user-facing Next.js application (port 3000)
- **admin** (`apps/admin`) - Admin dashboard application (port 3001)

### Shared Packages
- **database** (`packages/database`) - Prisma schema and database client
- **ui** (`packages/ui`) - Shared UI components built with shadcn/ui and Radix
- **eslint-config** - Shared ESLint configurations
- **typescript-config** - Shared TypeScript configurations

### Tech Stack
- **Framework**: Next.js 15 with App Router
- **Database**: PostgreSQL with Prisma ORM
- **API**: tRPC for type-safe APIs
- **Auth**: NextAuth.js v5 beta with Prisma adapter
- **UI**: shadcn/ui components, Radix UI primitives, Tailwind CSS v4
- **Package Manager**: pnpm with workspaces
- **Build System**: Turbo monorepo

## Common Development Commands

### Development
```bash
# Start all applications in development mode
pnpm dev

# Start specific apps
cd apps/web && pnpm dev          # Main app on port 3000
cd apps/admin && pnpm dev        # Admin app on port 3001

# Database operations
cd packages/database && pnpm db:generate    # Generate Prisma client
cd packages/database && pnpm db:migrate     # Run migrations
cd packages/database && pnpm db:push        # Push schema changes
cd packages/database && pnpm db:studio      # Open Prisma Studio
```

### Building & Testing
```bash
# Build all packages and apps
pnpm build

# Lint all packages
pnpm lint

# Format code
pnpm format

# Type checking for specific app
cd apps/web && pnpm typecheck
cd apps/admin && pnpm typecheck
```

### Adding shadcn/ui Components
```bash
# Add components to the ui package (run from root)
pnpm dlx shadcn@latest add button -c apps/web
```

## Database Architecture

The application uses a comprehensive Prisma schema with these key models:
- **User**: Supports multiple roles (USER, ADMIN, COMPANY) with OAuth and password auth
- **Job**: Job listings with approval workflow and moderation
- **Service**: Professional services with location data and booking system
- **Task**: User-posted tasks with proposals system
- **Favorites**: Cross-entity favoriting system
- **ModerationAction/Notification**: Admin workflow and notifications

All main entities (Jobs, Services, Tasks) follow an approval workflow:
- `draft` → `pending` (submitted for review) → `published` (approved) or `rejected`

## tRPC API Structure

The API is organized into routers:
- `auth` - Authentication operations
- `job` - Job listing CRUD and search
- `service` - Service listing CRUD and booking
- `task` - Task posting and proposals
- `favorite` - Cross-entity favorites

### Key tRPC Procedures:
- `publicProcedure` - Open access
- `protectedProcedure` - Requires authenticated user
- `adminProcedure` - Requires ADMIN role or admin API token

### Admin API Access
Admin operations support dual access:
1. Session-based (admin users via web interface)
2. Service-to-service via `x-admin-token` header

## Key Directories

### Web App (`apps/web`)
```
app/
├── (auth)/           # Auth pages (login, register, etc.)
├── _trpc/            # tRPC client configuration
├── api/trpc/         # tRPC API endpoint
├── jobs/             # Job listings and forms
├── services/         # Service listings
├── tasks/            # Task listings
└── favorites/        # User favorites

components/
├── ui/               # App-specific UI components
└── providers.tsx     # App providers (tRPC, theme, etc.)

server/
├── routers/          # tRPC route handlers
├── services/         # Business logic services
└── trpc.ts           # tRPC server configuration
```

### Shared UI Package (`packages/ui`)
- Exports shadcn/ui components with Radix UI primitives
- Uses class-variance-authority for component variants
- Includes custom components like dual search bars, filter bars
- Supports both light and dark themes

### Database Package (`packages/database`)
- Prisma client configuration
- Generated client outputs to `generated/prisma`
- Comprehensive indexing for performance

## Authentication & Authorization

- NextAuth.js v5 with custom Prisma adapter
- Supports OAuth providers and password authentication
- Role-based access control (USER, ADMIN, COMPANY)
- Phone number and resume upload support
- Email verification workflow with custom tokens

## Development Notes

- The admin app proxies tRPC requests to the main web app
- Both apps share the same database and tRPC backend
- UI components are shared via the workspace packages
- Database operations should be done via the database package scripts
- All new components should be added to the ui package for reusability
