import 'package:flutter/material.dart';
import '../services/api_service.dart';
import 'payment_webview_screen.dart';

class CheckoutScreen extends StatefulWidget {
  final List<Map<String, dynamic>> cartItems;
  final Map<String, dynamic>? userProfile;
  final double subtotal;

  const CheckoutScreen({
    super.key,
    required this.cartItems,
    this.userProfile,
    required this.subtotal,
  });

  @override
  State<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends State<CheckoutScreen> {
  final _formKey = GlobalKey<FormState>();
  late TextEditingController _fullnameController;
  late TextEditingController _phoneController;
  late TextEditingController _addressController;
  final _voucherCodeController = TextEditingController();

  String _paymentMethod = "CASH"; // CASH or PAYOS
  bool _isSubmitting = false;

  // Voucher state
  Map<String, dynamic>? _appliedVoucher;
  bool _isValidatingVoucher = false;
  String? _voucherErrorMsg;

  @override
  void initState() {
    super.initState();
    final profile = widget.userProfile;
    _fullnameController = TextEditingController(
      text: profile?['fullName'] ?? '',
    );
    _phoneController = TextEditingController(
      text: profile?['phone'] ?? '',
    );
    _addressController = TextEditingController(
      text: profile?['address'] ?? '',
    );
  }

  @override
  void dispose() {
    _fullnameController.dispose();
    _phoneController.dispose();
    _addressController.dispose();
    _voucherCodeController.dispose();
    super.dispose();
  }

  double get _discountAmount {
    if (_appliedVoucher == null) return 0.0;
    final val = (_appliedVoucher!['discountValue'] ?? 0).toDouble();
    final type = _appliedVoucher!['discountType'] ?? 'FIXED';
    if (type == 'PERCENT') {
      double discount = widget.subtotal * (val / 100.0);
      final maxDisc = (_appliedVoucher!['maxDiscount'] ?? 0).toDouble();
      if (maxDisc > 0 && discount > maxDisc) discount = maxDisc;
      return discount;
    }
    return val;
  }

  double get _finalTotal => (widget.subtotal - _discountAmount).clamp(0.0, double.infinity);

  Future<void> _applyVoucherCode() async {
    final code = _voucherCodeController.text.trim();
    if (code.isEmpty) return;

    setState(() {
      _isValidatingVoucher = true;
      _voucherErrorMsg = null;
    });

    final res = await ApiService.validateVoucher(code, widget.subtotal);

    setState(() => _isValidatingVoucher = false);

    if (res['valid'] == true && res['voucher'] != null) {
      setState(() {
        _appliedVoucher = res['voucher'];
        _voucherErrorMsg = null;
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Đã áp dụng mã voucher ${res['voucher']['code']} thành công!'),
          backgroundColor: const Color(0xFF2E7D32),
        ),
      );
    } else {
      setState(() {
        _appliedVoucher = null;
        _voucherErrorMsg = res['message'] ?? 'Mã voucher không hợp lệ hoặc đã hết hạn.';
      });
    }
  }

  Future<void> _handleConfirmCheckout() async {
    if (!_formKey.currentState!.validate()) return;

    if (widget.cartItems.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Giỏ hàng đang trống!'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    setState(() => _isSubmitting = true);

    final String paymentMethodPayload = _paymentMethod == 'PAYOS' ? 'QR_PAY' : 'CASH';

    final userId = widget.userProfile?['id'] ?? widget.userProfile?['_id'] ?? widget.userProfile?['userId'];

    final payload = {
      if (userId != null && userId.toString().isNotEmpty) 'userId': userId.toString(),
      'patientName': _fullnameController.text.trim(),
      'patientPhone': _phoneController.text.trim(),
      'shippingAddress': _addressController.text.trim(),
      'paymentMethod': paymentMethodPayload,
      'type': 'ONLINE',
      'totalAmount': _finalTotal.toInt(),
      if (_appliedVoucher != null) 'voucherCode': _appliedVoucher!['code'],
      'items': widget.cartItems.map((item) {
        final priceNum = (item['price'] ?? item['unitPrice'] ?? 0) as num;
        final qtyNum = (item['quantity'] ?? item['qty'] ?? 1) as num;
        return {
          'medicineId': (item['id'] ?? item['medicineId'] ?? item['_id'] ?? '').toString(),
          'name': (item['name'] ?? 'Dược phẩm').toString(),
          'price': priceNum.toInt(),
          'quantity': qtyNum.toInt(),
          if (item['unit'] != null) 'unit': item['unit'].toString(),
        };
      }).toList(),
    };

    final result = await ApiService.createOrder(payload);

    setState(() => _isSubmitting = false);

    if (result != null && (result['success'] == true || result['orderCode'] != null || result['_id'] != null)) {
      // Check if PayOS URL returned
      final checkoutUrl = result['checkoutUrl'] ?? result['paymentUrl'];
      if (_paymentMethod == 'PAYOS' && checkoutUrl != null && checkoutUrl.toString().isNotEmpty) {
        final orderCode = result['orderCode'] ?? result['order']?['orderCode'];
        if (!mounted) return;
        final webViewResult = await Navigator.push<Map<String, dynamic>>(
          context,
          MaterialPageRoute(
            builder: (_) => PaymentWebViewScreen(
              checkoutUrl: checkoutUrl.toString(),
              orderCode: orderCode,
            ),
          ),
        );

        if (!mounted) return;

        if (webViewResult != null && webViewResult['paid'] == true) {
          // Payment confirmed paid: Return true to caller so Cart is cleared
          Navigator.pop(context, {'success': true, 'result': result});
        } else {
          // Payment cancelled or pending: Keep cart intact
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(
                webViewResult?['message'] ?? 'Thanh toán chưa hoàn tất. Đơn hàng đã được lưu với trạng thái Chưa thanh toán.',
              ),
              backgroundColor: Colors.orange,
              duration: const Duration(seconds: 4),
            ),
          );
        }
      } else {
        if (!mounted) return;
        // CASH payment: Return true to clear cart
        Navigator.pop(context, {'success': true, 'result': result});
      }
    } else {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(result?['message'] ?? 'Tạo đơn hàng thất bại. Vui lòng thử lại!'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Xác nhận thanh toán'),
        backgroundColor: const Color(0xFF1976D2),
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Order Items Summary Card
              Card(
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          const Icon(Icons.shopping_bag, color: Color(0xFF1976D2)),
                          const SizedBox(width: 8),
                          Text(
                            'Sản phẩm đặt mua (${widget.cartItems.length})',
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                      const Divider(height: 20),
                      ...widget.cartItems.map((item) {
                        final price = (item['price'] ?? 0).toDouble();
                        final qty = (item['quantity'] ?? 1) as int;
                        return Padding(
                          padding: const EdgeInsets.symmetric(vertical: 4.0),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Expanded(
                                child: Text(
                                  '${item['name']} (x$qty)',
                                  style: const TextStyle(fontSize: 14),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                ),
                              ),
                              Text(
                                '${(price * qty).toInt().toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]}.')} đ',
                                style: const TextStyle(
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ],
                          ),
                        );
                      }),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 16),

              // Customer Info Card
              Card(
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Row(
                        children: [
                          Icon(Icons.location_on, color: Color(0xFF1976D2)),
                          SizedBox(width: 8),
                          Text(
                            'Thông tin giao hàng',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                      TextFormField(
                        controller: _fullnameController,
                        decoration: const InputDecoration(
                          labelText: 'Họ và tên người nhận *',
                          prefixIcon: Icon(Icons.person),
                          border: OutlineInputBorder(),
                        ),
                        validator: (val) =>
                            val == null || val.trim().isEmpty ? 'Vui lòng nhập họ tên' : null,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _phoneController,
                        keyboardType: TextInputType.phone,
                        decoration: const InputDecoration(
                          labelText: 'Số điện thoại liên hệ *',
                          prefixIcon: Icon(Icons.phone),
                          border: OutlineInputBorder(),
                        ),
                        validator: (val) =>
                            val == null || val.trim().isEmpty ? 'Vui lòng nhập SĐT' : null,
                      ),
                      const SizedBox(height: 12),
                      TextFormField(
                        controller: _addressController,
                        maxLines: 2,
                        decoration: const InputDecoration(
                          labelText: 'Địa chỉ nhận hàng *',
                          prefixIcon: Icon(Icons.home),
                          border: OutlineInputBorder(),
                        ),
                        validator: (val) =>
                            val == null || val.trim().isEmpty ? 'Vui lòng nhập địa chỉ' : null,
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 16),

              // Voucher Section Card
              Card(
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Row(
                        children: [
                          Icon(Icons.confirmation_number, color: Color(0xFF1976D2)),
                          SizedBox(width: 8),
                          Text(
                            'Mã ưu đãi / Voucher',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: TextField(
                              controller: _voucherCodeController,
                              textCapitalization: TextCapitalization.characters,
                              decoration: const InputDecoration(
                                hintText: 'Nhập mã voucher',
                                border: OutlineInputBorder(),
                                contentPadding: EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 10,
                                ),
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          ElevatedButton(
                            onPressed: _isValidatingVoucher ? null : _applyVoucherCode,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF1976D2),
                              foregroundColor: Colors.white,
                            ),
                            child: _isValidatingVoucher
                                ? const SizedBox(
                                    width: 16,
                                    height: 16,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: Colors.white,
                                    ),
                                  )
                                : const Text('Áp dụng'),
                          ),
                        ],
                      ),
                      if (_appliedVoucher != null) ...[
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: Colors.green.shade50,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.check_circle, color: Colors.green, size: 18),
                              const SizedBox(width: 6),
                              Expanded(
                                child: Text(
                                  'Mã ${_appliedVoucher!['code']} (-${_discountAmount.toInt().toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]}.')} đ)',
                                  style: const TextStyle(
                                    color: Colors.green,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                              IconButton(
                                icon: const Icon(Icons.close, size: 18, color: Colors.grey),
                                onPressed: () => setState(() => _appliedVoucher = null),
                              ),
                            ],
                          ),
                        ),
                      ],
                      if (_voucherErrorMsg != null) ...[
                        const SizedBox(height: 8),
                        Text(
                          _voucherErrorMsg!,
                          style: const TextStyle(color: Colors.red, fontSize: 13),
                        ),
                      ],
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 16),

              // Payment Method Selector Card
              Card(
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Row(
                        children: [
                          Icon(Icons.payment, color: Color(0xFF1976D2)),
                          SizedBox(width: 8),
                          Text(
                            'Phương thức thanh toán',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      RadioListTile<String>(
                        value: 'CASH',
                        groupValue: _paymentMethod,
                        title: const Text('Thanh toán khi nhận hàng (COD)'),
                        subtitle: const Text('Trả tiền mặt khi nhận dược phẩm'),
                        onChanged: (val) => setState(() => _paymentMethod = val!),
                      ),
                      RadioListTile<String>(
                        value: 'PAYOS',
                        groupValue: _paymentMethod,
                        title: const Text('Chuyển khoản QR Code (PayOS)'),
                        subtitle: const Text('Quét mã QR qua ngân hàng / Ví điện tử'),
                        onChanged: (val) => setState(() => _paymentMethod = val!),
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 16),

              // Total Cost Breakdown Card
              Card(
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Tạm tính sản phẩm:'),
                          Text(
                            '${widget.subtotal.toInt().toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]}.')} đ',
                          ),
                        ],
                      ),
                      if (_discountAmount > 0) ...[
                        const SizedBox(height: 8),
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('Giảm giá Voucher:'),
                            Text(
                              '-${_discountAmount.toInt().toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]}.')} đ',
                              style: const TextStyle(color: Colors.green),
                            ),
                          ],
                        ),
                      ],
                      const Divider(height: 24),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'Tổng thanh toán:',
                            style: TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          Text(
                            '${_finalTotal.toInt().toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]}.')} đ',
                            style: const TextStyle(
                              fontSize: 18,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFFD32F2F),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),

              const SizedBox(height: 28),

              // Confirm Order Button
              SizedBox(
                width: double.infinity,
                height: 52,
                child: ElevatedButton.icon(
                  onPressed: _isSubmitting ? null : _handleConfirmCheckout,
                  icon: _isSubmitting
                      ? const SizedBox(
                          width: 20,
                          height: 20,
                          child: CircularProgressIndicator(
                            color: Colors.white,
                            strokeWidth: 2,
                          ),
                        )
                      : const Icon(Icons.check_circle_outline),
                  label: Text(
                    _isSubmitting
                        ? 'Đang xử lý đơn hàng...'
                        : 'Xác nhận đặt hàng (${_finalTotal.toInt().toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (m) => '${m[1]}.')} đ)',
                    style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2E7D32),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
