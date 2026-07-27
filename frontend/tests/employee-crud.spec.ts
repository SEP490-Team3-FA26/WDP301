import { test, expect } from '@playwright/test';

test.describe('Employee CRUD E2E', () => {
  const newEmail = `test_${Date.now()}@vinapharmacy.com`;

  test('[Admin] Quản lý & Cập nhật nhân viên', async ({ page }) => {
    // 1. Điều hướng đến trang Đăng nhập
    await page.goto('/auth/login');
    
    // 2. Điền thông tin đăng nhập Admin
    await page.locator('input[type="email"]').fill(process.env.TEST_ADMIN_EMAIL || 'admin@vinapharmacy.com');
    await page.locator('input[type="password"]').fill(process.env.TEST_ADMIN_PASSWORD || '123456');
    
    // 3. Submit
    await page.getByRole('button', { name: 'Truy cập hệ thống quản trị' }).click();

    // 4. Kiểm tra đã đăng nhập thành công và được chuyển hướng
    // Đợi page điều hướng về admin layout
    await page.waitForURL('**/admin**');
    
    // 5. Mở trang Quản lý nhân viên
    await page.goto('/admin/employees');

    // Chờ cho bảng nhân viên hiển thị 
    await expect(page.getByRole('heading', { name: 'Quản lý Nhân viên' })).toBeVisible();

    // 6. Nhấn nút Thêm Nhân Viên
    await page.getByRole('button', { name: 'Thêm Nhân viên' }).click();

    // Modal xuất hiện
    await expect(page.getByText('Thêm Nhân viên Mới')).toBeVisible();

    // 7. Điền form tạo nhân viên
    await page.locator('input[type="email"]').last().fill(newEmail);
    await page.locator('input[type="password"]').fill('12345678');
    
    // Tên hiển thị (tìm label kề bên hoặc input type text)
    // Dựa vào code component: nó có chứa <label>Họ và tên</label> -> input kế tiếp
    // Chúng ta có thể dùng filter hoặc getByLabel nếu có, tuy nhiên ta cứ điền theo thứ tự
    // Do input username thường là text type duy nhất trong modal tạo NV
    await page.locator('input[type="text"]').last().fill('Nhân viên Test E2E');
    
    // Đổi Role sang Dược sĩ (nếu cần) - mặc định admin
    // await page.locator('select').first().selectOption('pharmacist');

    // Submit form
    await page.getByRole('button', { name: 'Tạo tài khoản' }).click();

    // 8. Đợi modal đóng và xem toast/danh sách hiển thị email mới
    // Modal tự đóng thì thẻ 'Thêm Nhân viên Mới' sẽ bị ẩn
    await expect(page.getByText('Thêm Nhân viên Mới')).toBeHidden({ timeout: 10000 });

    // Kiểm tra trong danh sách (hoặc ô tìm kiếm) xem email mới có xuất hiện chưa
    const searchInput = page.getByPlaceholder('Tìm kiếm theo tên hoặc email...');
    await searchInput.fill(newEmail);

    // Chờ cho hiển thị email đó trên bảng
    await expect(page.getByText(newEmail)).toBeVisible();

    // 9. Update (Chỉnh sửa Nhân viên)
    await page.getByTitle('Chỉnh sửa').click();
    await expect(page.getByText('Chỉnh sửa Nhân viên')).toBeVisible();
    await page.locator('input[type="text"]').last().fill('Nhân viên Đã Sửa');
    await page.getByRole('button', { name: 'Lưu thay đổi' }).click();

    // Chờ modal ẩn và check tên mới cập nhật
    await expect(page.getByText('Chỉnh sửa Nhân viên')).toBeHidden();
    await expect(page.getByText('Nhân viên Đã Sửa')).toBeVisible();

    // 10. Delete / Ban (Khóa tài khoản)
    // Lắng nghe sự kiện window.confirm và tự động bấm OK
    page.on('dialog', dialog => dialog.accept());
    
    await page.getByTitle('Khóa tài khoản').click();
    
    // Kiểm tra trạng thái đã chuyển sang Đã khóa
    await expect(page.getByText('Đã khóa')).toBeVisible();
  });
});
