#!/bin/bash
# Script để xem log của tất cả các pod trong namespace wdp301 giống như docker-compose up

echo "🔍 Đang khởi động Stern để theo dõi log của tất cả các dịch vụ..."
echo "💡 (Bấm Ctrl+C để thoát)"
echo "---------------------------------------------------"

# Kiểm tra xem stern có cài chưa
if ! command -v stern &> /dev/null
then
    echo "❌ Không tìm thấy stern. Đang tự động cài đặt qua brew..."
    brew install stern
fi

# Chạy stern để theo dõi log của TẤT CẢ các pod trong namespace wdp301
# Tham số "." đại diện cho regex match mọi pod
stern "." -n wdp301 --color always