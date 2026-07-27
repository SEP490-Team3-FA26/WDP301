import { test, expect } from '@playwright/test';

test.describe('Customer Checkout E2E', () => {
  test.beforeEach(async ({ page }) => {
    // 1. Điều hướng đến trang Đăng nhập
    await page.goto('/auth/login');
    
    // 2. Điền thông tin đăng nhập Khách hàng
    await page.locator('input[type="email"]').fill(process.env.TEST_USER_EMAIL || 'user@vinapharmacy.com');
    await page.locator('input[type="password"]').fill(process.env.TEST_USER_PASSWORD || '123456');
    await page.getByRole('button', { name: 'Truy cập hệ thống quản trị' }).click();

    // 3. Đợi chuyển sang trang cửa hàng
    await page.waitForURL('**/customer/shop');

    // 4. Tìm nút Thêm vào giỏ hàng (không bị disabled) đầu tiên
    const addToCartButton = page.locator('.grid > div button:not([disabled])').first();
    await addToCartButton.waitFor({ state: 'visible' });
    
    // Đón lõng API thêm vào giỏ hàng (chắc chắn API chạy xong mới đi tiếp)
    const responsePromise = page.waitForResponse(response => 
      response.url().includes('/api/users/cart') && response.request().method() === 'POST'
    );
    await addToCartButton.click();
    await responsePromise;

    // 5. Chuyển sang trang Giỏ hàng
    await page.goto('/customer/cart');
    
    // Đợi trang giỏ hàng load xong và nút "Tiến hành đặt hàng" xuất hiện
    const proceedButton = page.getByRole('button', { name: /Tiến hành đặt hàng/i });
    await proceedButton.waitFor({ state: 'visible', timeout: 10000 });
    await proceedButton.click();
    
    // 6. Đợi chuyển sang trang Thanh toán
    await expect(page.getByText('Thông tin giao nhận hàng')).toBeVisible();

    // 7. Điền form nhận hàng
    await page.getByPlaceholder('Nguyễn Văn A').fill('Khách Hàng Test E2E');
    await page.getByPlaceholder('0905 xxx xxx').fill('0900000000');
    await page.getByPlaceholder(/Nhập số nhà, tên đường/i).fill('123 Đường Test, TP. Đợi Chờ');
  });

  test('[COD] Thanh toán bằng tiền mặt', async ({ page }) => {
    // 8. Chọn thanh toán COD
    await page.getByRole('button', { name: /Tiền mặt \(COD\)/i }).click();

    // 9. Bấm Xác nhận
    await page.getByRole('button', { name: 'Xác nhận đặt & thanh toán' }).click();

    // 10. Chờ modal báo thành công
    await expect(page.getByText('Đặt hàng thành công!')).toBeVisible({ timeout: 10000 });
  });

  test('[PayOS] Thanh toán bằng QR Code', async ({ page }) => {
    // 8. Chọn thanh toán PayOS
    await page.getByRole('button', { name: /VNPay \/ QR Code/i }).click();

    // 9. Bấm Xác nhận
    await page.getByRole('button', { name: 'Xác nhận đặt & thanh toán' }).click();

    // 10. Chờ modal QR của PayOS hiện lên
    await expect(page.getByText(/quét mã VietQR thanh toán/i)).toBeVisible({ timeout: 15000 });
  });
});
