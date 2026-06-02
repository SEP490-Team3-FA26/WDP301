#!/bin/bash

echo "🚀 Bắt đầu Port-forward các service từ Kubernetes ra localhost..."

# Khởi chạy port-forward trong background (chạy ngầm)
kubectl port-forward svc/frontend-svc -n wdp301 3000:3000 >/dev/null 2>&1 &
FRONTEND_PID=$!

kubectl port-forward svc/backend-svc -n wdp301 4000:4000 >/dev/null 2>&1 &
BACKEND_PID=$!

kubectl port-forward svc/my-kafka -n kafka 9092:9092 >/dev/null 2>&1 &
KAFKA_PID=$!

# (Tuỳ chọn) Chạy thêm port-forward cho MongoDB nếu cần truy cập DB từ local
# kubectl port-forward svc/mongodb-svc -n wdp301 27017:27017 >/dev/null 2>&1 &
# MONGO_PID=$!

echo "✅ Đã chạy ngầm xong!"
echo "   - Frontend (Vite): http://localhost:3000 (PID: $FRONTEND_PID)"
echo "   - Backend (API):   http://localhost:4000 (PID: $BACKEND_PID)"
echo "   - Kafka Broker:    localhost:9092 (PID: $KAFKA_PID)"
echo ""
echo "🛑 Để dừng toàn bộ các port-forward này, chạy lệnh:"
echo "kill $FRONTEND_PID $BACKEND_PID $KAFKA_PID"
