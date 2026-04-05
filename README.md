# HiveTask

A collaborative, real-time task management application built for teams. HiveTask provides Kanban boards, list views, calendar views, and real-time collaboration — all in a self-hostable, PWA-ready package.

---

## Features

- **Multiple Views** — Kanban board (drag & drop), list view, and calendar view
- **Real-time Collaboration** — Live presence tracking, instant updates, and WebSocket-powered notifications
- **Task Management** — Priorities, due dates, subtasks, labels, comments, and file attachments
- **Shared Lists** — Invite team members to collaborate on task lists
- **End-to-End Encryption** — Optional per-list encryption using ECDH + AES-GCM for sensitive data
- **Progressive Web App** — Installable on iOS/Android with offline caching support
- **Secure Auth** — JWT-based auth with access/refresh tokens, session timeouts, and rate limiting
- **File Attachments** — Upload and manage files via AWS S3 with pre-signed URLs
- **Full-Text Search** — Search and filter tasks by priority, status, assignees, and labels

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React 19, Tailwind CSS 4, shadcn/ui |
| State | Zustand |
| Backend | Next.js API Routes, Socket.IO 4 |
| ORM | Prisma 5 |
| Database | PostgreSQL 15 |
| Auth | JWT (access + refresh tokens), bcryptjs |
| Encryption | Web Crypto API (ECDH P-256, AES-GCM, PBKDF2) |
| Storage | AWS S3 |
| Deployment | Docker, Docker Compose, AWS ECS Fargate |
| Testing | Vitest (unit/integration), Playwright (E2E) |

---

## Getting Started

### Prerequisites

- Node.js 20+
- Docker & Docker Compose

### 1. Clone & Install

```bash
git clone https://github.com/your-username/hivetask.git
cd hivetask
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and set your secrets:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/hivetask"
JWT_SECRET="your-random-256-bit-secret"
JWT_REFRESH_SECRET="your-random-256-bit-refresh-secret"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_WS_URL="ws://localhost:3000"
```

AWS S3 variables are optional — file attachments are disabled if not configured.

### 3. Start the Database

```bash
docker compose up -d db
```

### 4. Run Migrations & Seed

```bash
npm run db:migrate
npm run db:seed
```

### 5. Start the Dev Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The seed creates demo users — use the credentials below to log in immediately.

> **Demo Login**
> - **Username:** `Vedant`
> - **Password:** `Vedant@31`

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm start` | Start production server (Socket.IO + Next.js) |
| `npm run db:migrate` | Run Prisma migrations |
| `npm run db:seed` | Seed database with sample data |
| `npm run db:studio` | Open Prisma Studio GUI at :5555 |
| `npm test` | Run unit & integration tests |
| `npm run test:coverage` | Run tests with coverage report |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run test:all` | Run all tests |

---

## Project Structure

```
hivetask/
├── src/
│   ├── app/
│   │   ├── (auth)/          # Login page
│   │   ├── (dashboard)/     # Protected app routes
│   │   └── api/             # REST API endpoints
│   ├── components/          # UI components (board, calendar, tasks, etc.)
│   ├── lib/                 # Auth, crypto, Prisma, S3, rate limiting
│   ├── stores/              # Zustand state stores
│   ├── hooks/               # Custom React hooks
│   └── types/               # TypeScript interfaces
├── server/                  # Custom Node.js server (Socket.IO)
├── prisma/                  # Schema, migrations, seed data
├── e2e/                     # Playwright E2E tests
├── __tests__/               # Vitest unit & integration tests
├── docs/                    # AWS deployment guide
├── Dockerfile               # Multi-stage production build
├── docker-compose.yml       # Local dev (PostgreSQL)
└── docker-compose.prod.yml  # Production deployment
```

---

## Docker Deployment

### Development

```bash
docker compose up -d
```

### Production

```bash
docker compose -f docker-compose.prod.yml up -d
docker compose -f docker-compose.prod.yml exec app npx prisma migrate deploy
```

See [docs/AWS_DEPLOYMENT_GUIDE.md](docs/AWS_DEPLOYMENT_GUIDE.md) for full AWS ECS Fargate + RDS + S3 deployment instructions.

---

## Testing

```bash
# Unit & integration tests
npm test

# With coverage
npm run test:coverage

# E2E (requires running dev server)
npm run test:e2e

# All tests
npm run test:all
```

E2E tests run across Desktop Chrome, Mobile Chrome, and Mobile Safari via Playwright.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_SECRET` | Yes | Secret for access tokens |
| `JWT_REFRESH_SECRET` | Yes | Secret for refresh tokens |
| `NEXT_PUBLIC_APP_URL` | Yes | Public app URL |
| `NEXT_PUBLIC_WS_URL` | Yes | WebSocket server URL |
| `AWS_REGION` | No | AWS region for S3 |
| `AWS_ACCESS_KEY_ID` | No | AWS credentials |
| `AWS_SECRET_ACCESS_KEY` | No | AWS credentials |
| `AWS_S3_BUCKET` | No | S3 bucket for attachments |
| `E2E_ENABLED` | No | Enable end-to-end encryption (`true`/`false`) |
| `SESSION_IDLE_TIMEOUT` | No | Session idle timeout in seconds (default: 900) |
| `RATE_LIMIT_AUTH` | No | Auth endpoint rate limit per minute (default: 5) |

---

## License

MIT
