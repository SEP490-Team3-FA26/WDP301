# DANH SÁCH CHI TIẾT CÁC USE CASE ĐÃ HOÀN THÀNH

Tài liệu này kiểm kê và phân rã chi tiết toàn bộ các chức năng (Use Case) đã hoàn thành thực tế trong source code của hệ thống, bao gồm cả các chức năng phụ trợ, chức năng nghiệp vụ nhỏ lẻ và các luồng xác thực nâng cao.

### 2.2.2 Descriptions

| ID | Use Case | Actors | Use Case Description |
| :--- | :--- | :--- | :--- |
| **UC-01** | Đăng ký tài khoản | Khách hàng | Cho phép khách hàng đăng ký mới tài khoản cá nhân vào hệ thống bằng email và mật khẩu. |
| **UC-02** | Đăng nhập | Khách hàng, Dược sĩ, Thủ kho, Admin, Quản lý chi nhánh | Cho phép người dùng đăng nhập vào hệ thống bằng tài khoản và mật khẩu đã đăng ký hoặc được cấp. |
| **UC-03** | Xác thực email | Khách hàng | Cho phép khách hàng xác nhận mã kích hoạt gửi về email cá nhân sau khi đăng ký tài khoản thành công. |
| **UC-04** | Đăng nhập Google | Khách hàng | Cho phép khách hàng đăng nhập nhanh vào cổng mua sắm trực tuyến bằng tài khoản Google. |
| **UC-05** | Khôi phục mật khẩu | Dược sĩ, Thủ kho, Admin, Quản lý chi nhánh | Cho phép nhân viên gửi yêu cầu khôi phục mật khẩu qua email khi không nhớ thông tin đăng nhập. |
| **UC-06** | Đặt lại mật khẩu | Dược sĩ, Thủ kho, Admin, Quản lý chi nhánh | Cho phép nhân viên điền mật khẩu mới thông qua đường dẫn mã bảo mật được gửi tới email khôi phục. |
| **UC-07** | Đăng xuất | Khách hàng, Dược sĩ, Thủ kho, Admin, Quản lý chi nhánh | Hủy phiên làm việc hiện tại và thoát an toàn khỏi tài khoản trên hệ thống. |
| **UC-08** | Tìm kiếm thuốc online | Khách hàng | Duyệt xem, tìm kiếm thuốc theo tên/hoạt chất/công dụng trên cổng mua sắm trực tuyến. |
| **UC-09** | Thêm vào giỏ cá nhân | Khách hàng | Cho phép khách hàng lưu sản phẩm thuốc muốn mua vào giỏ hàng cá nhân để thanh toán sau. |
| **UC-10** | Quản lý giỏ cá nhân | Khách hàng | Cho phép khách hàng tăng/giảm số lượng thuốc hoặc xóa bỏ sản phẩm khỏi giỏ hàng cá nhân trực tuyến. |
| **UC-11** | Xác nhận đặt hàng online | Khách hàng | Điền thông tin họ tên, số điện thoại, địa chỉ nhận hàng và xác nhận gửi đơn đặt hàng trực tuyến. |
| **UC-12** | Thanh toán đơn online | Khách hàng | Thực hiện thanh toán tiền hàng trực tuyến bằng chuyển khoản ngân hàng qua mã QR động hoặc COD. |
| **UC-13** | Xem lịch sử đơn hàng | Khách hàng | Xem danh sách các đơn hàng đã đặt trong quá khứ, thông tin chi tiết từng đơn và trạng thái giao hàng. |
| **UC-14** | Xem hồ sơ khách hàng | Khách hàng | Xem thông tin cá nhân, số điểm tích lũy và thứ hạng thành viên hiện tại (Vàng, Bạc, Đồng...). |
| **UC-15** | Tư vấn AI qua văn bản | Khách hàng | Nhập các câu hỏi mô tả triệu chứng bệnh, chatbot tự động phân tích gợi ý thông tin chăm sóc sức khỏe và thuốc khuyên dùng. |
| **UC-16** | Tư vấn AI qua giọng nói | Khách hàng | Nhấn nút thu âm mô tả triệu chứng bằng giọng nói, AI tự động nhận diện tiếng Việt và chuyển đổi thành văn bản để tư vấn. |
| **UC-17** | Tìm kiếm thuốc bán lẻ | Dược sĩ | Tìm kiếm nhanh thuốc theo tên hoặc thành phần hoạt chất ngay tại màn hình bán lẻ tại quầy. |
| **UC-18** | Thêm vào giỏ bán lẻ | Dược sĩ | Cho phép chọn thuốc từ danh mục tìm kiếm và thêm vào giỏ hàng bán lẻ hiện tại của khách hàng. |
| **UC-19** | Chỉnh sửa giỏ bán lẻ | Dược sĩ | Thay đổi số lượng mua của từng loại thuốc hoặc xóa thuốc ra khỏi giỏ hàng bán lẻ. |
| **UC-20** | Gợi ý thuốc thay thế | Dược sĩ | Hệ thống tự động gợi ý danh sách các thuốc thay thế tương đương (cùng hoạt chất hoặc nhóm công dụng) khi thuốc yêu cầu bị hết hàng quầy. |
| **UC-21** | Áp voucher và tích điểm | Dược sĩ | Tra cứu thông tin khách hàng thân thiết bằng SĐT để tích lũy điểm thưởng hoặc áp dụng mã voucher chiết khấu trực tiếp vào hóa đơn. |
| **UC-22** | Quét đơn thuốc AI | Dược sĩ | Chụp/upload ảnh đơn thuốc bác sĩ (đơn đơn trang/nhiều trang). AI Gemini 2.5 Flash tự phân tích layout, trích xuất hoạt chất/hàm lượng, gộp lặp thuốc, khớp CSDL chi nhánh & tự chọn lô FEFO hạn dùng gần nhất để điền vào giỏ hàng. |
| **UC-23** | Kiểm tra tương tác thuốc | Dược sĩ | Chọn nhiều loại thuốc trong giỏ hàng để hệ thống gọi AI kiểm tra sự tương tác hoặc các cảnh báo xung khắc chéo có hại cho người bệnh. |
| **UC-24** | Thanh toán đơn bán lẻ | Dược sĩ | Xác nhận giao dịch qua Tiền mặt hoặc Chuyển khoản ngân hàng. Hệ thống tự động trừ kho chi nhánh theo lô FIFO và in hóa đơn. |
| **UC-25** | Gửi hóa đơn điện tử qua email | Dược sĩ | Cho phép nhập email của khách hàng tại quầy để hệ thống tự động gửi file hóa đơn điện tử (HDĐT) ngay sau khi giao dịch thành công. |
| **UC-26** | Lập hóa đơn bán sỉ | Dược sĩ | Lập phiếu xuất hóa đơn bán sỉ cho đối tác đại lý, hệ thống tự động áp giá bậc thang tương thích dựa trên khối lượng mua lớn. |
| **UC-27** | Tìm hóa đơn đổi trả | Dược sĩ | Tìm hóa đơn cũ theo số điện thoại khách hàng hoặc mã đơn để xác minh nguồn gốc mua hàng trước khi thực hiện đổi trả. |
| **UC-28** | Tạo phiếu hoàn trả | Dược sĩ | Lập phiếu đổi trả ghi nhận lý do hoàn trả (hàng lỗi, cận date...), thực hiện hoàn tiền cho khách và cập nhật tăng lại tồn kho quầy. |
| **UC-29** | Xem danh mục thuốc | Admin, Thủ kho, Dược sĩ | Xem danh sách toàn bộ các loại thuốc trong hệ thống kèm thông tin về hoạt chất, nhóm thuốc, đơn vị và đơn giá gốc. |
| **UC-30** | Xem tồn kho theo lô | Thủ kho, Admin | Hiển thị chi tiết tồn kho thực tế của từng sản phẩm bao gồm mã lô (`batchNo`), hạn sử dụng (`expDate`) và số lượng tồn hiện có. |
| **UC-31** | Tạo phiên nhập kho | Thủ kho | Tạo mới phiên kiểm đếm nhập hàng giao từ nhà cung cấp dựa trên đơn đặt hàng PO đã được ban quản lý ký duyệt. |
| **UC-32** | Tạo đơn mua hàng PO | Thủ kho | Tạo mới đơn đặt mua hàng PO gửi lên Admin duyệt trước khi gửi đến nhà cung cấp. |
| **UC-33** | Kiểm hàng bằng camera AI | Thủ kho | Sử dụng điện thoại di động chụp hình lô hàng, AI tự động quét đếm số lượng hộp thuốc thực tế trong kiện hàng để điền vào phiếu. |
| **UC-34** | Cảnh báo hạn sử dụng | Thủ kho, Admin | Báo cáo chi tiết danh sách các lô thuốc cận date (dưới 6 tháng / 3 tháng) hoặc đã hết hạn dùng để có phương án xử lý xuất hủy. |
| **UC-35** | Truy xuất nguồn gốc lô | Thủ kho, Admin | Nhập mã lô thuốc (`batchNo`) để truy xuất toàn bộ nhà cung cấp, PO, GRN và hiển thị timeline biến động số lượng của lô thuốc đó. |
| **UC-36** | Xem tồn kho chi nhánh | Quản lý chi nhánh | Tra cứu nhanh số lượng tồn thực tế của thuốc tại chi nhánh mình quản lý. |
| **UC-37** | Tạo đề xuất cấp hàng | Quản lý chi nhánh | Lập phiếu yêu cầu cấp hàng gửi lên Kho tổng trung tâm khi quầy chi nhánh bị thiếu hoặc hết hàng. |
| **UC-38** | Tạo đề xuất chuyển kho | Quản lý chi nhánh | Tạo phiếu xuất điều chuyển hàng hóa sang chi nhánh lân cận để giải quyết vấn đề lệch kho chéo. |
| **UC-39** | Phê duyệt cấp hàng | Thủ kho | Xem xét các phiếu Requisition từ chi nhánh gửi lên, duyệt xuất hàng luân chuyển từ Kho tổng trung tâm. |
| **UC-40** | Xác nhận nhận chuyển kho | Quản lý chi nhánh | Nhận hàng từ Kho tổng bàn giao đến cơ sở, đối chiếu thực tế và bấm xác nhận để đồng bộ cập nhật tăng tồn kho đích. |
| **UC-41** | Xem danh sách nhân viên | Admin, Quản lý chi nhánh | Hiển thị bảng danh sách tất cả các nhân viên trong chuỗi nhà thuốc kèm thông tin chi tiết về chức vụ, ca trực, chi nhánh và trạng thái kích hoạt. |
| **UC-42** | Tạo tài khoản nhân viên | Quản lý chi nhánh | Cho phép Quản lý chi nhánh tạo mới tài khoản nhân viên (Dược sĩ, Thủ kho quầy) thuộc chi nhánh của mình quản lý. |
| **UC-43** | Phê duyệt tài khoản | Admin, Quản lý chi nhánh | Cho phép Admin hoặc Quản lý chi nhánh xem xét, phê duyệt cho phép kích hoạt tài khoản đăng ký mới để truy cập hệ thống. |
| **UC-44** | Từ chối tài khoản | Admin, Quản lý chi nhánh | Cho phép Admin hoặc Quản lý chi nhánh từ chối đăng ký tài khoản mới và hủy yêu cầu khỏi danh sách chờ. |
| **UC-45** | Tạo tài khoản quản lý chi nhánh | Admin | Cho phép Admin tổng tạo mới tài khoản cấp Quản lý chi nhánh và phân quyền phụ trách chi nhánh tương ứng. |
| **UC-46** | Cập nhật vai trò nhân viên | Admin | Cho phép Admin chỉnh sửa phân quyền vai trò (Role), chức vụ và điều chuyển chi nhánh làm việc của nhân viên. |
| **UC-47** | Thêm thuốc | Admin | Tạo mới thuốc và điền các thuộc tính định danh, quy cách đóng gói, hướng dẫn sử dụng. |
| **UC-48** | Cập nhật thuốc | Admin | Chỉnh sửa các thuộc tính, mô tả, hình ảnh hoặc nhóm phân loại của thuốc trên danh mục hệ thống. |
| **UC-49** | Xem danh sách NCC | Admin, Thủ kho | Hiển thị thông tin liên hệ, mã NCC và xếp hạng mức uy tín của các nhà cung cấp. |
| **UC-50** | Thêm nhà cung cấp | Admin | Đăng ký thông tin nhà cung cấp dược phẩm mới và lưu trữ hồ sơ pháp lý vào hệ thống. |
| **UC-51** | Cập nhật nhà cung cấp | Admin | Điều chỉnh thông tin liên lạc, thời hạn giấy phép GDP hoặc kỳ hạn công nợ của nhà cung cấp. |
| **UC-52** | Xem dashboard doanh thu | Admin | Xem các biểu đồ doanh thu theo thời gian, số lượng giao dịch, công nợ tổng và hiệu suất vận hành toàn chuỗi. |
| **UC-53** | So sánh hiệu suất chi nhánh | Admin | Hiển thị bảng so sánh xếp hạng doanh số bán hàng, lượng giao dịch và sự tăng trưởng giữa các cơ sở toàn hệ thống. |
| **UC-54** | Phê duyệt đơn PO | Admin | Duyệt đề xuất đơn đặt hàng PO gửi đến nhà cung cấp, cấu hình phương thức thanh toán ngay (PAID) hoặc mua nợ (CREDIT). |
| **UC-55** | Từ chối đơn PO | Admin | Từ chối phê duyệt đơn mua hàng PO và ghi lại lý do từ chối để bộ phận mua hàng chỉnh sửa. |
| **UC-56** | Phê duyệt phiếu GRN | Admin | Ký duyệt biên bản thực nhận từ thủ kho để xác nhận nhập kho chính thức, tăng số lượng tồn kho tổng và kích hoạt các lô hàng mới. |
| **UC-57** | Từ chối phiếu GRN | Admin | Từ chối ký duyệt biên bản thực nhận GRN từ thủ kho và ghi lại lý do trả về để bộ phận kho kiểm tra xử lý lại. |
| **UC-58** | Quản lý khuyến mãi | Admin | Tạo mã voucher giảm giá theo phần trăm/tiền mặt, thiết lập các đợt Flash Sale theo khung giờ nhất định. |
| **UC-59** | Quản lý dòng tiền | Admin | Xem báo cáo tài chính về dòng tiền, nhập các khoản chi phí cố định (mặt bằng, lương, điện nước...) của các chi nhánh. |
| **UC-60** | Tra cứu nhật ký audit | Admin | Truy xuất danh sách nhật ký ghi nhận các thao tác nghiệp vụ quan trọng của nhân viên phục vụ bảo mật. |
| **UC-61** | Dự báo nhu cầu AI | Thủ kho, Admin | Hệ thống tự động phân tích doanh số và lượng tồn kho thực tế để gợi ý số lượng cần đặt mua nhà cung cấp. |
| **UC-62** | Tự động tạo đơn PO từ AI | Thủ kho, Admin | Cho phép chuyển đổi trực tiếp các kết quả gợi ý số lượng mua hàng EOQ từ AI thành đơn mua hàng PO chính thức với 1 cú nhấp chuột. |
| **UC-63** | Phát hiện bất thường tồn kho AI | Thủ kho, Admin | Hệ thống AI tự động phát hiện và cảnh báo các biến động kho bất thường như xuất hàng đột biến, tồn kho thấp nguy cơ hết hàng hoặc điều chỉnh kho bất thường. |
| **UC-64** | Phân tích xu hướng mùa và dịch bệnh | Admin | Hệ thống phân tích dữ liệu lịch sử bán hàng theo từng đợt dịch bệnh, mùa trong năm (nắng/mưa) để dự báo nhu cầu thuốc và lập kế hoạch dự trữ. |
| **UC-65** | Nhận thông báo hệ thống | Khách hàng, Dược sĩ, Thủ kho, Admin, Quản lý chi nhánh | Hệ thống đẩy cảnh báo cận date, yêu cầu duyệt PO, GRN hoặc yêu cầu cấp hàng khẩn cấp của chi nhánh ngay lập tức qua socket. |
