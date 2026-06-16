#!/bin/bash
# ============================================================
# Ship docker-compose container logs to the S3 logs bucket.
# Chạy định kỳ bằng cron trên EC2. Credentials lấy từ IAM instance role.
#
# Cài cron (mỗi giờ 1 lần):
#   crontab -e
#   0 * * * * S3_LOGS_BUCKET=wdp301-logs-dev-065320271583 AWS_REGION=ap-southeast-1 /opt/wdp301/ship-logs-to-s3.sh >> /var/log/ship-logs.log 2>&1
# ============================================================
set -euo pipefail

BUCKET="${S3_LOGS_BUCKET:?Cần set S3_LOGS_BUCKET}"
REGION="${AWS_REGION:-ap-southeast-1}"
COMPOSE_FILE="${COMPOSE_FILE:-/opt/wdp301/docker-compose.prod.yml}"
SERVICES="${SERVICES:-backend redis kafka}"
SINCE="${SINCE:-1h}"  # lấy log trong khoảng gần nhất

TS=$(date -u +%Y/%m/%d/%H%M%S)
HOST=$(hostname)
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

cd "$(dirname "$COMPOSE_FILE")"
for svc in $SERVICES; do
  docker compose -f "$COMPOSE_FILE" logs --no-color --since "$SINCE" "$svc" \
    > "$TMP/${svc}.log" 2>/dev/null || true
done

# Nén lại cho gọn rồi đẩy lên S3 theo cây thư mục thời gian
tar -czf "$TMP/logs.tar.gz" -C "$TMP" $(cd "$TMP" && ls *.log 2>/dev/null || true)
aws s3 cp "$TMP/logs.tar.gz" "s3://${BUCKET}/app-logs/${HOST}/${TS}.tar.gz" --region "$REGION"

echo "[$(date -u)] Shipped logs → s3://${BUCKET}/app-logs/${HOST}/${TS}.tar.gz"
