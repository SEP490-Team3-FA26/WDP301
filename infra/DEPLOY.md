# WDP301 — Hướng dẫn triển khai hạ tầng AWS

Kiến trúc: **EC2 (docker-compose)** chạy backend → **MongoDB Atlas** (DB), **S3** (ảnh + log),
**SQS → Lambda → SES** (email), **ECR** (image), **GitHub Actions** (CI/CD).
IaC bằng **Terraform** trong thư mục `infra/`.

```
GitHub Actions ──build──► ECR ──pull──► EC2 (gateway/auth/user/inventory/supplier + redis + kafka)
                                              │
                                              ├──► MongoDB Atlas (đã có)
                                              ├──► S3 (ảnh + log)
                                              └──► SQS (email) ──► Lambda ──► SES ──► hộp thư
```

Tài nguyên Terraform tạo ra (28): ECR×2, S3×2 (+ encryption/versioning/lifecycle/cors), SQS+DLQ,
SES identities, Lambda + IAM role + event-source-mapping + log group, IAM instance profile cho EC2,
security group, EC2 + Elastic IP.

---

## ⚠️ Yêu cầu quyền AWS

User `buildlink-deploy` (default profile hiện tại) **KHÔNG đủ quyền** để provision (thiếu cả `ec2:DescribeVpcs`).
Dùng một user/role **có quyền cao** để chạy `terraform apply`. Cần các quyền tạo: `ec2`, `vpc`, `iam`
(role + instance-profile + `iam:PassRole`), `lambda`, `sqs`, `ses`, `s3`, `ecr`, `logs`.
Đơn giản nhất cho đồ án: gắn `AdministratorAccess` cho **một user provisioning riêng**.

---

## Bước 1 — Cấu hình user provisioning thành profile riêng

> Không ghi đè profile default (`buildlink-deploy`). Tạo profile mới.

```bash
aws configure --profile wdp301-deploy
#   AWS Access Key ID     : <key của user quyền cao>
#   AWS Secret Access Key : <secret>
#   Default region name   : ap-southeast-1
#   Default output format : json

export AWS_PROFILE=wdp301-deploy
aws sts get-caller-identity        # xác nhận đúng user quyền cao
```

## Bước 2 — Tạo EC2 key pair (để SSH + cho CI deploy)

```bash
aws ec2 create-key-pair --key-name wdp301-key \
  --region ap-southeast-1 \
  --query 'KeyMaterial' --output text > ~/.ssh/wdp301-key.pem
chmod 400 ~/.ssh/wdp301-key.pem
```

## Bước 3 — Điền giá trị thật vào tfvars

Sửa `infra/environments/dev/terraform.tfvars` (và `prod/` khi lên prod):

```hcl
key_name             = "wdp301-key"                 # tên key pair vừa tạo
ses_from_email       = "no-reply@<domain-bạn>.com"  # địa chỉ gửi (sẽ phải verify)
# SES đang sandbox → thêm MỌI email nhận thử vào đây để nhận được mail:
ses_email_identities = ["no-reply@<domain>.com", "ban@gmail.com"]
cors_allowed_origins = ["http://localhost:3000"]    # hoặc domain frontend
```

> Mongo URI / JWT / OAuth... KHÔNG để trong tfvars — chúng nằm trong `.env` trên EC2 (Bước 7).

## Bước 4 — (khuyến nghị) Remote state trên S3

Để team dùng chung state, không kẹt local. Tạo bucket state 1 lần rồi mở backend trong `main.tf`:

```bash
aws s3 mb s3://wdp301-tf-state-264144511221 --region ap-southeast-1
aws s3api put-bucket-versioning --bucket wdp301-tf-state-264144511221 \
  --versioning-configuration Status=Enabled
```
Bỏ comment block `backend "s3"` trong `infra/main.tf` (sửa tên bucket) rồi `terraform init -migrate-state`.
*(Bỏ qua bước này nếu chỉ deploy 1 mình — state sẽ nằm local.)*

## Bước 5 — Apply

```bash
cd infra
export AWS_PROFILE=wdp301-deploy
terraform init                                          # nếu chưa init
terraform plan  -var-file=environments/dev/terraform.tfvars   # xem trước
terraform apply -var-file=environments/dev/terraform.tfvars   # gõ "yes"
```

Lấy thông tin sau khi apply:
```bash
terraform output                       # tất cả
terraform output -raw ec2_public_ip
terraform output -raw ecr_registry
terraform output backend_env_hints     # các dòng để dán vào .env EC2
```

