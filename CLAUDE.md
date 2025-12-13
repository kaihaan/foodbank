# Finchley Foodbank Client Registration System

## Project Overview

Web-based client registration system for Finchley Foodbank (est. 2013), a charity providing emergency food for people in financial hardship in the London Borough of Barnet.

**Problem**: Paper client cards become disorganized, dog-eared, and illegible. Verification causes queues at reception.

**Solution**: Digital registration system with barcode scanning for fast client verification.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Go |
| Frontend | Bun, Vite, React, Tailwind CSS, DaisyUI |
| Database | PostgreSQL (containerized) |
| Authentication | Auth0 |
| Production | Cloud-hosted, containerized |

## Key Use Cases

1. **Client Registration** - Capture name, address, family size, food preferences, photo, appointment slot
2. **Client Verification** - Search by name, address, or barcode scan; record attendance
3. **Client Record Update** - Edit records with full audit trail
4. **Staff Account Management** - Create/manage staff accounts with individual logins
5. **Client Search** - View all client details including attendance and change history

## code generation
Rule: Always use context7 when I need code generation


## UI Design Principles

- Minimal design language with maximum negative space
- Clear information hierarchy (important = center, larger, bolder)
- No more than 3 text sizes; consistent corner radii
- CSS animations for page loads and micro-interactions (Motion library for React)
- Layered backgrounds with gradients for depth
- All DaisyUI themes available as user preference
- Avoid modals - use only for calling attention to urgent actions and alerts
- Optomise page load times
- Use a single page application pattern with for content with client side state
- Limit  multi page app pattern for very little client side state, and strong SEO needs.
- Avoid loading spinners - use progress bards instead.
- avoid popup menus - use expanding drawers instead.


## Development Commands

```bash
# Start PostgreSQL database
docker compose up -d

# Install frontend dependencies (from /frontend)
cd frontend && npm install

# Run frontend dev server (from /frontend)
npm run dev

# Run backend (from /backend) - requires Go installed
cd backend && go mod tidy && go run cmd/server/main.go

# Run database migrations (requires migrate CLI)
migrate -path backend/migrations -database "$DATABASE_URL" up
```

## Project Structure

```
foodbank/
├── backend/
│   ├── cmd/server/main.go      # Entry point
│   ├── internal/               # Application code
│   │   ├── config/             # Environment config
│   │   ├── database/           # DB connection
│   │   ├── handler/            # HTTP handlers
│   │   ├── model/              # Domain types
│   │   ├── repository/         # DB queries
│   │   └── service/            # Business logic
│   └── migrations/             # SQL migrations
├── frontend/
│   └── src/
│       ├── components/         # Shared UI
│       ├── features/           # Feature modules
│       ├── hooks/              # Custom hooks
│       └── lib/                # Utilities
├── docker-compose.yml
└── .env
```

## Documentation
User and enerated documentatoin should be stored in .claude/docs in these folders:
- briefs: written by the user for features, components and design tasks
    - Product brief: `.claude/docs/briefs/master.md`
- database: written by claude to document and remember database design decisions
- plans: written by claude to remember plans and TODO lists.
- use bun instead of npm
- avoid creating modal components.  use persistent navigation components, in a shell and widgets pattern (unless there is a significant change needed to the core navigation components).