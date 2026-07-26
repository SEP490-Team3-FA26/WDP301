# Phân tích Chức năng AI Kiểm tra Tương tác Thuốc -- Vấn đề & Tư vấn

## Hiện trạng: AI đang "bịa" kết quả

Từ hình ảnh màn hình của mày, tao thấy 2 lỗi nghiêm trọng:

| Kịch bản kiểm thử (Test Case) | Đầu vào (Input) | Kết quả AI trả về | Đúng hay Sai |
|---|---|---|---|
| Chất cấm | "thuốc lá" + "cần sa" | **An toàn** | **SAI** -- Đây là chất kích thích/chất cấm, phải cảnh báo nguy hiểm |
| Trùng lặp | "thuốc lá" + "thuốc lá" | **Cảnh báo Tương tác Cao** với "Viên nhai OH NO" | **SAI** -- Bịa ra thuốc "Viên nhai OH NO" không hề tồn tại |

---

## Nguyên nhân gốc rễ (Root Cause Analysis)

### 1. LLM (Llama 3.3 70B) không có kiến thức y khoa sẵn

> [!CAUTION]
> Đây là vấn đề nghiêm trọng nhất. Llama 3 là **general-purpose LLM** (mô hình ngôn ngữ đa dụng), không được tinh chỉnh chuyên sâu (fine-tune) cho dược lý. Khi hỏi về tương tác thuốc, nó sẽ **hallucinate** (bịa ra thông tin).

