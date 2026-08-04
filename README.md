# Serrbi

**Serrbi** is an AI-powered marketplace for jobs, services, and tasks — built for Morocco and beyond. Users can search listings, chat with an intelligent agent to find the right opportunities, analyze their resume, and manage applications from one place.

Live site: [serrbi.ma](https://serrbi.ma)

---

## What Serrbi does

| Feature | Description |
|---------|-------------|
| **AI Agent Chat** | Users describe what they need in natural language. The agent extracts intent, searches jobs/services/tasks in the database, and returns ranked results. |
| **Resume Analyzer** | Upload a PDF resume and get an AI-powered score, skill gaps, suggested roles, salary range, and improvement tips. |
| **Jobs, Services & Tasks** | Full marketplace with listings, filters, favorites, and applications. |
| **Career Switch** | AI-generated roadmap for professionals changing careers. |
| **Subscriptions** | Paddle-powered plans (Basic / Premium) with usage limits on AI features. |
| **Admin Panel** | Separate app for moderating listings, importing jobs, and managing content. |

---

## Monorepo structure

```
serrbi-mono/
├── apps/
│   ├── web/          # Main Next.js app (serrbi.ma) — port 3000
│   └── admin/        # Admin dashboard — port 3001
├── packages/
│   ├── database/     # Prisma schema, migrations, seed scripts
│   ├── ui/           # Shared shadcn/ui components
│   ├── eslint-config/
│   └── typescript-config/
```

---

## Tech stack

- **Framework:** Next.js 15 (App Router, Turbopack)
- **Language:** TypeScript
- **Database:** PostgreSQL via [Prisma Postgres](https://www.prisma.io/postgres)
- **Auth:** NextAuth v5 (Google OAuth + credentials)
- **AI:** Anthropic Claude (chat, intent extraction, resume analysis)
- **Payments:** Paddle
- **Storage:** AWS S3 (uploads), Supabase (resume PDFs)
- **Email:** Resend
- **Background jobs:** Inngest
- **Monorepo:** pnpm workspaces + Turborepo

---

## Prerequisites

- **Node.js** ≥ 20
- **pnpm** 10.x (the repo pins a version via `packageManager` in `package.json`)
- **PostgreSQL** connection string (Prisma Postgres or local)

Enable the correct pnpm version:

```bash
corepack enable
corepack prepare pnpm@10.14.0 --activate
```

---

## Getting started

### 1. Clone and install

```bash
git clone git@github.com:Zazouit34/serrbi-mono.git
cd serrbi-mono
pnpm install
pnpm approve-builds   # allow prisma, sharp, etc.
```

### 2. Environment variables

Create env files from the templates below.

**`packages/database/.env`** — direct DB connection (migrations, seed):

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"
```

**`apps/web/.env.local`** — main app (see full list in [Environment variables](#environment-variables)):

```env
DATABASE_URL="postgresql://...@pooled.db.prisma.io:5432/postgres?sslmode=require"
AUTH_SECRET="run: npx auth secret"
ANTHROPIC_API_KEY="sk-ant-..."
AUTH_GOOGLE_ID="..."
AUTH_GOOGLE_SECRET="..."
AUTH_TRUST_HOST=true
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

**`apps/admin/.env.local`** — admin app (same `AUTH_SECRET`, `DATABASE_URL`, plus `ADMIN_API_TOKEN` and `NEXT_PUBLIC_WEB_URL`).

### 3. Generate Prisma client

```bash
pnpm db:generate
```

### 4. Run locally

```bash
pnpm dev
```

- Web app → [http://localhost:3000](http://localhost:3000)
- Admin app → [http://localhost:3001](http://localhost:3001)

---

## Environment variables

### Required for local dev

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string (pooled for runtime) |
| `AUTH_SECRET` | NextAuth secret — generate with `npx auth secret` |
| `ANTHROPIC_API_KEY` | Claude API key for chat + resume analysis |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Google OAuth credentials |
| `AUTH_TRUST_HOST` | Set to `true` |

### AI (Claude)

| Variable | Description |
|----------|-------------|
| `ANTHROPIC_API_KEY` | Required for agent chat, intent extraction, resume analyzer |
| `ANTHROPIC_MODEL` | Optional — defaults to `claude-sonnet-4-20250514` |

### Auth & URLs

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_APP_URL` | Public app URL (`http://localhost:3000` locally) |
| `NEXT_PUBLIC_PRIMARY_DOMAIN` | Primary domain (default: `serrbi.ma`) |
| `NEXT_PUBLIC_SITE_URL` | Full site URL for SEO/sitemap |

### Optional services

| Variable | Used for |
|----------|----------|
| `AWS_*` | S3 file uploads |
| `NEXT_PUBLIC_SUPABASE_*` / `SUPABASE_SERVICE_ROLE` | Resume PDF storage |
| `RESEND_API_KEY` | Transactional email |
| `PADDLE_*` / `NEXT_PUBLIC_PADDLE_*` | Subscriptions |
| `ADMIN_API_TOKEN` | Admin → web API proxy |
| `OPENROUTER_API_KEY` | Legacy routes (job synth responses) — not required for chat/resume |

---

## Deploying to Vercel (web app only)

You do **not** need the admin app deployed for users to chat or use the resume analyzer.

**Vercel project settings:**

- Root Directory: `apps/web`
- Framework: Next.js

**Minimum env vars for chat + resume demo:**

```
DATABASE_URL          # pooled Prisma Postgres URL
ANTHROPIC_API_KEY
AUTH_SECRET
AUTH_GOOGLE_ID
AUTH_GOOGLE_SECRET
AUTH_TRUST_HOST=true
NEXT_PUBLIC_APP_URL=https://your-domain.com
NEXT_PUBLIC_PRIMARY_DOMAIN=serrbi.ma
```

Add `https://your-domain.com/api/auth/callback/google` to your Google OAuth redirect URIs.

---

## Key scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start all apps in dev mode |
| `pnpm build` | Build all packages |
| `pnpm db:generate` | Generate Prisma client |
| `pnpm db:push` | Push schema to database |
| `pnpm db:migrate` | Run migrations |
| `pnpm seed` | Seed database |
| `pnpm lint` | Lint all packages |

Database-specific scripts live in `packages/database`:

```bash
cd packages/database
pnpm db:seed
pnpm db:backfill-job-embeddings
pnpm db:studio
```

---

## AI architecture

All conversational AI runs through **Anthropic Claude** via a shared module:

```
apps/web/lib/chat-llm.ts
```

Used by:

- `/api/chat` — agent chat, intent extraction, result narratives
- `/api/chat/resume-insight` — resume analyzer AI scoring
- `/api/ai/analyze` — career switch + resume analysis

Job/service search uses the PostgreSQL database directly. Semantic embedding search is optional — the agent falls back to keyword ranking when embeddings are unavailable.

---

## License

Private — © Serrbi
