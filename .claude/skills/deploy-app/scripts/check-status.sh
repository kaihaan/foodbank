#!/bin/bash
# Check deployment status for Foodbank application
# Usage: ./check-status.sh [backend|frontend|both]

set -e

BACKEND_APP="foodbank-api"
FRONTEND_APP="foodbank-web"

TARGET="${1:-both}"

check_app_status() {
    local app_name="$1"
    local app_url="$2"

    echo "=== $app_name ==="
    echo "URL: $app_url"
    echo ""

    echo "Machine Status:"
    fly machines list --app "$app_name" 2>/dev/null || echo "Failed to get machine list"
    echo ""

    echo "Recent Logs (last 5):"
    fly logs --app "$app_name" -n 5 2>/dev/null || echo "Failed to get logs"
    echo ""

    echo "Health Check:"
    if curl -s -o /dev/null -w "%{http_code}" "$app_url" | grep -q "200\|301\|302"; then
        echo "OK - App is responding"
    else
        echo "WARNING - App may not be responding (could be sleeping)"
    fi
    echo ""
    echo "---"
    echo ""
}

echo "Checking Fly.io Deployment Status"
echo "================================="
echo ""

case "$TARGET" in
    backend)
        check_app_status "$BACKEND_APP" "https://foodbank-api.fly.dev/api/health"
        ;;
    frontend)
        check_app_status "$FRONTEND_APP" "https://foodbank-web.fly.dev"
        ;;
    both|*)
        check_app_status "$BACKEND_APP" "https://foodbank-api.fly.dev/api/health"
        check_app_status "$FRONTEND_APP" "https://foodbank-web.fly.dev"
        ;;
esac

echo "Status check complete."
