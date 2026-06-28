Luồng nghiệp vụ quản lý kho khép kín
Giai đoạn 1: Thẩm định & Cấu hình Danh mục (R&D và Kho tổng)
Thẩm định Pháp lý: Bộ phận R&D kiểm tra và lưu trữ hồ sơ nhà cung cấp trên hệ thống (Giấy GDP, Số đăng ký thuốc còn hạn). Hệ thống phải chặn không cho lên đơn nếu hồ sơ này hết hạn.
Cấu hình Thuộc tính Dược phẩm: Khi tạo mới SKU sản phẩm, hệ thống bắt buộc phân loại: Thuốc kê đơn/Kháng sinh (cần siết chặt đơn thuốc), Thuốc hướng thần/Thuốc ngủ (cấu hình chặn kinh doanh hoặc kiểm soát đặc biệt), Thuốc thông thường/Thực phẩm chức năng.
Giai đoạn 2: Dự báo & Mua hàng (Cung ứng - Thu mua)
Đề xuất gọi hàng tự động (AI/Data-driven): Hệ thống dựa trên chỉ số Vòng quay tồn kho tiêu chuẩn (Mức an toàn từ 1.2 - 1.5 = Doanh thu tháng / Giá vốn) và lượng tồn thực tế để tự động đưa ra danh sách đề xuất mua hàng (Quantity đề xuất).
Lên Đơn hàng (PO): Nhân viên cung ứng duyệt danh sách, hệ thống xuất file/lệnh mua hàng. Hiện tại doanh nghiệp đang gửi qua Zalo cho trình dược viên, hệ thống của ta có thể tích hợp nút "Xuất/Gửi đơn hàng" nhanh qua OTT (Zalo/Viber) hoặc Email cho Trình dược viên.
Giai đoạn 3: Nhập kho tổng & Điều phối 
Nhập Kho Tổng: Khi trình dược viên giao hàng, thủ kho kiểm đếm thực tế (Số lượng, Số Lô - Batch, Hạn dùng - Expiry Date). Hệ thống ghi nhận nhập kho tổng (đồng bộ dữ liệu kế toán).
Điều chuyển nội bộ tự động: Dựa trên cấu hình "Đề xuất điều chuyển" (Cửa hàng A tồn cao/bán chậm → Cửa hàng B hết hàng/bán chạy), hệ thống tự động tạo Phiếu điều chuyển. Đội vận chuyển nội bộ ship hàng kèm phiếu giao nhận.
Giai đoạn 4: Nhập kho cửa hàng & Bán hàng (Vận hành bán lẻ)
Nghiệm thu tại quầy (Điểm nghẽn cần xử lý): Nhân viên quầy nhận hàng, bắt buộc phải quét mã/kiểm thực tế rồi mới bấm "Xác nhận nhập kho" trên Misa chi nhánh. Hệ thống sẽ khóa tính năng "Bấm nhận bừa" nếu không qua bước quét mã ( hoặc mã lô ) hoặc tích chọn xác nhận số lượng thực tế để giảm thiểu lệch kho do cảm tính.
Bán hàng & Trừ kho: * Thuốc thường: Quét bar-code, hệ thống trừ kho theo cơ chế FIFO (First In, First Out - Hàng nhập trước/Cận date xuất trước).
Thuốc kê đơn/Kháng sinh: Hệ thống bắt buộc Nhân viên phải Upload ảnh chụp đơn thuốc hoặc chọn Mã đơn thuốc liên kết mới cho phép bấm "Thanh toán" (Tuân thủ Luật Dược mới, tránh phạt 20 triệu/đơn).
Giai đoạn 5: Kiểm soát - Xử lý Sự cố & Tối ưu (Vòng lặp khép kín)
Kiểm kho định kỳ & Xử lý lệch chéo: Thay vì đợi 3 tháng, hệ thống hỗ trợ "Kiểm kho cuốn chiếu" (Mỗi ngày/tuần kiểm một nhóm hàng). Nếu lệch, hệ thống tự động sinh Phiếu điều chuyển cân đối (nếu thừa/thiếu chéo giữa các kho) hoặc Phiếu xuất hủy/bù tiền (nếu nhân viên làm mất).
Cảnh báo cận Date: Hệ thống tự động đẩy danh sách hàng tồn dưới 6 tháng sang Khối Đào tạo/Marketing để lên chương trình thúc đẩy bán (đẩy mạnh doanh số quầy), và tự động khóa/chuyển vào "Khu vực chờ xử lý" khi hạn dùng còn dưới 3 tháng.

Module 1: Quản lý Số Lô & Hạn sử dụng (Expiry Date) sâu sắc
Một mã thuốc (SKU) có nhiều số lô khác nhau, mỗi lô có hạn dùng và giá vốn nhập khác nhau.
Giải pháp hệ thống: Hệ thống quản lý tồn kho theo lớp (Layered Inventory). Khi Data Analyst tính toán giá vốn cho một nhóm sản phẩm, hệ thống áp dụng phương pháp Tính trung bình, nhưng khi xuất kho bán lẻ bắt buộc phải hiển thị rõ Lô nào đang cận date nhất để nhân viên lấy đúng hộp thuốc đó giao cho khách.
Module 2: Tra cứu Lịch sử đơn hàng tập trung 
Nỗi đau: Khách trả lại thuốc lỗi do nhà sản xuất hoặc đổi trả trong vòng 3 tháng nhưng không có hóa đơn giấy. Nhân viên dễ bị lừa nhận thuốc từ nhà thuốc khác.
Giải pháp hệ thống: Tính năng "Open Data History" cho nhân viên đứng quầy. Chỉ cần gõ Số điện thoại khách hàng, Tên thuốc, hoặc Triệu chứng/Ngày mua, hệ thống sẽ truy xuất ngay lập tức đơn hàng cũ. Cho phép bấm "Tạo đơn đổi trả" trực tiếp từ chính đơn hàng gốc đó → Hệ thống tự động cộng lại kho quầy và tạo lệnh thu hồi hàng lỗi trả về Phòng cung ứng để làm việc với Trình dược viên.
Module 3: Bộ não phân tích dữ liệu & Đưa ra quyết định 
Nỗi đau: "Con số tổng đánh lừa thị giác" (Vòng quay tổng đẹp nhưng thực tế vốn bị chôn ở hàng ôm tồn 3-6 tháng).
Giải pháp hệ thống: Dashboard không chỉ báo cáo chỉ số vòng quay tồn kho (Inventory Turnover) chung, mà phải cho phép Bóc tách (Drill-down) theo từng SKU/Nhóm hàng.
Cảnh báo đỏ: Hàng có vòng quay $< 1.0$ (Hàng ứ đọng, đọng vốn).
Cảnh báo vàng: Hàng có vòng quay $> 2.0$ nhưng số lượng tồn kho thực tế dưới mức an toàn (Nguy cơ đứt hàng).
Lưu ý thiết kế: Hệ thống chỉ đưa ra "Đề xuất", vẫn phải có màn hình để Nhân sự phòng cung ứng bấm "Phê duyệt" cuối cùng nhằm linh hoạt theo các chương trình khuyến mãi
