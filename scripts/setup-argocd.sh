#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "🚀 Starting ArgoCD installation..."

# 1. Create the argocd namespace if it doesn't exist
kubectl create namespace argocd --dry-run=client -o yaml | kubectl apply -f -

# 2. Install ArgoCD
echo "📦 Installing ArgoCD components..."
kubectl apply -n argocd -f https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

# 3. Expose ArgoCD Server permanently via NodePort on port 30080
echo "🌐 Exposing ArgoCD Server on NodePort 30080..."
kubectl patch svc argocd-server -n argocd -p '{"spec": {"type": "NodePort", "ports": [{"port": 443, "nodePort": 30080}]}}'

# 4. Wait for ArgoCD server pod to be ready
echo "⏳ Waiting for ArgoCD Server to be ready... (this may take a minute)"
kubectl wait --for=condition=available deployment/argocd-server -n argocd --timeout=300s

# 5. Apply the project's dev application
echo "📂 Applying the wdp301-dev application to ArgoCD..."
# Ensure the dev namespace exists for the application target
kubectl create namespace dev --dry-run=client -o yaml | kubectl apply -f -
# Apply ArgoCD application manifest
kubectl apply -f gitops/argocd/application-dev.yaml

# 6. Retrieve and display the initial admin password
echo "🔑 Retrieving initial admin password..."
PASSWORD=$(kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d)

echo "─────────────────────────────────────────────────────────────"
echo "✅ ArgoCD has been successfully installed and configured!"
echo "🌍 Access the Dashboard at: https://localhost:30080"
echo "👤 Username: admin"
echo "🔑 Password: $PASSWORD"
echo "─────────────────────────────────────────────────────────────"
echo "ArgoCD is now automatically syncing your project from Git!"
