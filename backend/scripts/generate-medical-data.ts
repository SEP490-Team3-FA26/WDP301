import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DATABASE_URL = process.env.DATABASE_URL;
const GROQ_API_KEY = process.env.EXPO_PUBLIC_GROQ_API_KEY;

if (!DATABASE_URL || !GROQ_API_KEY) {
  console.error("Missing environment variables");
  process.exit(1);
}

// Strip pgbouncer query if present to avoid unsupported options in pg
const connectionString = DATABASE_URL.replace('?pgbouncer=true', '');

const client = new Client({
  connectionString: connectionString,
});

async function generateDataForMedicine(name: string, active_ingredient: string, category: string): Promise<any> {
  const prompt = `Bạn là Dược sĩ AI chuyên nghiệp.
Hãy sinh ra thông tin Y tế chuẩn xác (Tiếng Việt) cho loại thuốc sau:
- Tên thuốc: ${name}
- Hoạt chất: ${active_ingredient}
- Nhóm: ${category}

Yêu cầu trả về JSON hợp lệ có định dạng sau:
{
  "drug_interactions": "Nêu 1-2 tương tác chính (dưới 10 chữ)",
  "side_effects": "Nêu 1-2 tác dụng phụ chính (dưới 10 chữ)",
  "stock_quantity": Số nguyên từ 10 đến 100,
  "price": Số nguyên từ 10000 đến 500000
}
TRẢ VỀ ĐÚNG JSON, KHÔNG THÊM BẤT KỲ TỪ NÀO KHÁC.`;

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${GROQ_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "llama-3.1-8b-instant",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.1,
      response_format: { type: "json_object" }
    })
  });

  if (!response.ok) {
    throw new Error(`Groq API Error: ${await response.text()}`);
  }

  const result = await response.json();
  return JSON.parse(result.choices[0].message.content);
}

async function run() {
  await client.connect();
  console.log("Connected to PostgreSQL database");

  let hasMore = true;
  let totalProcessed = 0;

  while (hasMore) {
    console.log("Fetching next batch of medicines missing drug_interactions...");
    const res = await client.query(`
      SELECT id, name, active_ingredient, category 
      FROM public.medicines 
      WHERE drug_interactions IS NULL 
      LIMIT 10
    `);
    
    const medicines = res.rows;

    if (medicines.length === 0) {
      console.log("✅ All medicines have been updated!");
      hasMore = false;
      break;
    }

    console.log(`Found ${medicines.length} medicines in this batch. Generating data via Groq (llama-3.3-70b)...`);

    for (const med of medicines) {
      console.log(`Processing: ${med.name}...`);
      try {
        const generated = await generateDataForMedicine(med.name, med.active_ingredient || "", med.category || "");
        
        await client.query(`
          UPDATE public.medicines 
          SET drug_interactions = $1, side_effects = $2, stock_quantity = $3, price = $4
          WHERE id = $5
        `, [
          generated.drug_interactions || "Chưa có thông tin", 
          generated.side_effects || "Chưa có thông tin", 
          generated.stock_quantity || 10, 
          generated.price || 50000, 
          med.id
        ]);

        console.log(`✅ Successfully updated ${med.name}`);
        totalProcessed++;
        
        // Chạy rề rề 7 giây 1 lần để chắc chắn nằm dưới mức 6000 TPM của Groq
        await new Promise(r => setTimeout(r, 7000));
      } catch (err: any) {
        console.error(`❌ Error processing ${med.name}:`, err.message);
        
        // Nếu chạm ngạch, bắt buộc phải ngủ đông 1 phút để Groq reset lại băng thông
        if (err.message.includes("429") || err.message.includes("rate_limit_exceeded") || err.message.includes("Rate limit")) {
           console.log("Rate limited! Ngủ đông 60 giây để hồi mana...");
           await new Promise(r => setTimeout(r, 60000));
        } else {
           await new Promise(r => setTimeout(r, 5000));
        }
      }
    }
    console.log(`--- Total processed so far: ${totalProcessed} ---`);
  }
  
  await client.end();
}

run();
