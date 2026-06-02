/**
 * Supabase Edge Function: recommend-prescription (Groq Version)
 * 
 * Groq Services (Nhanh nhất thế giới) được sử dụng:
 *   - whisper-large-v3           → Chuyển giọng nói thành văn bản (Speech-to-Text)
 *   - llama-3.1-8b-instant       → Tổng hợp đơn thuốc bằng LLM siêu tốc
 * 
 * Database Search:
 *   - Postgres Full-Text Search  → Tìm kiếm trực tiếp trong bảng public.medicines (không cần Vector Embeddings)
 * 
 * ⚠️  CẦN BỔ SUNG: Mở Supabase Dashboard -> Edge Functions -> Secrets, thêm:
 *   - GROQ_API_KEY = gsk_fwz...
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // 0. Đọc input
    const { filePath } = await req.json() as { filePath: string };
    if (!filePath) throw new Error("Missing filePath");

    // 0.1. Lấy biến môi trường
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const groqKey = Deno.env.get("GROQ_API_KEY");

    if (!groqKey) {
      throw new Error("Missing GROQ_API_KEY in Edge Function Secrets");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Tải file ghi âm từ Supabase Storage
    console.log("📂 Step 1: Downloading audio...");
    const { data: fileData, error: downloadError } = await supabase
      .storage
      .from("audio-prescriptions")
      .download(filePath);

    if (downloadError) throw new Error(`Storage download failed: ${downloadError.message}`);

    // 2. Groq Whisper - Chuyển giọng nói thành văn bản
    console.log("🎤 Step 2: Transcribing audio via Groq Whisper...");
    const formData = new FormData();
    formData.append("file", fileData, "audio.webm"); // Groq cũng hỗ trợ định dạng này
    formData.append("model", "whisper-large-v3");
    formData.append("language", "vi"); // Tiếng Việt

    const whisperResponse = await fetch("https://api.groq.com/openai/v1/audio/transcriptions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${groqKey}` },
      body: formData
    });

    if (!whisperResponse.ok) {
      const err = await whisperResponse.text();
      throw new Error(`Groq Whisper Error: ${err}`);
    }

    const whisperResult = await whisperResponse.json();
    const transcribedText = whisperResult.text;
    console.log(`✅ Transcribed: "${transcribedText}"`);

    // 3. Groq Llama 3 - Khám bệnh & Kê đơn (Sử dụng 100% trí tuệ của LLM, không dùng DB)
    console.log("🤖 Step 3: Generating prescription via pure LLM...");
    const chatResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${groqKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `Bạn là trợ lý AI thông minh tại quầy thuốc. Băng ghi âm chứa cuộc hội thoại giữa Dược sĩ và Bệnh nhân.
Nhiệm vụ của bạn:
1. Lắng nghe và trích xuất thông tin cá nhân của bệnh nhân (Tên, Số điện thoại) nếu họ có nhắc đến.
2. Phân tích các triệu chứng, tiền sử bệnh, dị ứng mà bệnh nhân kể cho Dược sĩ.
3. Suy nghĩ như một Bác sĩ chuyên khoa giỏi và kê đơn thuốc an toàn nhất, né tránh các thành phần dị ứng hoặc bệnh nền.

BẮT BUỘC TRẢ VỀ JSON HỢP LỆ có đúng cấu trúc sau (không giải thích thêm):
{
  "patient_info": {
    "name": "Tên bệnh nhân (để trống nếu không có)",
    "phone": "Số điện thoại (để trống nếu không có)"
  },
  "patient_symptoms": "Tóm tắt lại triệu chứng",
  "recommended_drugs": [
    { "name": "Tên thuốc ưu tiên nhất", "active_ingredient": "Hoạt chất", "dosage": "Liều dùng", "usage": "Cách dùng" }
  ],
  "alternative_options": [
    { "name": "Tên thuốc thay thế", "active_ingredient": "Hoạt chất", "reason": "Sự khác biệt hoặc lý do dùng thay thế (ví dụ: Ít tác dụng phụ hơn dạ dày, hoặc giá rẻ hơn)" }
  ],
  "warnings": "Cảnh báo chống chỉ định nếu có"
}
Lưu ý: "alternative_options" phải liệt kê tối đa 3 loại thuốc khác trong danh sách có thể dùng thay thế cho thuốc chính.`
          },
          {
            role: "user",
            content: `Đoạn ghi âm cuộc hội thoại: "${transcribedText}"`
          }
        ],
        temperature: 0.2
      })
    });

    if (!chatResponse.ok) {
      const err = await chatResponse.text();
      throw new Error(`GPT Error: ${err}`);
    }

    const chatResult = await chatResponse.json();
    const recommendation = JSON.parse(chatResult.choices[0].message.content);
    console.log("✅ Prescription generated successfully");

    // 4. Trả kết quả về Frontend
    return new Response(JSON.stringify({
      success: true,
      transcribedText,
      recommendation,
      meta: {
        medicines_searched: 0,
        ai_services_used: ["Groq Whisper-large-v3", "Groq Llama-3.1-8b (Pure AI)"],
        mode: "PURE LLM (No DB Constraint)"
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200
    });

  } catch (error: any) {
    console.error("❌ Edge Function Error:", error.message);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500
    });
  }
});
