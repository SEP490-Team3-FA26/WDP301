#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "🚀 Bắt đầu cài đặt môi trường Kubernetes (K3s) trên VPS EC2 (Ubuntu)..."

# 1. Cập nhật hệ thống và cài đặt các tiện ích cơ bản
echo "📦 1. Đang cài đặt các gói phụ thuộc..."
sudo apt-get update -y
sudo apt-get install -y curl wget git unzip apt-transport-https ca-certificates gnupg lsb-release vim htop

# 2. Cài đặt Docker
echo "🐳 2. Đang cài đặt Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker ubuntu || true
    sudo usermod -aG docker $USER || true
    rm get-docker.sh
    echo "✅ Docker đã được cài đặt thành công."
else
    echo "✅ Docker đã được cài đặt sẵn."
fi

# 3. Cài đặt K3s (Lightweight Kubernetes phù hợp cho VPS/EC2)
echo "☸️  3. Đang cài đặt K3s..."
if ! command -v k3s &> /dev/null; then
    # Disable default Traefik so we can use NGINX Ingress Controller defined in our Helm charts
    curl -sfL https://get.k3s.io | sh -s - --disable traefik --write-kubeconfig-mode 644
    
    # Configure kubeconfig cho user hiện tại
    mkdir -p ~/.kube
    sudo cp /etc/rancher/k3s/k3s.yaml ~/.kube/config
    sudo chown -R $USER:$USER ~/.kube
    
    if ! grep -q "KUBECONFIG" ~/.bashrc; then
        echo 'export KUBECONFIG=~/.kube/config' >> ~/.bashrc
    fi
    echo "✅ K3s đã được cài đặt thành công."
else
    echo "✅ K3s đã được cài đặt sẵn."
fi

# 4. Cài đặt Helm
echo "⛵ 4. Đang cài đặt Helm..."
if ! command -v helm &> /dev/null; then
    curl -fsSL -o get_helm.sh https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3
    chmod 700 get_helm.sh
    ./get_helm.sh
    rm get_helm.sh
    echo "✅ Helm đã được cài đặt thành công."
else
    echo "✅ Helm đã được cài đặt sẵn."
fi

# 5. Cài đặt NGINX Ingress Controller
echo "🌐 5. Đang cài đặt NGINX Ingress Controller..."
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/controller-v1.8.2/deploy/static/provider/cloud/deploy.yaml

echo "⏳ Đang đợi Ingress Controller sẵn sàng (có thể mất 1-2 phút)..."
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=180s

echo "─────────────────────────────────────────────────────────────"
echo "🎉 HỆ THỐNG KUBERNETES ĐÃ SẴN SÀNG TRÊN VPS!"
echo "─────────────────────────────────────────────────────────────"
echo "👉 Bước tiếp theo để chạy dự án WDP301:"
echo "1. Cấp quyền thực thi cho script deploy: chmod +x scripts/deploy-vps.sh"
echo "2. Chạy script deploy: bash scripts/deploy-vps.sh"
echo ""
echo "⚠️ LƯU Ý: Vui lòng gõ lệnh 'source ~/.bashrc' hoặc đăng xuất rồi đăng nhập lại để các biến môi trường (Docker, Kubeconfig) có hiệu lực."
