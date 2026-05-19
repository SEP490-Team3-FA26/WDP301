#!/usr/bin/env bash
# =============================================================
# k3s Setup Script — WDP301 Enterprise Platform
# Run this ONCE on the fresh EC2 Ubuntu 22.04 instance
# Usage: bash scripts/setup-k3s.sh
# =============================================================
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
log()  { echo -e "${GREEN}[$(date +%T)] ✅ $*${NC}"; }
warn() { echo -e "${YELLOW}[$(date +%T)] ⚠️  $*${NC}"; }
err()  { echo -e "${RED}[$(date +%T)] ❌ $*${NC}"; exit 1; }

# ─────────────────────────────────────────────────────────────
# 1. System update
# ─────────────────────────────────────────────────────────────
log "Updating system packages..."
sudo apt-get update -qq
sudo apt-get upgrade -yq
sudo apt-get install -yq curl wget git unzip jq

# ─────────────────────────────────────────────────────────────
# 2. Install k3s (single-node, no Traefik — we use Nginx)
# ─────────────────────────────────────────────────────────────
log "Installing k3s..."
curl -sfL https://get.k3s.io | \
  INSTALL_K3S_VERSION="v1.29.4+k3s1" \
  sh -s - \
  --disable traefik \
  --write-kubeconfig-mode 644

# Wait for k3s to be ready
log "Waiting for k3s node to be ready..."
sleep 10
sudo k3s kubectl wait node --all --for=condition=Ready --timeout=120s

# Configure kubectl for current user
mkdir -p ~/.kube
sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
sudo chown $(id -u):$(id -g) ~/.kube/config
sed -i "s/127.0.0.1/$(curl -s http://169.254.169.254/latest/meta-data/local-ipv4)/g" ~/.kube/config

log "k3s node status:"
kubectl get nodes -o wide

# ─────────────────────────────────────────────────────────────
# 3. Install Helm
# ─────────────────────────────────────────────────────────────
log "Installing Helm..."
curl -fsSL https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash
helm version --short

# ─────────────────────────────────────────────────────────────
# 4. Install Nginx Ingress Controller
# ─────────────────────────────────────────────────────────────
log "Installing Nginx Ingress Controller..."
helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
helm repo update
helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx \
  --namespace ingress-nginx \
  --create-namespace \
  --set controller.service.type=NodePort \
  --set controller.service.nodePorts.http=30080 \
  --set controller.service.nodePorts.https=30443 \
  --set controller.resources.requests.cpu=50m \
  --set controller.resources.requests.memory=64Mi \
  --wait --timeout=120s

log "Nginx Ingress installed:"
kubectl get pods -n ingress-nginx

# ─────────────────────────────────────────────────────────────
# 5. Install ArgoCD
# ─────────────────────────────────────────────────────────────
log "Installing ArgoCD..."
kubectl create namespace argocd --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -n argocd -f \
  https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

log "Waiting for ArgoCD to be ready (this takes ~2min)..."
kubectl wait deployment/argocd-server \
  -n argocd \
  --for=condition=Available \
  --timeout=300s

# Patch ArgoCD server to insecure (Nginx handles TLS)
kubectl patch deployment argocd-server \
  -n argocd \
  --type=json \
  -p='[{"op":"add","path":"/spec/template/spec/containers/0/args/-","value":"--insecure"}]'

# Expose ArgoCD via NodePort
kubectl patch svc argocd-server \
  -n argocd \
  -p '{"spec": {"type": "NodePort", "ports": [{"port": 80, "nodePort": 30808, "protocol": "TCP", "targetPort": 8080}]}}'

# Get ArgoCD initial admin password
ARGOCD_PASSWORD=$(kubectl -n argocd get secret argocd-initial-admin-secret \
  -o jsonpath="{.data.password}" | base64 -d)

log "ArgoCD installed!"
echo -e "${YELLOW}ArgoCD URL: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):30808${NC}"
echo -e "${YELLOW}Username: admin${NC}"
echo -e "${YELLOW}Password: ${ARGOCD_PASSWORD}${NC}"

# ─────────────────────────────────────────────────────────────
# 6. Install ArgoCD CLI
# ─────────────────────────────────────────────────────────────
log "Installing ArgoCD CLI..."
VERSION=$(curl -s https://api.github.com/repos/argoproj/argo-cd/releases/latest | grep tag_name | cut -d '"' -f 4)
curl -sSL -o /usr/local/bin/argocd \
  https://github.com/argoproj/argo-cd/releases/download/${VERSION}/argocd-linux-amd64
chmod +x /usr/local/bin/argocd
argocd version --client

# ─────────────────────────────────────────────────────────────
# 7. Install Jenkins
# ─────────────────────────────────────────────────────────────
log "Installing Java (Jenkins dependency)..."
sudo apt-get install -yq openjdk-17-jdk

log "Installing Jenkins..."
curl -fsSL https://pkg.jenkins.io/debian-stable/jenkins.io-2023.key | \
  sudo tee /usr/share/keyrings/jenkins-keyring.asc > /dev/null
echo "deb [signed-by=/usr/share/keyrings/jenkins-keyring.asc] \
  https://pkg.jenkins.io/debian-stable binary/" | \
  sudo tee /etc/apt/sources.list.d/jenkins.list > /dev/null
sudo apt-get update -qq
sudo apt-get install -yq jenkins
sudo systemctl enable jenkins
sudo systemctl start jenkins

JENKINS_PASSWORD=$(sudo cat /var/lib/jenkins/secrets/initialAdminPassword 2>/dev/null || echo "Check after boot")
log "Jenkins installed!"
echo -e "${YELLOW}Jenkins URL: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):8080${NC}"
echo -e "${YELLOW}Initial password: ${JENKINS_PASSWORD}${NC}"

# ─────────────────────────────────────────────────────────────
# 8. Install Docker (for Jenkins agent builds)
# ─────────────────────────────────────────────────────────────
log "Installing Docker..."
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker ubuntu
sudo usermod -aG docker jenkins

# ─────────────────────────────────────────────────────────────
# 9. Apply Namespaces + RBAC
# ─────────────────────────────────────────────────────────────
log "Applying namespaces and RBAC..."
kubectl apply -f /home/ubuntu/gitops-repo/rbac/rbac.yaml 2>/dev/null || \
  warn "RBAC not applied — clone gitops-repo first"

# ─────────────────────────────────────────────────────────────
# 10. Summary
# ─────────────────────────────────────────────────────────────
PUBLIC_IP=$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
echo ""
echo -e "${GREEN}============================================${NC}"
echo -e "${GREEN}  WDP301 Setup Complete!${NC}"
echo -e "${GREEN}============================================${NC}"
echo ""
echo "📌 Public IP:     ${PUBLIC_IP}"
echo "🔗 Jenkins:       http://${PUBLIC_IP}:8080"
echo "🔗 ArgoCD:        http://${PUBLIC_IP}:30808"
echo "🔗 App (HTTP):    http://${PUBLIC_IP}:30080"
echo ""
echo "⚡ Next steps:"
echo "  1. Configure Jenkins credentials (Docker Hub, GitHub)"
echo "  2. Create Jenkins pipeline from Jenkinsfile"
echo "  3. Add gitops-repo to ArgoCD"
echo "  4. Push code → Jenkins builds → ArgoCD deploys!"
