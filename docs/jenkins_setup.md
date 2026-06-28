# Hướng dẫn Cài đặt và Cấu hình Jenkins CI/CD

Tài liệu này hướng dẫn cách cài đặt Jenkins trên macOS và thiết lập một Pipeline CI/CD cơ bản cho dự án **WDP301**.

---

## 1. Cài đặt Jenkins

### 1.1 Dành cho macOS
Cách nhanh nhất và dễ quản lý nhất trên macOS là sử dụng **Homebrew**.

**Bước 1: Cài đặt Jenkins**
Mở Terminal và chạy lệnh sau:
```bash
brew install jenkins-lts
```
*(Lưu ý: Bản `lts` là bản ổn định, khuyên dùng cho dự án).*

**Bước 2: Khởi động Jenkins**
Để Jenkins chạy như một service ngầm (tự động bật khi mở máy):
```bash
brew services start jenkins-lts
```

* Sau khi start, Jenkins sẽ chạy ở địa chỉ: `http://localhost:8080`
* Để dừng Jenkins: `brew services stop jenkins-lts`
* Để khởi động lại: `brew services restart jenkins-lts`

### 1.2 Dành cho Windows
Trên Windows, cách phổ biến nhất là tải file cài đặt trực tiếp hoặc dùng Docker. Ở đây hướng dẫn cách cài đặt trực tiếp (Native).

**Bước 1: Cài đặt Java (Bắt buộc)**
Jenkins yêu cầu Java (JDK hoặc JRE) để chạy.
1. Tải và cài đặt **OpenJDK 17** hoặc **OpenJDK 11** (khuyên dùng bản 17).
2. Kiểm tra bằng cách mở Command Prompt (cmd) và gõ: `java -version`.

**Bước 2: Tải và cài đặt Jenkins**
1. Truy cập trang chủ Jenkins: `https://www.jenkins.io/download/`
2. Tại mục **LTS**, chọn **Windows**.
3. Chạy file `.msi` vừa tải về.
4. Trong quá trình cài đặt:
   - Chọn tài khoản chạy service (mặc định là *LocalSystem* hoặc tạo tài khoản riêng).
   - Chọn cổng (Port) mặc định là `8080` (hoặc đổi nếu bị trùng).
   - Trỏ đường dẫn đến thư mục cài đặt Java ở Bước 1.

**Bước 3: Khởi động Jenkins**
Sau khi cài đặt xong, Jenkins sẽ tự động chạy như một Windows Service.
* Truy cập: `http://localhost:8080`
* (Nếu muốn dừng/bật thủ công, mở ứng dụng `Services` trên Windows, tìm `Jenkins` và chọn Start/Stop).

---

## 2. Thiết lập ban đầu (Unlock Jenkins)

Khi truy cập `http://localhost:8080` lần đầu tiên, bạn cần thực hiện các bước sau:

1. **Mở khóa Jenkins (Unlock):** Jenkins sẽ yêu cầu một mật khẩu quản trị viên.
   - **Trên macOS:** Chạy lệnh sau trong Terminal để lấy mật khẩu:
     ```bash
     cat /Users/tranhongphuoc/.jenkins/secrets/initialAdminPassword
     ```
   - **Trên Windows:** Mở file explorer và tìm đến đường dẫn sau (hoặc mở bằng Notepad):
     `C:\Program Files\Jenkins\secrets\initialAdminPassword`
     *(Hoặc đường dẫn hiển thị trên màn hình setup của Jenkins).*
   
   Copy dãy ký tự hiện ra và dán vào ô mật khẩu trên trình duyệt.

2. **Cài đặt Plugin:** Chọn **"Install suggested plugins"** để Jenkins tự động cài đặt các plugin phổ biến nhất (Git, Pipeline, GitHub integration, etc.).

3. **Tạo tài khoản Admin:** Điền thông tin tài khoản admin đầu tiên của bạn.

4. **Cấu hình URL:** Giữ nguyên mặc định `http://localhost:8080` và hoàn thành.

---

## 3. Tạo một Pipeline CI/CD mẫu

Sau khi vào được giao diện chính của Jenkins:

1. Nhấp vào **"New Item"** (Mục mới) ở menu bên trái.
2. Nhập tên item (Ví dụ: `WDP301-Pipeline`).
3. Chọn kiểu **Pipeline** và nhấn **OK**.
4. Kéo xuống phần **Pipeline** ở cuối trang:
   - Trong mục *Definition*, chọn *Pipeline script*.
   - Dán đoạn script mẫu dưới đây vào ô Script:

```groovy
pipeline {
    agent any

    stages {
        stage('Checkout') {
            steps {
                echo '==== Đang tải code từ GitHub ===='
                // Sau này sẽ cấu hình git tại đây
            }
        }
        stage('Build') {
            steps {
                echo '==== Đang Build ứng dụng ===='
                // Ví dụ: sh 'npm install' hoặc sh 'mvn clean install'
            }
        }
        stage('Test') {
            steps {
                echo '==== Đang chạy Test ===='
                // Ví dụ: sh 'npm test'
            }
        }
        stage('Deploy') {
            steps {
                echo '==== Đang Deploy ứng dụng ===='
                // Cấu hình lệnh deploy lên server
            }
        }
    }
    
    post {
        success {
            echo 'Pipeline chạy thành công!'
        }
        failure {
            echo 'Pipeline thất bại, vui lòng kiểm tra lại!'
        }
    }
}
```

5. Nhấn **Save** (Lưu).
6. Nhấn **Build Now** (Xây dựng ngay) ở menu bên trái để chạy thử. Bạn sẽ thấy quá trình chạy hiển thị trực quan theo từng Stage.

---

## 4. Hướng phát triển tiếp theo cho Team

Để hoàn thiện hệ thống CI/CD cho dự án, team cần làm rõ các yếu tố sau và cập nhật vào file này:
- **Tech Stack:** Dự án dùng ngôn ngữ/framework gì? (Cần cài đặt thêm công cụ tương ứng trên Jenkins node).
- **Git Repo:** Cấu hình Webhook để Jenkins tự động chạy khi có code mới đẩy lên GitHub.
- **Môi trường Deploy:** Sẽ deploy lên đâu? (Vercel, Docker, AWS, VPS riêng...).

---

## 5. Cách dừng và Khởi động lại Jenkins (Kết thúc phiên làm việc)

### 5.1 Trên macOS
- **Khởi động:** `brew services start jenkins-lts`
- **Dừng (Tắt hẳn):** `brew services stop jenkins-lts`
- **Khởi động lại:** `brew services restart jenkins-lts`

### 5.2 Trên Windows
- Mở ứng dụng **Services** (Tìm kiếm `Services` trong menu Start).
- Tìm dịch vụ tên là **Jenkins**.
- Chuột phải và chọn **Start**, **Stop**, hoặc **Restart**.

### 5.3 Đăng xuất trên giao diện Web
- Nhấp vào biểu tượng **Log out** (Đăng xuất) ở góc trên cùng bên phải màn hình để thoát tài khoản.
