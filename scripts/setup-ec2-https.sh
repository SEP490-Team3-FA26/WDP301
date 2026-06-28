#!/bin/bash
# ============================================================
# Dựng HTTPS cho backend API trên EC2.
#   Nginx reverse proxy:  https://api.abcpharmacy.store  ->  127.0.0.1:4000
#   TLS cert: Let's Encrypt (certbot, tự gia hạn).
#
# Yêu cầu trước khi chạy (TRÊN EC2):
#   1. DNS A record: api.abcpharmacy.store -> <IP EC2>  (đã thêm ở Namecheap)
#   2. Backend đang chạy (docker compose up) và nghe cổng 4000
#   3. Security group mở 80 + 443 (đã mở sẵn)
#
# Cách chạy:
#   sudo DOMAIN=api.abcpharmacy.store EMAIL=you@abcpharmacy.store bash setup-ec2-https.sh
# ============================================================
set -euo pipefail

DOMAIN="${DOMAIN:-api.abcpharmacy.store}"
EMAIL="${EMAIL:?Cần set EMAIL=... (email để Let's Encrypt thông báo gia hạn)}"
BACKEND_PORT="${BACKEND_PORT:-4000}"

export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get install -yq nginx certbot python3-certbot-nginx

# --- Nginx reverse proxy (HTTP trước, certbot sẽ tự thêm cấu hình HTTPS) ---
cat > /etc/nginx/sites-available/wdp301-api <<NGINX
server {
    listen 80;
    server_name ${DOMAIN};

    client_max_body_size 10m;   # cho upload ảnh

    location / {
        proxy_pass http://127.0.0.1:${BACKEND_PORT};
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_read_timeout 60s;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/wdp301-api /etc/nginx/sites-enabled/wdp301-api
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

# --- Xin cert + tự cấu hình HTTPS + redirect 80->443 ---
certbot --nginx -d "${DOMAIN}" --non-interactive --agree-tos -m "${EMAIL}" --redirect

systemctl reload nginx
echo "✅ HTTPS sẵn sàng: https://${DOMAIN}  (proxy -> backend:${BACKEND_PORT})"
echo "   Certbot sẽ tự gia hạn cert (systemd timer)."
