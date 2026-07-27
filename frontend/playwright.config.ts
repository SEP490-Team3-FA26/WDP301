import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';
import path from 'path';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Đọc file .env nếu có
dotenv.config({ path: path.resolve(__dirname, '.env') });

export default defineConfig({
  testDir: './tests',
  /* Chạy các test song song */
  fullyParallel: true,
  /* Dừng test ngay nếu có test bị fail trên CI */
  forbidOnly: !!process.env.CI,
  /* Thử lại (retry) 1 lần trên CI */
  retries: process.env.CI ? 1 : 0,
  /* Số worker (cửa sổ chạy đồng thời) */
  workers: process.env.CI ? 1 : undefined,
  
  /* Báo cáo dạng HTML */
  reporter: 'html',

  /* Cấu hình chung cho tất cả các test */
  use: {
    /* Mặc định chạy production nếu có BASE_URL trong env, không thì dùng localhost */
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    
    /* Ghi lại thao tác lúc test bị lỗi để dễ fix */
    trace: 'on-first-retry',
    
    /* Bật video nếu mún coi lại quá trình test (bỏ comment để bật) */
    // video: 'on',
  },

  /* Cấu hình chạy trên Microsoft Edge */
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    }
  ],
});
