import os
from groq import AsyncGroq
import json

api_key = os.getenv("GROQ_API_KEY") or os.getenv("EXPO_PUBLIC_GROQ_API_KEY")
client = AsyncGroq(api_key=api_key)

MEDICAL_SYSTEM_PROMPT = """Bạn là Dược sĩ AI chuyên nghiệp tại Việt Nam. 
Bạn có kiến thức sâu về dược lý, tương tác thuốc, và phác đồ điều trị.

NGUYÊN TẮC BẮT BUỘC:
1. TUYỆT ĐỐI CHỈ KÊ THUỐC CÓ TRONG CƠ SỞ DỮ LIỆU (Context) được cung cấp bên dưới. Nếu CƠ SỞ DỮ LIỆU trống hoặc chứa "Không có dữ liệu ngữ cảnh", KHÔNG ĐƯỢC kê bất kỳ loại thuốc nào (để mảng recommended_drugs rỗng) và ghi vào warnings: "Không tìm thấy thuốc phù hợp trong kho, vui lòng đi khám bác sĩ".
2. Luôn cảnh báo tương tác thuốc nguy hiểm dựa trên Context.
3. Ưu tiên các loại thuốc an toàn và phù hợp triệu chứng nhất từ Context.
4. KHÔNG TỰ BỊA RA THÔNG TIN THUỐC. Mọi loại thuốc được kê phải khớp chính xác 100% với tên trong CƠ SỞ DỮ LIỆU.

--- CƠ SỞ DỮ LIỆU THUỐC ---
{rag_context}
--------------------------
Nhiệm vụ của bạn:
1. Đọc kỹ ĐOẠN HỘI THOẠI (Transcript) giữa Khách hàng và Dược sĩ.
2. Trích xuất thông tin cá nhân của bệnh nhân (Tên, Số điện thoại) nếu có nhắc đến.
3. Phân tích lời khai của Khách hàng: Họ đang có triệu chứng gì? Bệnh gì? Tiền sử dị ứng gì?
4. Phân tích lời khuyên của Dược sĩ: Dược sĩ đã chốt bán thuốc gì? Liều dùng dặn dò ra sao?
5. Từ các thông tin trên, đối chiếu với RAG Context (Dữ liệu tiếng Anh) để dịch và xuất ra Toa Thuốc chuẩn bằng Tiếng Việt.

BẮT BUỘC TRẢ VỀ JSON HỢP LỆ THEO SCHEMA SAU (KHÔNG GIẢI THÍCH THÊM):
{
  "patient_info": {
    "name": "Tên bệnh nhân (để trống nếu không có)",
    "phone": "Số điện thoại (để trống nếu không có)"
  },
  "patient_symptoms": "Tóm tắt lại triệu chứng",
  "recommended_drugs": [
    { "name": "Tên thuốc", "active_ingredient": "Hoạt chất", "dosage": "Liều dùng", "usage": "Cách dùng" }
  ],
  "warnings": "Cảnh báo chống chỉ định nếu có"
}"""

async def generate_prescription(transcript: str, context: str) -> dict:
    """
    Tạo đơn thuốc JSON dựa trên transcript và context từ RAG
    """
    system_prompt = MEDICAL_SYSTEM_PROMPT.replace("{rag_context}", context or "Không có dữ liệu ngữ cảnh.")
    
    response = await client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": f"Đoạn ghi âm cuộc hội thoại: \"{transcript}\""}
        ],
        temperature=0.1,
        response_format={"type": "json_object"}
    )
    
    content = response.choices[0].message.content
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        return {"error": "Lỗi phân tích JSON từ LLM", "raw_content": content}

INTERACTION_SYSTEM_PROMPT = """Bạn là Dược sĩ lâm sàng AI chuyên nghiệp.
Nhiệm vụ của bạn là phân tích tương tác giữa các loại thuốc dựa trên CƠ SỞ DỮ LIỆU được cung cấp.

--- CƠ SỞ DỮ LIỆU THUỐC ---
{rag_context}
--------------------------
Danh sách các thuốc được yêu cầu kiểm tra: {medicines_list}

BẮT BUỘC TRẢ VỀ JSON HỢP LỆ THEO SCHEMA SAU (KHÔNG GIẢI THÍCH THÊM):
{
  "has_interactions": true,
  "severity": "Cao | Trung bình | Thấp | An toàn",
  "interactions": [
    {
      "drug_a": "Tên thuốc 1",
      "drug_b": "Tên thuốc 2",
      "description": "Mô tả tương tác và hậu quả",
      "recommendation": "Khuyến nghị xử lý (VD: Giãn cách giờ uống, đổi thuốc)"
    }
  ],
  "general_advice": "Lời khuyên tổng quát cho Dược sĩ"
}"""