Hiện tại, luồng xử lý trong [check_interactions](file:///c:/Users/PhucHe/Downloads/JS/wdp/WDP301/backend/apps/ai-service/routers/prescription.py#L492-L507):

```
Giao diện người dùng (Frontend) -> Cổng kết nối (Gateway) -> Dịch vụ AI (AI Service):
1. Lấy tên thuốc từ người dùng (VD: "thuốc lá", "cần sa")
2. Truy vấn mỗi tên thuốc vào Qdrant (tìm kiếm vector) -> lấy ngữ cảnh ("context")
3. Gửi ngữ cảnh + danh sách thuốc -> Llama 3 -> LLM tự phân tích
4. Trả kết quả JSON về Frontend
```

**Vấn đề cụ thể:**

- **Bước 2 (RAG)**: Khi người dùng nhập "thuốc lá" hoặc "cần sa", Qdrant tìm kiếm độ tương đồng vector với cơ sở dữ liệu `medical_knowledge` -- mà dữ liệu này chỉ chứa thuốc dược phẩm từ MongoDB (tên thuốc thương mại như Paracetamol, Amoxicillin...). Kết quả: **không tìm thấy gì hoặc trả về thuốc không liên quan**.
- **Bước 3 (LLM)**: Llama 3 nhận `context = ""` (rỗng) hoặc ngữ cảnh không liên quan, rồi **tự bịa ra** kết quả. Nó không biết "thuốc lá" là chất kích thích, và nó bịa ra "Viên nhai OH NO" -- một loại thuốc **không tồn tại**.

### 2. Không có bộ lọc chất cấm/chất kích thích (Tầng 1 trong kế hoạch)

Hiện tại [INTERACTION_SYSTEM_PROMPT](file:///c:/Users/PhucHe/Downloads/JS/wdp/WDP301/backend/apps/ai-service/services/llm_service.py#L128-L149) **chỉ có 4 mức độ nghiêm trọng (severity)**: `Cao | Trung bình | Thấp | An toàn`. Không có `Cực kỳ nguy hiểm` và không có bất kỳ logic nào để phát hiện chất cấm.

### 3. Không tra cứu Cơ sở dữ liệu hoạt chất thực tế (Tầng 2)

Hàm [check_interactions](file:///c:/Users/PhucHe/Downloads/JS/wdp/WDP301/backend/apps/ai-service/routers/prescription.py#L492-L507) **không truy vấn MongoDB** để lấy `active_ingredient` (hoạt chất), `contraindications` (chống chỉ định), hay `drug_interactions` (tương tác thuốc) thực tế. Nó chỉ dựa vào ngữ cảnh RAG từ Qdrant (tìm kiếm vector), mà Qdrant không có dữ liệu tương tác thuốc chuyên sâu.

### 4. Không phát hiện trùng hoạt chất (Tầng 3)

Không có logic nào so sánh `active_ingredient` giữa các thuốc để phát hiện Panadol + Hapacol đều chứa Paracetamol -> nguy cơ quá liều.

---

## Trả lời các câu hỏi của mày

### "File MD kế hoạch có đúng không?"

**Có, kế hoạch 4 tầng trong file [AI thuoc.md](file:///c:/Users/PhucHe/Downloads/JS/wdp/WDP301/AI%20thuoc.md) là ĐÚNG về mặt kiến trúc.** Nó đã nhận diện chính xác 4 vấn đề cần giải quyết. Nhưng hiện tại **chưa có dòng code nào được cài đặt (implement)** -- tất cả vẫn đang chạy logic cũ.

### "Làm sao cho AI kiến thức chuẩn y khoa?"

Có **3 hướng chính**, sắp xếp theo độ khả thi:

#### Hướng 1: Quy tắc cố định (Hard-code) + Logic xác định (Deterministic Logic) (KHUYÊN NGHỊ cho dự án)

> [!TIP]
> Đây là hướng thực tế nhất, không cần API key xịn, không tốn tiền, và **đảm bảo chính xác 100%** cho các trường hợp cơ bản.

- **Tầng 1 (Chất cấm)**: Bộ lọc từ khóa (keyword). Danh sách `["thuốc lá", "cần sa", "heroin", "ma túy", "cocaine", "methamphetamine"]`. Không cần AI, kiểm tra chuỗi khớp (string match) là đủ.
- **Tầng 2 (Tra cứu DB)**: Truy vấn MongoDB collection `medicines` để lấy `active_ingredient` thực tế. Dữ liệu này đã có sẵn trong DB của mày.
- **Tầng 3 (Trùng hoạt chất)**: So sánh `active_ingredient` giữa các thuốc. Nếu trùng -> cảnh báo quá liều. Đây là logic xác định (deterministic), không cần LLM.
- **Tầng 4 (LLM bổ sung)**: Chỉ dùng Llama 3 để **diễn giải văn bản** (tạo câu mô tả đẹp) sau khi đã có kết quả từ 3 tầng trên. LLM **không quyết định** mức độ nghiêm trọng -- mức độ do Tầng 1-3 quyết định.

#### Hướng 2: Cơ sở dữ liệu Tương tác Thuốc Chuyên dụng

Nhập cơ sở dữ liệu tương tác thuốc chuyên dụng (VD: DrugBank, Medscape interaction database) vào MongoDB hoặc Qdrant. Đây là cách làm của các hệ thống y tế thực tế.

- **Ưu điểm**: Chính xác cao, dựa trên dữ liệu y khoa đã được kiểm chứng.
- **Nhược điểm**: Cần nhập dữ liệu (mất công), bản quyền dữ liệu y khoa có thể phức tạp.

#### Hướng 3: Dùng Mô hình LLM mạnh hơn (GPT-4, Claude, Gemini)

- **Ưu điểm**: LLM lớn hơn có kiến thức y khoa tốt hơn Llama 3.
- **Nhược điểm**: **Vẫn có thể bịa (hallucinate)**, tốn tiền API, không phải giải pháp gốc rễ.

> [!WARNING]
> **Dùng mô hình LLM mạnh hơn KHÔNG phải là giải pháp gốc rễ.** GPT-4 vẫn có thể bịa. Vấn đề là LLM không nên là nguồn sự thật duy nhất cho dữ liệu y khoa. Cần phải có **tầng kiểm tra xác định (Deterministic)** (Tầng 1-3) để đảm bảo.

### "Có cần API key xịn hơn không?"

**KHÔNG cần đổi API key.** Groq Llama 3.3 70B hiện tại đã đủ cho Tầng 4 (diễn giải văn bản). Vấn đề không phải là LLM yếu mà là **thiếu logic kiểm tra trước khi gọi LLM**.

### "Có cần truy cập database không, để làm gì?"

**CÓ, bắt buộc.** Đây là cốt lõi của giải pháp:

| Mục đích | Collection MongoDB | Trường cần truy vấn |
|---|---|---|
| Lấy hoạt chất thực tế | `medicines` | `active_ingredient`, `thong_tin_chi_tiet.Thành phần` |
| Lấy chống chỉ định | `medicines` | `contraindications`, `thong_tin_chi_tiet.Chống chỉ định` |
| Lấy tương tác đã biết | `medicines` | `drug_interactions` |

Hiện tại hàm `check_interactions` trong [prescription.py](file:///c:/Users/PhucHe/Downloads/JS/wdp/WDP301/backend/apps/ai-service/routers/prescription.py#L492-L507) **chỉ dùng RAG/Qdrant** (tìm kiếm vector), không truy vấn MongoDB trực tiếp. Cần bổ sung truy vấn MongoDB để lấy dữ liệu chính xác.

---

## Kế hoạch cài đặt (Implement) khuyến nghị

### Tầng 1: Bộ lọc Chất cấm (Xác định -- không cần LLM)
```python
BANNED_SUBSTANCES = {
    "thuốc lá", "cần sa", "heroin", "ma túy", "cocaine",
    "methamphetamine", "morphine", "codeine", "fentanyl",
    "ecstasy", "lsd", "ketamine", "rượu", "bia", "cồn"
}
# Kiểm tra ở đầu hàm xử lý (handler), TRƯỚC khi gọi RAG/LLM
```

### Tầng 2: Truy vấn MongoDB để lấy hoạt chất (Xác định)
```python
# Tìm thuốc trong MongoDB, lấy active_ingredient thực tế
for medicine_name in req.medicines:
    doc = collection.find_one({"name": {"$regex": medicine_name, "$options": "i"}})
    if doc:
        active_ingredients.append(doc.get("active_ingredient"))
        contraindications.append(doc.get("contraindications"))
```

### Tầng 3: Phát hiện trùng hoạt chất (Xác định)
```python
# So sánh active_ingredient giữa các thuốc
from collections import Counter
ingredient_count = Counter(active_ingredients)
duplicates = {k: v for k, v in ingredient_count.items() if v > 1}
# Nếu có trùng -> cảnh báo quá liều
```

### Tầng 4: Gọi LLM để diễn giải (Vẫn dùng Llama 3)
```python
# Chỉ gọi LLM SAU KHI đã có kết quả từ Tầng 1-3
# LLM chỉ làm nhiệm vụ: tạo câu mô tả đẹp, không quyết định mức độ nghiêm trọng
```

---

## Tóm tắt

| Câu hỏi | Trả lời |
|---|---|
| File MD kế hoạch đúng không? | **Đúng**, nhưng chưa được cài đặt (implement) |
| Cần API key xịn hơn? | **Không** -- vấn đề không phải do LLM yếu |
| Cần truy cập DB? | **Có** -- phải truy vấn MongoDB lấy hoạt chất thực tế |
| Làm sao cho AI chuẩn? | **Kết hợp 4 tầng**: 3 tầng xác định (deterministic) + 1 tầng LLM diễn giải |

> [!IMPORTANT]
> Giải pháp cốt lõi: **Tầng 1-3 (xác định/deterministic) quyết định mức độ nghiêm trọng (severity), Tầng 4 (LLM) chỉ diễn giải văn bản.** Không để LLM tự quyết định khi nào thuốc nguy hiểm -- nó sẽ bịa.
