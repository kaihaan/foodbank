#!/bin/bash
# Wake sleeping Fly.io machines for the Foodbank application
# Usage: ./wake-machines.sh [backend|frontend|database|all]

set -e

BACKEND_APP="foodbank-api"
FRONTEND_APP="foodbank-web"
DATABASE_APP="foodbank-db"

TARGET="${1:-all}"

wake_app_machines() {
    local app_name="$1"
    echo "=== $app_name ==="

    # Get machine list
    machines=$(fly machines list --app "$app_name" --json 2>/dev/null || echo "[]")

    if [ "$machines" = "[]" ]; then
        echo "No machines found for $app_name"
        return
    fi

    # Parse and wake stopped machines
    echo "$machines" | jq -r '.[] | "\(.id) \(.state)"' | while read -r id state; do
        if [ "$state" = "stopped" ]; then
            echo "Starting stopped machine: $id"
            fly machines start "$id" --app "$app_name"
            echo "Waiting for machine to start..."
            sleep 3
        else
            echo "Machine $id is already $state"
        fi
    done

    echo ""
}

echo "Waking Fly.io machines..."
echo ""

case "$TARGET" in
    backend)
        wake_app_machines "$BACKEND_APP"
        ;;
    frontend)
        wake_app_machines "$FRONTEND_APP"
        ;;
    database|db)
        wake_app_machines "$DATABASE_APP"
        ;;
    all|*)
        # Wake database first (backend depends on it)
        wake_app_machines "$DATABASE_APP"
        wake_app_machines "$BACKEND_APP"
        wake_app_machines "$FRONTEND_APP"
        ;;
esac

echo "Done! Machines should be ready for deployment/testing."
