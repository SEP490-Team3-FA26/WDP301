#!/bin/bash
while IFS='=' read -r key value; do
  # Ignore empty lines and comments
  if [[ -z "$key" || "$key" == \#* ]]; then continue; fi
  
  # Remove trailing carriage return from value if any
  value=$(echo "$value" | tr -d '\r')
  key=$(echo "$key" | tr -d '\r' | xargs)
  
  echo "Setting $key for WDP301..."
  echo "$value" | railway variable set "$key" --stdin --skip-deploys -s WDP301
done < backend/.env
echo "All backend variables uploaded!"
