# Development Plan: Finchley Foodbank Client Registration System

**Status**: Complete - All Priorities Implemented
**Created**: 2025-12-07
**Updated**: 2025-12-13
**First milestone**: Staff login + client registration form ✅
**Current**: Production-ready (Fly.io deployment configured)

---

## Overview

Bootstrap a full-stack web application for client registration with barcode scanning support.

**Structure**: Monorepo with `/backend` and `/frontend` folders

---

## Phase 1: Project Scaffolding [COMPLETE]

- [x] Git repository initialized
- [x] `.gitignore` created
- [x] `docker-compose.yml` with PostgreSQL 16
- [x] `.env.example` and `.env` configuration

---

## Phase 2: Backend Setup (Go) [COMPLETE]

### Project Structure
```
backend/
├── cmd/server/main.go          # Entry point
├── internal/
│   ├── config/config.go        # Env loading
│   ├── database/db.go          # PostgreSQL connection
│   ├── handler/                # HTTP handlers
│   │   ├── health.go
│   │   ├── staff.go            # Staff CRUD
│   │   ├── client.go           # Client CRUD + attendance
│   │   └── middleware/auth.go  # JWT validation
│   ├── model/                  # Domain types
│   │   ├── client.go
│   │   ├── staff.go
│   │   └── attendance.go
│   ├── repository/             # Database queries
│   │   ├── staff.go
│   │   └── client.go
│   └── service/                # Business logic
│       ├── staff.go
│       └── client.go
├── migrations/                 # SQL migrations
│   ├── 001_create_staff.up.sql
│   ├── 002_create_clients.up.sql
│   ├── 003_create_attendance.up.sql
│   └── 004_create_audit_log.up.sql
└── go.mod
```

### Dependencies
- `github.com/go-chi/chi/v5` - Router
- `github.com/jackc/pgx/v5` - PostgreSQL driver
- `github.com/golang-migrate/migrate/v4` - Migrations
- `github.com/auth0/go-jwt-middleware/v2` - JWT validation
- `github.com/joho/godotenv` - Env loading

### API Endpoints
| Method | Path | Description | Status |
|--------|------|-------------|--------|
| GET | `/api/health` | Health check | ✅ |
| GET | `/api/me` | Get/create current staff profile | ✅ |
| GET | `/api/staff` | List all staff | ✅ |
| GET | `/api/staff/:id` | Get staff by ID | ✅ |
| PUT | `/api/staff/:id` | Update staff profile | ✅ |
| GET | `/api/clients` | List/search clients | ✅ |
| POST | `/api/clients` | Register new client | ✅ |
| GET | `/api/clients/:id` | Get client details | ✅ |
| PUT | `/api/clients/:id` | Update client | ✅ |
| POST | `/api/clients/:id/attendance` | Record attendance | ✅ |
| GET | `/api/clients/:id/attendance` | Get attendance history | ✅ |
| GET | `/api/clients/barcode/:code` | Lookup by barcode | ✅ |

---

## Phase 3: Frontend Setup (React + Vite) [COMPLETE]

### Project Structure
```
frontend/
├── src/
│   ├── main.tsx              # Auth0Provider wrapper
│   ├── App.tsx               # Router setup
│   ├── index.css             # Tailwind imports
│   ├── components/
│   │   ├── Layout.tsx
│   │   └── Navbar.tsx
│   ├── features/
│   │   ├── auth/
│   │   │   ├── HomePage.tsx
│   │   │   └── ProtectedRoute.tsx
│   │   └── clients/
│   │       ├── ClientsPage.tsx        # List, search, pagination
│   │       ├── ClientDetailPage.tsx   # Full client view + attendance
│   │       ├── BarcodeScannerPage.tsx # Camera barcode scanning
│   │       ├── ClientForm.tsx         # Create/edit modal
│   │       └── types.ts               # TypeScript interfaces
│   └── hooks/
│       └── useApi.ts
├── vite.config.ts
├── tailwind.config.js
└── package.json
```

---

