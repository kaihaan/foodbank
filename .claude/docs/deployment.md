# Fly.io Deployment Guide

## Overview

The Foodbank application is deployed on [Fly.io](https://fly.io) with the following components:

| Component | App Name | URL |
|-----------|----------|-----|
| Frontend | foodbank-web | https://foodbank-web.fly.dev |
| Backend API | foodbank-api | https://foodbank-api.fly.dev |
| Database | foodbank-db | Fly Postgres (internal) |

## Prerequisites

1. **Fly.io CLI**: Install the Fly CLI
   ```bash
   curl -L https://fly.io/install.sh | sh
   ```

2. **Fly.io Account**: Sign up at https://fly.io and login
   ```bash
   fly auth login
   ```

3. **Auth0 Configuration**: Ensure `.env` file has all Auth0 credentials

## Initial Deployment

### Step 1: Create the Database

```bash
# Create Fly Postgres cluster in London (closest to Finchley)
fly postgres create \
  --name foodbank-db \
  --region lhr \
  --vm-size shared-cpu-1x \
  --initial-cluster-size 1 \
  --volume-size 1
```

### Step 2: Deploy the Backend

```bash
# Create the backend app
fly apps create foodbank-api --org personal

# Attach database to backend
fly postgres attach foodbank-db --app foodbank-api

# Set secrets from your .env file
fly secrets set --app foodbank-api \
  AUTH0_DOMAIN="your-tenant.auth0.com" \
  AUTH0_AUDIENCE="https://api.foodbank.local" \
  AUTH0_M2M_CLIENT_ID="your-m2m-client-id" \
  AUTH0_M2M_CLIENT_SECRET="your-m2m-client-secret" \
  AUTH0_CONNECTION_ID="con_xxxxxxxxxxxxx"

# Deploy
cd backend
fly deploy
```

### Step 3: Run Database Migrations

```bash
# Connect to the database and run migrations
fly proxy 5433:5432 --app foodbank-db &

# Get the database connection string
fly postgres connect --app foodbank-db

# Run migrations (requires migrate CLI)
migrate -path backend/migrations -database "postgres://foodbank:PASSWORD@localhost:5433/foodbank?sslmode=disable" up
```

### Step 4: Deploy the Frontend

```bash
# Create the frontend app
fly apps create foodbank-web --org personal

# Deploy with Auth0 build args
cd frontend
fly deploy \
  --build-arg VITE_AUTH0_DOMAIN="your-tenant.auth0.com" \
  --build-arg VITE_AUTH0_CLIENT_ID="your-client-id" \
  --build-arg VITE_AUTH0_AUDIENCE="https://api.foodbank.local"
```

### Step 5: Update Auth0 Allowed URLs

In Auth0 Dashboard, add the production URLs:

**Allowed Callback URLs:**
```
https://foodbank-web.fly.dev
```

**Allowed Logout URLs:**
```
https://foodbank-web.fly.dev
```

**Allowed Web Origins:**
```
https://foodbank-web.fly.dev
```

## Using the Deploy Script

A deployment script is provided for convenience:

```bash
# Initial setup (database + secrets)
./scripts/deploy.sh setup

# Deploy backend only
./scripts/deploy.sh backend

# Deploy frontend only
./scripts/deploy.sh frontend

# Deploy everything
./scripts/deploy.sh all

# Update secrets from .env
./scripts/deploy.sh secrets

# Check deployment status
./scripts/deploy.sh status
```

## Ongoing Deployments

After initial setup, deployments are simple:

```bash
# Deploy backend changes
cd backend && fly deploy

# Deploy frontend changes
cd frontend && fly deploy \
  --build-arg VITE_AUTH0_DOMAIN="$VITE_AUTH0_DOMAIN" \
  --build-arg VITE_AUTH0_CLIENT_ID="$VITE_AUTH0_CLIENT_ID" \
  --build-arg VITE_AUTH0_AUDIENCE="$VITE_AUTH0_AUDIENCE"
```

## Monitoring & Logs

```bash
# View backend logs
fly logs --app foodbank-api

# View frontend logs
fly logs --app foodbank-web

# Monitor backend
fly monitor --app foodbank-api

# Open dashboard
fly dashboard --app foodbank-api
```

## Scaling

```bash
# Scale backend (add more instances)
fly scale count 2 --app foodbank-api

# Scale frontend
fly scale count 2 --app foodbank-web

# Upgrade VM size
fly scale vm shared-cpu-2x --app foodbank-api
```

## Database Management

```bash
# Connect to database
fly postgres connect --app foodbank-db

# Create database backup
fly postgres backup create --app foodbank-db

# List backups
fly postgres backup list --app foodbank-db

# Restore from backup
fly postgres backup restore <backup-id> --app foodbank-db
```

## Troubleshooting

### Backend not connecting to database
Check that the database is attached:
```bash
fly secrets list --app foodbank-api | grep DATABASE_URL
```

### Frontend can't reach backend
Verify both apps are in the same Fly organization and the internal DNS is working:
```bash
fly ssh console --app foodbank-web
# Inside container:
nslookup foodbank-api.internal
```

### SSL Certificate Issues
Fly.io handles SSL automatically. If issues arise:
```bash
fly certs list --app foodbank-web
fly certs check foodbank-web.fly.dev --app foodbank-web
```

## Cost Estimates

With Fly.io's free tier and minimal usage:

| Resource | Estimated Cost |
|----------|---------------|
| 2x shared-cpu-1x VMs | ~$0/month (free tier) |
| 1GB Postgres | ~$0/month (free tier) |
| Bandwidth (1GB) | ~$0/month (free tier) |

**Total: $0/month** for low usage within free tier limits.

For production with always-on machines:
- ~$5-10/month for backend
- ~$5-10/month for frontend
- ~$15/month for database

## Custom Domain (Optional)

To use a custom domain like `app.finchleyfoodbank.org`:

```bash
# Add certificate
fly certs create app.finchleyfoodbank.org --app foodbank-web

# Follow DNS instructions to add CNAME record:
# app.finchleyfoodbank.org -> foodbank-web.fly.dev
```