## Bước 6 — Verify SES (BẮT BUỘC, nếu không email sẽ không gửi được)

1. AWS gửi email xác nhận tới mỗi địa chỉ trong `ses_email_identities` → **mở mail, bấm link verify**.
2. Kiểm tra: `aws ses list-identities --region ap-southeast-1` và trạng thái Verified trong Console.
3. **Thoát sandbox**: SES Console → *Account dashboard* → **Request production access** (~24h).
   Khi còn sandbox: chỉ gửi được tới địa chỉ đã verify.
4. (Tùy chọn) Verify cả domain: set `ses_domain_identity = "<domain>"`, apply, rồi thêm bản ghi
   TXT (`ses_domain_verification_token`) + CNAME DKIM (`ses_dkim_tokens`) vào DNS.

## Bước 7 — Cấu hình EC2 (lần đầu)

user_data đã tự cài Docker + compose + AWS CLI + helper `ecr-login` và tạo `/opt/wdp301`.

```bash
ssh -i ~/.ssh/wdp301-key.pem ubuntu@$(cd infra && terraform output -raw ec2_public_ip)

# Trên EC2:
cd /opt/wdp301
nano .env          # dán từ .env.prod.example + terraform output backend_env_hints + Mongo/JWT...
# (docker-compose.prod.yml sẽ được CI scp sang; lần đầu có thể scp tay)
```

Backend lấy AWS credentials **tự động** qua IAM instance role (không cần access key trong `.env`).

## Bước 8 — GitHub Actions secrets/variables

Repo → Settings → Secrets and variables → Actions:

**Secrets**
| Tên | Giá trị |
|---|---|
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | user có quyền **push ECR** (xem policy dưới) |
| `EC2_HOST` | `terraform output -raw ec2_public_ip` |
| `EC2_SSH_KEY` | toàn bộ nội dung `~/.ssh/wdp301-key.pem` |

**Variables**: `AWS_REGION = ap-southeast-1`

Policy tối thiểu cho CI user (push ECR):
```json
{ "Version": "2012-10-17", "Statement": [{
  "Effect": "Allow",
  "Action": ["ecr:GetAuthorizationToken","ecr:BatchCheckLayerAvailability",
    "ecr:InitiateLayerUpload","ecr:UploadLayerPart","ecr:CompleteLayerUpload",
    "ecr:PutImage","ecr:BatchGetImage","ecr:GetDownloadUrlForLayer"],
  "Resource": "*" }]}
```

## Bước 9 — Tích hợp code backend (CHƯA làm — xem phần dưới)

Để hạ tầng thực sự được dùng, backend cần đổi:
- **Email**: `auth.service.ts` đang gọi `nodemailer.sendMail` trực tiếp → đổi sang **đẩy job vào SQS**
  (`@aws-sdk/client-sqs` → `SendMessageCommand` tới `SQS_EMAIL_QUEUE_URL`). Lambda lo phần gửi SES.
- **Ảnh**: thay Supabase/Cloudinary bằng **S3** (`@aws-sdk/client-s3` PutObject + presigned URL).
- **Log**: ghi log ứng dụng lên bucket `S3_LOGS_BUCKET` (hoặc CloudWatch).

## Bước 10 — Deploy lần đầu & kiểm tra

```bash
git push origin dev        # kích hoạt workflow: test → build → push ECR → deploy EC2
```
Kiểm tra:
```bash
curl http://<EC2_IP>:4000/health             # backend sống
# Trigger luồng email (vd: đăng ký) → kiểm tra SQS có message, Lambda log ở CloudWatch, mail tới hộp thư
# Upload ảnh → object xuất hiện trong bucket S3 images
```

## Teardown (xoá toàn bộ để khỏi tốn phí)

```bash
cd infra && terraform destroy -var-file=environments/dev/terraform.tfvars
```
*(Bucket dev có `force_destroy=true` nên xoá được cả khi còn object. Prod thì không.)*

---

## Ghi chú chi phí (ap-southeast-1, ước tính dev)
- EC2 `t3.small`: ~$15/tháng (tắt khi không dùng để tiết kiệm) · Elastic IP: free khi đang gắn instance
- S3 / SQS / Lambda / SES / ECR: gần như $0 ở mức dev (free tier + lưu lượng thấp)
- MongoDB Atlas: theo gói bạn đã chọn (ngoài AWS)
```
