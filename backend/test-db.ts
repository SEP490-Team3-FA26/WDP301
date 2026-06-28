import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load biến môi trường từ file .env
dotenv.config({ path: path.resolve(__dirname, '.env') });

async function testConnection() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.error('❌ Không tìm thấy DATABASE_URL trong file .env');
    process.exit(1);
  }

  console.log('🔄 Đang kết nối tới Supabase PostgreSQL...');
  
  const client = new Client({
    connectionString,
  });

  try {
    await client.connect();
    console.log('✅ KẾT NỐI THÀNH CÔNG ĐẾN DATABASE!');
    
    // Thử chạy một câu query lấy thời gian hiện tại từ DB
    const res = await client.query('SELECT NOW()');
    console.log('🕒 Thời gian trên Database:', res.rows[0].now);
    
  } catch (err) {
    console.error('❌ LỖI KẾT NỐI DATABASE:');
    console.error((err as Error).message);
  } finally {
    await client.end();
  }
}

testConnection();
