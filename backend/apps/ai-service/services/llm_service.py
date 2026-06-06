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
