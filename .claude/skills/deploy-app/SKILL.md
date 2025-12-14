---
name: deploy-app
description: Deploy backend/frontend to Fly.io, commit changes, wake sleeping machines, and maintain deployment log. Use when user wants to deploy, redeploy, check deployment status, wake machines, or update production.
allowed-tools: Bash(fly:*), Bash(git:*), Bash(cd:*), Bash(source:*), Bash(date:*), Bash(chmod:*), Read, Write, Edit
---

# Deploy Foodbank Application to Fly.io

## Overview

This skill handles the complete deployment workflow for the Foodbank application:
1. Commit staged changes with descriptive message
2. Push commits to remote repository
3. Wake sleeping Fly.io machines
4. Deploy backend and/or frontend
5. Log deployment to `.claude/logs/deployments.md`

## App Configuration

| Component | App Name | URL |
|-----------|----------|-----|
| Frontend | foodbank-web | https://foodbank-web.fly.dev |
| Backend | foodbank-api | https://foodbank-api.fly.dev |
| Database | foodbank-db | Internal Postgres |

## Deployment Process

### Step 1: Determine What to Deploy

Ask user or infer from context:
- "backend" - Deploy only backend API
- "frontend" - Deploy only frontend web app
- "both" or "everything" - Deploy both

### Step 2: Check for Uncommitted Changes

```bash
git status
git diff --staged --stat
```

If there are staged changes, commit them with a descriptive message:
```bash
git add <relevant-files>
git commit -m "$(cat <<'EOF'
<Brief description of changes>

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>
EOF
)"
```

### Step 3: Push to Remote

Push committed changes to the remote repository:
```bash
git push
```

This ensures the remote repository always matches what's deployed to production.

### Step 4: Wake Sleeping Machines

Fly.io machines auto-stop to save costs. Wake them before deploying:

```bash
# List machines and their status
fly machines list --app foodbank-api
fly machines list --app foodbank-web

# Start stopped machines
fly machines start <machine-id> --app <app-name>
```

Or use the helper script:
```bash
.claude/skills/deploy-app/scripts/wake-machines.sh
```

### Step 5: Deploy

**Backend deployment:**
```bash
cd /home/kaihaan/prj/foodbank/backend && fly deploy
```

**Frontend deployment (requires Auth0 build args):**
```bash
cd /home/kaihaan/prj/foodbank && source .env && cd frontend && fly deploy \
  --build-arg VITE_AUTH0_DOMAIN="$VITE_AUTH0_DOMAIN" \
  --build-arg VITE_AUTH0_CLIENT_ID="$VITE_AUTH0_CLIENT_ID" \
  --build-arg VITE_AUTH0_AUDIENCE="$VITE_AUTH0_AUDIENCE"
```

### Step 6: Log Deployment

Update `.claude/logs/deployments.md` with:
- Timestamp (ISO format)
- Component deployed (backend/frontend/both)
- Commit hash (short form)
- Brief description of changes

Format:
```markdown
| 2025-12-14 15:30 | backend | abc123d | Added email verification feature |
```

### Step 7: Verify Deployment

```bash
fly status --app foodbank-api
fly status --app foodbank-web
```

Or use the helper script:
```bash
.claude/skills/deploy-app/scripts/check-status.sh
```

## Quick Commands

| Action | Command |
|--------|---------|
| Wake all machines | `.claude/skills/deploy-app/scripts/wake-machines.sh` |
| Check status | `.claude/skills/deploy-app/scripts/check-status.sh` |
| View backend logs | `fly logs --app foodbank-api` |
| View frontend logs | `fly logs --app foodbank-web` |
| SSH into backend | `fly ssh console --app foodbank-api` |

## Troubleshooting

### Machine won't start
```bash
fly machines list --app foodbank-api
# Check if machine exists and get its ID
fly machines start <machine-id> --app foodbank-api
```

### Deploy fails with Go version error
Update `backend/Dockerfile` to use matching Go version:
```dockerfile
FROM golang:1.23-alpine AS builder
```

### Frontend deploy fails with missing env vars
Ensure `.env` file exists and contains:
- VITE_AUTH0_DOMAIN
- VITE_AUTH0_CLIENT_ID
- VITE_AUTH0_AUDIENCE

### Database migrations needed
```bash
fly proxy 5433:5432 --app foodbank-db &
migrate -path backend/migrations -database "$DATABASE_URL" up
```

## Examples

**User says:** "Deploy the backend"
**Action:** Commit any staged changes, push to remote, wake backend machines, run `fly deploy` in backend/, log deployment

**User says:** "Deploy everything"
**Action:** Commit changes, push to remote, wake all machines, deploy backend then frontend, log both

**User says:** "Wake the machines"
**Action:** Run wake-machines.sh, report status

**User says:** "Check deployment status"
**Action:** Run check-status.sh, show machine status and recent logs
