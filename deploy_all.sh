#!/bin/bash
set -e

echo "Deploying backend..."
railway up ./backend --path-as-root --service WDP301 -d

echo "Deploying frontend..."
railway up ./frontend --path-as-root --service frontend -d

echo "Deploying ai-service..."
railway up ./backend/apps/ai-service --path-as-root --service ai-service -d

echo "All services are being deployed! Check Railway dashboard for progress."
