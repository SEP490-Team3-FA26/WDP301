# Kế hoạch Refactor tối ưu RAM cho EC2 2GB (t3.small)

Hệ thống hiện tại gồm: 6 NestJS Microservices + Kafka + Redis. 
Với 2GB RAM, Kafka là "kẻ ngốn RAM" nặng nhất (~1GB), theo sau là 6 process NodeJS độc lập. Để nhét vừa hệ thống vào 2GB RAM mà không bị sập, chúng ta có 3 hướng đi (từ dễ đến khó).

## Open Questions

Anh muốn chọn phương án nào dưới đây để em tiến hành thực thi?
> [!NOTE] 
> Nếu đây là dự án môn học/đồ án và anh muốn giữ lại Kafka để có điểm công nghệ cao, hãy chọn **Cách 1**. Nếu anh muốn hệ thống siêu nhẹ và dễ maintain, hãy chọn **Cách 3**.

---

## Các Phương Án Đề Xuất

### CÁCH 1: Giữ nguyên Code, Chỉ tối ưu Infra (Dễ nhất - Đề xuất nếu muốn giữ Kafka)
Không sửa code logic, chỉ cấu hình lại Docker và Linux để vắt kiệt hiệu năng.
- **Thay đổi:**
  - Thêm giới hạn Heap Size cho Kafka: `KAFKA_HEAP_OPTS="-Xmx256M -Xms256M"`.
  - Thêm giới hạn RAM cho 6 process NodeJS: `NODE_OPTIONS="--max-old-space-size=128"`.
  - Config tạo 2GB Swap Space trên EC2 tự động trong CI/CD.
- **Ưu điểm:** Giữ nguyên kiến trúc Kafka + Microservices (điểm cộng cho đồ án). Rất nhanh để triển khai.
- **Nhược điểm:** Server vẫn sẽ chạy khá gắt gao (sát giới hạn RAM), thỉnh thoảng có thể hơi chậm do dùng Swap (RAM ảo ổ cứng).

### CÁCH 2: Giữ Microservices, Thay Kafka bằng Redis Pub/Sub (Trung bình)
Redis hiện tại đã có sẵn trong project và ngốn cực kỳ ít RAM (~50MB so với ~1GB của Kafka).
- **Thay đổi:**
  - Xóa bỏ Kafka khỏi `docker-compose.prod.yml`.
  - Refactor toàn bộ `@Client({ transport: Transport.KAFKA })` thành `Transport.REDIS`.
  - Đổi các `@MessagePattern` và cấu hình Kafka tương ứng.
- **Ưu điểm:** Vẫn giữ nguyên được kiến trúc Microservices. Tiết kiệm ngay ~1GB RAM, chạy mượt mà trên 2GB.
- **Nhược điểm:** Phải sửa lại một chút file cấu hình kết nối ở các services. Mất đi công nghệ Kafka (nếu thầy cô yêu cầu Kafka).

### CÁCH 3: Gom thành Modular Monolith (Khó nhất - Phá bỏ Microservices)
Chuyển từ Microservices về lại 1 cục backend duy nhất (Monolith).
- **Thay đổi:**
  - Gộp 6 thư mục services vào thành các module trong 1 project duy nhất.
  - Xóa hoàn toàn Kafka và Redis (nếu Redis chỉ dùng cho pub/sub).
  - Các service gọi nhau trực tiếp qua hàm (Function call / Service Injection) thay vì qua Message Broker.
- **Ưu điểm:** Tối ưu RAM tuyệt đối (chỉ còn khoảng ~150MB - 200MB RAM cho toàn bộ backend). Server chạy dư sức. Code dễ debug hơn nhiều.
- **Nhược điểm:** Mất hoàn toàn kiến trúc Microservices. Tốn nhiều thời gian refactor code nhất.

---

## User Review Required
> [!IMPORTANT]
> Anh hãy chọn **Cách 1, 2, hay 3** để em bắt đầu refactor nhé. Em khuyên dùng **Cách 1** trước vì anh vừa deploy lên nhánh dev, nếu chỉ cần qua môn/trình diễn ổn định thì cách 1 là an toàn nhất!