async def check_drug_interactions(medicines_list: list[str], context: str) -> dict:
    """
    Tạo báo cáo tương tác thuốc JSON dựa trên danh sách thuốc và context từ RAG
    """
    system_prompt = INTERACTION_SYSTEM_PROMPT.replace(
        "{rag_context}", context or "Không có dữ liệu ngữ cảnh."
    ).replace(
        "{medicines_list}", ", ".join(medicines_list)
    )
    
    response = await client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": "Hãy phân tích tương tác giữa các loại thuốc trên."}
        ],
        temperature=0.1,
        response_format={"type": "json_object"}
    )
    
    content = response.choices[0].message.content
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        return {"error": "Lỗi phân tích JSON từ LLM", "raw_content": content}

FORECAST_SYSTEM_PROMPT = """Bạn là Chuyên gia Kế hoạch & Phân tích Chuỗi cung ứng Dược phẩm bằng AI tại Việt Nam.
Nhiệm vụ của bạn là phân tích báo cáo doanh số kỳ trước và tồn kho hiện tại để đề xuất nhu cầu nhập thêm hàng cho kỳ tiếp theo.

NGUYÊN TẮC QUAN TRỌNG:
1. Bạn phải phân tích dựa trên:
   - Tốc độ bán trung bình ngày (averageDailySales).
   - Tồn kho thực tế hiện tại (currentStock).
   - Số lượng hàng đang trên đường về (expectedIncoming).
   - Định mức tồn tối thiểu (minStock).
2. Hãy tính toán đề xuất nhập kho:
   - Nếu tồn kho hiện tại + hàng đang về không đủ dùng cho số ngày dự báo kỳ tới (periodDays), hãy đề xuất nhập thêm.
   - Công thức gợi ý: Đề xuất nhập thêm = tối đa là (Tốc độ bán ngày * Số ngày dự báo + Dự phòng an toàn) - (Tồn hiện tại + Hàng đang về).
3. Đánh giá mức độ khẩn cấp (urgency):
   - "HIGH": Khi tồn kho hiện tại gần bằng 0 hoặc hết hàng hoàn toàn mà tốc độ bán nhanh.
   - "MEDIUM": Khi tồn kho hiện tại dưới định mức minStock hoặc sắp hết hàng trong vòng 10 ngày tới.
   - "LOW": Khi tồn kho dồi dào nhưng cần bổ sung nhẹ để duy trì hoạt động bình thường.
4. Trả về đúng định dạng JSON mà KHÔNG giải thích thêm gì khác ngoài nội dung JSON.

BẮT BUỘC TRẢ VỀ JSON HỢP LỆ THEO SCHEMA SAU:
{
  "summary": "Tóm tắt xu hướng tồn kho và phân tích thị trường toàn cảnh",
  "recommendations": [
    {
      "medicineId": "ID của thuốc",
      "name": "Tên thuốc",
      "currentStock": 100,
      "averageDailySales": 5.2,
      "expectedIncoming": 0,
      "suggestedOrderQty": 150,
      "urgency": "HIGH | MEDIUM | LOW",
      "reason": "Lý do AI phân tích cụ thể cho loại thuốc này (VD: nhu cầu tăng cao, sắp hết hàng...)"
    }
  ]
}"""

async def generate_demand_forecast(dataset: list, period_days: int) -> dict:
    """
    Tạo dự báo nhu cầu nhập hàng JSON dựa trên dataset lịch sử bán hàng và tồn kho
    """
    dataset_str = json.dumps(dataset, ensure_ascii=False)
    
    user_prompt = f"Số ngày dự báo kỳ tới: {period_days} ngày. Dưới đây là dữ liệu tồn kho và bán hàng thô:\n{dataset_str}"
    
    response = await client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": FORECAST_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt}
        ],
        temperature=0.2,
        response_format={"type": "json_object"}
    )
    
    content = response.choices[0].message.content
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        return {"error": "Lỗi phân tích JSON dự báo từ LLM", "raw_content": content}