## Phase 4: Auth0 Setup [COMPLETE]

- [x] Auth0 account created
- [x] SPA application configured
- [x] API configured with identifier `https://api.foodbank.local`
- [x] `.env` credentials configured
- [x] JWT validation working

---

## Phase 5: Core Implementation [COMPLETE]

### Step 1: Auth0 Integration ✅
- [x] Create Auth0 account, tenant, apps
- [x] Update `.env` with credentials
- [x] Test login/logout flow
- [x] Auto-create staff record on first API call

### Step 2: Client Registration Feature ✅
- [x] Backend: POST `/api/clients` handler
- [x] Backend: Client repository + service
- [x] Frontend: ClientForm component (modal)
- [x] Frontend: Form validation
- [x] Generate barcode ID on registration (FFB-YYYYMM-XXXXX format)
- [x] Success/error feedback

### Step 3: Client Search & Verification ✅
- [x] Backend: GET `/api/clients` with search
- [x] Backend: GET `/api/clients/barcode/:code`
- [x] Frontend: Search integrated into ClientsPage
- [x] Frontend: Pagination
- [x] Attendance recording (Check In button)

---

## Phase 6: Enhanced Features [IN PROGRESS]

### Priority 1 - Core Features
- [x] Client detail view page (`/clients/:id`)
- [x] Attendance history view (integrated into detail page)
- [x] Barcode scanner integration (`/scan` - camera-based using react-barcode-scanner)
- [x] Print barcode labels (`/clients/:id/print` - using JsBarcode CODE128)
- [x] Hardware barcode scanner support (USB keyboard wedge mode, global detection via useBarcodeScannerInput hook)

### Priority 2 - User Experience
- [x] Theme switcher (DaisyUI themes) - 16 themes with localStorage persistence
- [x] Toast notifications for actions (success/error/info/warning)
- [ ] Confirmation dialogs for destructive actions (no destructive actions implemented yet)
- [x] Loading skeletons (ClientTableSkeleton, ClientDetailSkeleton)

### Priority 3 - Admin Features
- [x] Staff management UI (`/staff` - list all staff members)
- [x] Audit log viewer (`/audit` - tracks all client record changes)
- [x] Data export (CSV) - export clients from Clients page
- [x] Dashboard with statistics (home page for authenticated users)

### Priority 4 - Production
- [x] Docker containerization (backend + frontend + nginx proxy)
- [x] Production deployment (Fly.io - see `.claude/docs/deployment.md`)
- [x] HTTPS configuration (automatic with Fly.io)
- [x] Backup strategy (Fly Postgres automated backups)

---

## Development Commands

```bash
# Start PostgreSQL only (for local development)
docker compose up -d

# Install frontend dependencies
cd frontend && bun install

# Run frontend dev server
cd frontend && bun run dev

# Run backend (requires Go)
cd backend && go run cmd/server/main.go

# Run migrations
source .env && ~/go/bin/migrate -path backend/migrations -database "$DATABASE_URL" up
```

## Docker Production Commands

```bash
# Start full stack (database + backend + frontend)
source .env && docker compose --profile full up -d

# Start backend only (database + backend)
source .env && docker compose --profile backend up -d

# View logs
docker compose --profile full logs -f

# Stop all containers
docker compose --profile full down

# Rebuild and restart
docker compose --profile full up -d --build
```

---

## Configuration

### Environment Variables (.env)
```
# Database
DATABASE_URL=postgres://foodbank:foodbank@localhost:5435/foodbank?sslmode=disable

# Auth0 Backend
AUTH0_DOMAIN=dev-qs1wwh0z3t1xklez.us.auth0.com
AUTH0_AUDIENCE=https://api.foodbank.local

# Auth0 Frontend
VITE_AUTH0_DOMAIN=dev-qs1wwh0z3t1xklez.us.auth0.com
VITE_AUTH0_CLIENT_ID=<your-client-id>
VITE_AUTH0_AUDIENCE=https://api.foodbank.local

# Backend Server
PORT=8084
```
