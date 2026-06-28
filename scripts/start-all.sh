#!/bin/bash

# Script tiện ích để tự động hóa toàn bộ quy trình khởi chạy dự án WDP301 trên Minikube
# Tác dụng: Bật minikube -> Deploy/Upgrade App -> Đợi các Pod sẵn sàng -> Tự động Port-forward -> Xem logs.

echo "🚀 Bắt đầu quy trình khởi chạy toàn bộ hệ thống..."

# 1. Khởi động Minikube
echo "🔌 1. Đang khởi động Minikube..."
minikube start

# Cấu hình lại context để đảm bảo kubectl trỏ đúng
minikube update-context

# 2. Deploy hạ tầng cơ bản (Kafka)
echo "📦 2. Đang đồng bộ cấu hình Kafka..."
kubectl apply -f gitops/base/kafka.yaml

# 3. Upgrade/Deploy ứng dụng qua Helm
echo "☸️  3. Đang đồng bộ và khởi chạy các dịch vụ Backend & Frontend (Helm)..."
helm upgrade wdp301-app ./gitops/charts/app -n wdp301 --install --create-namespace

# 4. Chờ các Pod sẵn sàng
echo "⏳ 4. Đang đợi tất cả Pod trong namespace 'wdp301' sẵn sàng (Ready)..."
echo "   (Quá trình này có thể mất 1-2 phút để biên dịch code TypeScript)"
kubectl wait --namespace wdp301 \
  --for=condition=Ready pods \
  --all \
  --timeout=300s

echo "✅ Tất cả các Pod đã ở trạng thái READY!"

# 5. Tắt các tiến trình port-forward cũ nếu có để tránh xung đột cổng
echo "🔄 5. Đang dọn dẹp các tiến trình Port-forward cũ..."
kill -9 $(pgrep -f "port-forward svc/frontend-svc") > /dev/null 2>&1
kill -9 $(pgrep -f "port-forward svc/backend-svc") > /dev/null 2>&1

# 6. Khởi chạy Port-forward chạy ngầm (Background)
echo "🔗 6. Đang thiết lập Port-forward..."
kubectl port-forward svc/frontend-svc -n wdp301 3000:3000 > /dev/null 2>&1 &
kubectl port-forward svc/backend-svc -n wdp301 4000:4000 > /dev/null 2>&1 &

echo "🌐 ──────────────────────────────────────────────────"
echo "   🎉 HỆ THỐNG ĐÃ SẴN SÀNG SỬ DỤNG!"
echo "   👉 Truy cập Frontend:  http://localhost:3000"
echo "   👉 Truy cập Swagger:   http://localhost:4000/api/docs"
echo "🌐 ──────────────────────────────────────────────────"

# 7. Khởi chạy xem logs
bash scripts/k8s-logs.sh
