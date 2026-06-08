# Hướng Dẫn Khởi Chạy Dự Án Nhanh 🚀

## Cách 1: Chạy bằng Docker (Nhanh nhất) 🐳

Chạy lệnh duy nhất tại thư mục gốc để khởi động Frontend, Backend, Redis và Kafka:

```bash
docker compose up -d
```

*Để dừng dự án:* `docker compose down`

---

## Cách 2: Chạy kết hợp K8s và Local (Dành cho Developer) 🧑‍💻
Cách này dùng K8s để chạy hạ tầng (Kafka/DB), còn code Frontend/Backend chạy trên máy thật để dễ sửa code.

**Bước 1: Khởi động Minikube & Cài đặt Kafka**
```bash
minikube start  
kubectl create ns kafka
kubectl apply -f gitops/base/kafka.yaml
```

**Bước 2: Kéo cổng Kafka ra ngoài**
Mở một tab Terminal và chạy lệnh sau (để nguyên không tắt):
```bash
kubectl port-forward svc/my-kafka -n kafka 9092:9092
```

**Bước 3: Chạy Code Backend & Frontend cục bộ**
Mở 2 tab Terminal mới:
- Tab 1 (Backend): `cd backend && npm install && npm run dev:all`
- Tab 2 (Frontend): `cd frontend && npm install && npm run dev`

---

## Cách 3: Chạy toàn bộ trên Kubernetes (Dành cho DevOps) ☸️
Cách này đóng gói toàn bộ app (Frontend, Backend) và đẩy lên chạy 100% bằng Kubernetes thông qua Helm chart.

**Bước 1: Build Docker Images**
Mở Terminal, trỏ Docker vào Minikube để build image thẳng vào K8s:
```bash
eval $(minikube docker-env)
cd backend && docker build -t wdp301-backend:latest -f docker/Dockerfile .
cd ../frontend && docker build -t wdp301-frontend:latest -f Dockerfile .
cd ..
```

**Bước 2: Khởi tạo hạ tầng & Deploy App bằng Helm**
```bash
minikube start 
kubectl create ns kafka
kubectl apply -f gitops/base/kafka.yaml

helm install wdp301-app ./gitops/charts/app -n wdp301 --create-namespace
```

**Bước 3: Mở Port-forward để sử dụng**
Sau khi Pod đã Running, mở 2 tab Terminal:
```bash
kubectl port-forward svc/frontend-svc -n wdp301 3000:3000
kubectl port-forward svc/backend-svc -n wdp301 4000:4000
```
Bây giờ bạn có thể truy cập `http://localhost:3000` (Frontend) trên trình duyệt.


**Lênệ xem dashboard K8S**
```bash
minikube dashboard
```

**Lệnh mở Argo CD**
Để truy cập vào Argo CD, anh cần thực hiện 2 bước (mở cổng port-forward và lấy mật khẩu admin):

Bước 1: Mở cổng (Port-forward) Argo CD Server Mở một tab Terminal mới và chạy lệnh sau để kéo trang quản trị Argo CD ra cổng 8443 máy thật:
```bash
kubectl port-forward svc/argocd-server -n argocd 8443:443
```
Bước 2: Lấy mật khẩu đăng nhập (Username là admin) Chạy lệnh sau trên terminal để giải mã mật khẩu khởi tạo của Argo CD:
```bash
kubectl -n argocd get secret argocd-initial-admin-secret -o jsonpath="{.data.password}" | base64 -d

```

**Khi làm việc xong:** Chạy `minikube stop` để giải phóng RAM.
