#!/bin/bash
set -e

SERVICE="${1:-WDP301}"

echo "Using Railway service: ${SERVICE}"
echo "If Railway asks you to choose a project, select the project that contains ${SERVICE}."

railway link
railway service "${SERVICE}"

if ! railway logs; then
  echo
  echo "No logs found yet. Deploying ${SERVICE} from ./backend, then opening logs..."
  railway up ./backend --path-as-root --service "${SERVICE}" -d
  railway logs
fi
