#!/bin/bash

# Script tiện ích để tự động deploy dự án WDP301 trên VPS sử dụng K3s

echo "🚀 Bắt đầu quy trình deploy trên VPS..."

# 1. Build Docker images (Backend và Frontend)
echo "🐳 1. Đang build Docker images..."
echo "   -> Đang build wdp301-backend:latest..."
docker build -t wdp301-backend:latest . -f ./backend/docker/backend.Dockerfile || {
  echo "⚠️ Lỗi khi build backend. Vui lòng kiểm tra Dockerfile."
  exit 1
}

echo "   -> Đang build wdp301-frontend:latest..."
docker build -t wdp301-frontend:latest . -f ./backend/docker/frontend.Dockerfile || {
  echo "⚠️ Lỗi khi build frontend. Vui lòng kiểm tra Dockerfile."
  exit 1
}

# 2. Import Docker images vào K3s Containerd
echo "📦 2. Đang import images vào K3s..."
docker save wdp301-backend:latest | sudo k3s ctr images import -
docker save wdp301-frontend:latest | sudo k3s ctr images import -

# 3. Deploy hạ tầng cơ bản (Kafka)
echo "📦 3. Đang đồng bộ cấu hình Kafka..."
kubectl apply -f gitops/base/kafka.yaml

# 4. Upgrade/Deploy ứng dụng qua Helm
echo "☸️  4. Đang đồng bộ và khởi chạy các dịch vụ Backend & Frontend (Helm)..."
# Set environment to prod or dev based on your needs
export ENV="dev" 
helm upgrade wdp301-app ./gitops/charts/app -n wdp301 --install --create-namespace \
  -f gitops/charts/app/values.yaml \
  -f gitops/overlays/$ENV/values-override.yaml

# 5. Chờ các Pod sẵn sàng
echo "⏳ 5. Đang đợi tất cả Pod trong namespace 'wdp301' sẵn sàng (Ready)..."
echo "   (Quá trình này có thể mất 1-2 phút)"
kubectl wait --namespace wdp301 \
  --for=condition=Ready pods \
  --all \
  --timeout=300s

echo "✅ Tất cả các Pod đã ở trạng thái READY!"

# 6. Hiển thị thông tin truy cập
IP=$(curl -s ifconfig.me)

echo "🌐 ──────────────────────────────────────────────────"
echo "   🎉 HỆ THỐNG ĐÃ SẴN SÀNG SỬ DỤNG TRÊN VPS!"
echo "   👉 Truy cập Frontend:  http://$IP (nếu Ingress đã được cấu hình trỏ vào đây)"
echo "   👉 Nếu bạn truy cập qua domain, hãy cập nhật DNS trỏ domain dev.wdp301.local về IP: $IP"
echo "🌐 ──────────────────────────────────────────────────"
