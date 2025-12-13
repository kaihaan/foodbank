#!/bin/bash
set -e

# Foodbank Fly.io Deployment Script
# Usage: ./scripts/deploy.sh [backend|frontend|all]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# Check if fly CLI is installed
check_fly_cli() {
    if ! command -v fly &> /dev/null; then
        log_error "Fly CLI not installed. Install with: curl -L https://fly.io/install.sh | sh"
        exit 1
    fi
}

# Check if logged in to Fly.io
check_fly_auth() {
    if ! fly auth whoami &> /dev/null; then
        log_error "Not logged in to Fly.io. Run: fly auth login"
        exit 1
    fi
    log_info "Logged in as: $(fly auth whoami)"
}

# Deploy backend
deploy_backend() {
    log_info "Deploying backend..."
    cd "$PROJECT_ROOT/backend"

    # Check if app exists, create if not
    if ! fly status --app foodbank-api &> /dev/null; then
        log_info "Creating backend app..."
        fly apps create foodbank-api --org personal
    fi

    # Deploy
    fly deploy --config fly.toml

    log_info "Backend deployed successfully!"
    log_info "URL: https://foodbank-api.fly.dev"
}

# Deploy frontend
deploy_frontend() {
    log_info "Deploying frontend..."
    cd "$PROJECT_ROOT/frontend"

    # Check if app exists, create if not
    if ! fly status --app foodbank-web &> /dev/null; then
        log_info "Creating frontend app..."
        fly apps create foodbank-web --org personal
    fi

    # Load Auth0 config from .env
    if [ -f "$PROJECT_ROOT/.env" ]; then
        source "$PROJECT_ROOT/.env"
    fi

    # Deploy with build args
    fly deploy --config fly.toml \
        --build-arg VITE_AUTH0_DOMAIN="${VITE_AUTH0_DOMAIN}" \
        --build-arg VITE_AUTH0_CLIENT_ID="${VITE_AUTH0_CLIENT_ID}" \
        --build-arg VITE_AUTH0_AUDIENCE="${VITE_AUTH0_AUDIENCE}"

    log_info "Frontend deployed successfully!"
    log_info "URL: https://foodbank-web.fly.dev"
}

# Setup database
setup_database() {
    log_info "Setting up Fly.io Postgres database..."

    # Check if database exists
    if fly postgres list | grep -q "foodbank-db"; then
        log_warn "Database 'foodbank-db' already exists"
        return
    fi

    # Create Postgres cluster
    fly postgres create \
        --name foodbank-db \
        --region lhr \
        --vm-size shared-cpu-1x \
        --initial-cluster-size 1 \
        --volume-size 1

    # Attach to backend app
    fly postgres attach foodbank-db --app foodbank-api

    log_info "Database created and attached to backend"
}

# Set backend secrets
set_backend_secrets() {
    log_info "Setting backend secrets..."

    # Load from .env
    if [ -f "$PROJECT_ROOT/.env" ]; then
        source "$PROJECT_ROOT/.env"
    else
        log_error "No .env file found. Copy .env.example to .env and fill in values."
        exit 1
    fi

    fly secrets set \
        --app foodbank-api \
        AUTH0_DOMAIN="${AUTH0_DOMAIN}" \
        AUTH0_AUDIENCE="${AUTH0_AUDIENCE}" \
        AUTH0_M2M_CLIENT_ID="${AUTH0_M2M_CLIENT_ID}" \
        AUTH0_M2M_CLIENT_SECRET="${AUTH0_M2M_CLIENT_SECRET}" \
        AUTH0_CONNECTION_ID="${AUTH0_CONNECTION_ID}"

    log_info "Backend secrets set successfully"
}

# Run database migrations
run_migrations() {
    log_info "Running database migrations..."

    # Proxy to database and run migrations
    fly proxy 5433:5432 --app foodbank-db &
    PROXY_PID=$!
    sleep 3

    # Get connection string
    DATABASE_URL=$(fly postgres connect --app foodbank-db --database postgres --user postgres 2>&1 | head -1)

    # Run migrations
    cd "$PROJECT_ROOT/backend"
    migrate -path migrations -database "postgres://postgres:$(fly secrets list --app foodbank-db | grep DATABASE_URL)@localhost:5433/foodbank?sslmode=disable" up

    kill $PROXY_PID 2>/dev/null

    log_info "Migrations completed"
}

# Show usage
usage() {
    echo "Foodbank Fly.io Deployment Script"
    echo ""
    echo "Usage: $0 <command>"
    echo ""
    echo "Commands:"
    echo "  setup       Initial setup (database + secrets)"
    echo "  backend     Deploy backend only"
    echo "  frontend    Deploy frontend only"
    echo "  all         Deploy both backend and frontend"
    echo "  secrets     Update backend secrets from .env"
    echo "  status      Show deployment status"
    echo ""
}

# Show status
show_status() {
    log_info "Deployment Status"
    echo ""
    echo "Backend (foodbank-api):"
    fly status --app foodbank-api 2>/dev/null || echo "  Not deployed"
    echo ""
    echo "Frontend (foodbank-web):"
    fly status --app foodbank-web 2>/dev/null || echo "  Not deployed"
    echo ""
    echo "Database (foodbank-db):"
    fly postgres list 2>/dev/null | grep foodbank-db || echo "  Not created"
}

# Main
main() {
    check_fly_cli
    check_fly_auth

    case "${1:-}" in
        setup)
            setup_database
            set_backend_secrets
            ;;
        backend)
            deploy_backend
            ;;
        frontend)
            deploy_frontend
            ;;
        all)
            deploy_backend
            deploy_frontend
            ;;
        secrets)
            set_backend_secrets
            ;;
        status)
            show_status
            ;;
        *)
            usage
            exit 1
            ;;
    esac
}

main "$@"
