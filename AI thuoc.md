# Kế hoạch Nâng cấp AI Kiểm tra Tương tác Thuốc (Kiến trúc 4 Tầng Y Khoa)

Nâng cấp hệ thống AI `check_interactions` từ kiểm tra thụ động sang **Kiến trúc 4 Tầng Bảo Vệ Y Khoa Lâm Sàng**, tự động tra cứu Database hoạt chất thực tế, nhận diện chất cấm/chất độc và cảnh báo trùng lặp hoạt chất.

---

## Kiến trúc 4 Tầng Bảo Vệ Y Khoa Lâm Sàng

### Tầng 1: Bộ lọc Chất cấm & Chất kích thích (Substance & Narcotic Safety Filter)
- **Chức năng:** Tự động phát hiện các từ khóa thuộc danh mục chất cấm, chất ma túy, chất kích thích, độc chất, thuốc lá, rượu cồn (ví dụ: `ma túy`, `cần sa`, `heroin`, `thuốc lá`, `rượu`, `bia`, `cồn`...).
- **Xử lý:** Gán ngay mức độ **CỰC KỲ NGUY HIỂM / CHỐNG CHỈ ĐỊNH TUYỆT ĐỐI** kèm cảnh báo tác hại y tế cấp bách, không báo "An toàn".

### Tầng 2: Tra cứu Database Hoạt chất Thực tế (Database Active Ingredient Lookup)
- **Chức năng:** Truy vấn trực tiếp vào Database PostgreSQL/MongoDB (`medicines`) để rút ra:
  - `active_ingredient` (Hoạt chất chính - VD: Paracetamol, Ibuprofen).
  - `contraindications` (Chống chỉ định).
  - `drug_interactions` (Tương tác đã ghi nhận sẵn trong DB).
  - `side_effects` (Tác dụng phụ).

### Tầng 3: Động cơ Phân tích Tương tác & Quá liều Hoạt chất (Active Ingredient Overdose & Interaction Engine)
- **Phát hiện Quá liều/Trùng hoạt chất:** Nếu người dùng nhập các thuốc thương mại trùng hoạt chất (ví dụ: `Panadol` + `Hapacol` -> Đều chứa `Paracetamol`), hệ thống gán mức độ **CAO** và cảnh báo ngộ độc gan/quá liều.
- **Phân tích theo Hoạt chất Y khoa:** Đối chiếu tương tác trực tiếp dựa trên hoạt chất y khoa (Dược lực học & Dược động học) chứ không chỉ nhìn tên thương mại.

### Tầng 4: Lập luận Dược lý Lâm sàng qua LLM & Xuất Báo cáo JSON (LLM Clinical Reasoning & JSON Output)
- **Mô hình:** Groq Llama-3.3-70B với System Prompt được thiết kế theo chuẩn Dược thư Lâm sàng.
- **Báo cáo chuẩn:** Trả về JSON chứa:
  - Mức độ: `Cực kỳ nguy hiểm | Cao | Trung bình | Thấp | An toàn`.
  - Mô tả cơ chế dược lý (ức chế enzyme, tranh chấp liên kết, tăng độc tính).
  - Khuyến nghị cụ thể cho Dược sĩ (Đổi thuốc, giãn cách giờ uống 2h, dừng sử dụng ngay).

---

## Proposed Changes

### AI Service (`backend/apps/ai-service`)

#### [MODIFY] [prescription.py](file:///c:/Users/PhucHe/Downloads/JS/wdp/WDP301/backend/apps/ai-service/routers/prescription.py)
- Cập nhật handler `/api/ai/interactions` tích hợp Tầng 1 (Substance Filter) và Tầng 2 (Query Database/Qdrant cho Hoạt chất & Tương tác).
- Xây dựng hàm kiểm tra trùng lặp hoạt chất (Tầng 3).

#### [MODIFY] [llm_service.py](file:///c:/Users/PhucHe/Downloads/JS/wdp/WDP301/backend/apps/ai-service/services/llm_service.py)
- Cập nhật `INTERACTION_SYSTEM_PROMPT` với đầy đủ quy tắc y khoa lâm sàng 4 tầng (Tầng 4).
- Cập nhật enum mức độ nghiêm trọng: bao gồm `Cực kỳ nguy hiểm`.

---

### API Gateway (`backend/apps/api-gateway`)

#### [MODIFY] [medicine.controller.ts](file:///c:/Users/PhucHe/Downloads/JS/wdp/WDP301/backend/apps/api-gateway/src/controllers/medicine.controller.ts)
- Chuyển tiếp danh sách thuốc từ Frontend đến AI Service để phân tích 4 tầng.

## Verification Plan

### Automated Tests
- Kịch bản 1 (Chất cấm/kích thích): Nhập `"thuốc lá"`, `"cần sa"`, `"ma tuý"` -> Phải trả về `severity = "Cực kỳ nguy hiểm"`.
- Kịch bản 2 (Trùng hoạt chất): Nhập `"Panadol"` + `"Hapacol"` -> Phải trả về `severity = "Cao"` (Quá liều Paracetamol).
- Kịch bản 3 (Tương tác dược lý): Nhập `"Aspirin"` + `"Warfarin"` -> Phải trả về `severity = "Cao"` (Xuất huyết).

### Manual Verification
- Thử nghiệm trực tiếp trên giao diện POS / Kiểm tra tương tác thuốc.
- Xác nhận các thông số `severity`, `description`, `recommendation` hiển thị chuẩn y khoa.
