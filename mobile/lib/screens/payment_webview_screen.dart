import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import '../services/api_service.dart';

class PaymentWebViewScreen extends StatefulWidget {
  final String checkoutUrl;
  final dynamic orderCode;

  const PaymentWebViewScreen({
    super.key,
    required this.checkoutUrl,
    required this.orderCode,
  });

  @override
  State<PaymentWebViewScreen> createState() => _PaymentWebViewScreenState();
}

class _PaymentWebViewScreenState extends State<PaymentWebViewScreen> {
  late final WebViewController _controller;
  bool _isLoading = true;
  bool _isChecking = false;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setUserAgent(
        "Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.181 Mobile Safari/537.36",
      )
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (String url) {
            if (mounted) setState(() => _isLoading = true);
            _handleUrlChange(url);
          },
          onPageFinished: (String url) {
            if (mounted) setState(() => _isLoading = false);
            _handleUrlChange(url);
          },
          onNavigationRequest: (NavigationRequest request) {
            if (_handleUrlChange(request.url)) {
              return NavigationDecision.prevent;
            }
            if (!request.url.startsWith('http://') &&
                !request.url.startsWith('https://')) {
              return NavigationDecision.prevent;
            }
            return NavigationDecision.navigate;
          },
        ),
      )
      ..loadRequest(Uri.parse(widget.checkoutUrl));
  }

  bool _handleUrlChange(String url) {
    debugPrint("PayOS WebView URL: $url");
    if (url.contains('cancel=true')) {
      if (mounted) {
        Navigator.of(context).pop({
          'success': false,
          'paid': false,
          'status': 'CANCELLED',
          'message': 'Bạn đã hủy thanh toán.',
        });
      }
      return true;
    }

    if (url.contains('payos-callback')) {
      _verifyPayment(showToastIfPending: false);
      return true;
    }
    return false;
  }

  Future<void> _verifyPayment({bool showToastIfPending = true}) async {
    if (_isChecking) return;
    setState(() => _isChecking = true);

    try {
      final res = await ApiService.checkOrderPayment(widget.orderCode);
      if (!mounted) return;

      final status = res?['status'] ?? res?['order']?['paymentStatus'];
      if (status == 'PAID' || res?['success'] == true && status == 'PAID') {
        Navigator.of(context).pop({
          'success': true,
          'paid': true,
          'orderCode': widget.orderCode,
          'result': res,
        });
        return;
      } else if (status == 'CANCELLED') {
        Navigator.of(context).pop({
          'success': false,
          'paid': false,
          'status': 'CANCELLED',
          'message': 'Thanh toán đã bị hủy.',
        });
        return;
      } else if (showToastIfPending) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Hệ thống chưa nhận được thanh toán. Vui lòng thử lại sau khi chuyển khoản.'),
            backgroundColor: Colors.orange,
            duration: Duration(seconds: 3),
          ),
        );
      }
    } catch (e) {
      debugPrint("Error verifying payment: $e");
    } finally {
      if (mounted) setState(() => _isChecking = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Thanh toán qua PayOS',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        backgroundColor: const Color(0xFF1976D2),
        foregroundColor: Colors.white,
        elevation: 1,
        centerTitle: true,
        actions: [
          IconButton(
            icon: _isChecking
                ? const SizedBox(
                    width: 20,
                    height: 20,
                    child: CircularProgressIndicator(
                      color: Colors.white,
                      strokeWidth: 2,
                    ),
                  )
                : const Icon(Icons.refresh),
            tooltip: 'Kiểm tra thanh toán',
            onPressed: _isChecking ? null : () => _verifyPayment(showToastIfPending: true),
          ),
        ],
      ),
      body: Stack(
        children: [
          WebViewWidget(controller: _controller),
          if (_isLoading)
            const Center(
              child: CircularProgressIndicator(
                color: Color(0xFF1976D2),
              ),
            ),
        ],
      ),
      bottomNavigationBar: SafeArea(
        child: Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
          decoration: BoxDecoration(
            color: Colors.white,
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.05),
                blurRadius: 10,
                offset: const Offset(0, -4),
              ),
            ],
          ),
          child: Row(
            children: [
              Expanded(
                child: OutlinedButton.icon(
                  onPressed: () {
                    Navigator.of(context).pop({
                      'success': false,
                      'paid': false,
                      'message': 'Chưa hoàn tất thanh toán',
                    });
                  },
                  icon: const Icon(Icons.close, color: Colors.grey),
                  label: const Text(
                    'Đóng',
                    style: TextStyle(color: Colors.grey),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: _isChecking ? null : () => _verifyPayment(showToastIfPending: true),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF1976D2),
                    foregroundColor: Colors.white,
                  ),
                  icon: _isChecking
                      ? const SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(
                            color: Colors.white,
                            strokeWidth: 2,
                          ),
                        )
                      : const Icon(Icons.check_circle_outline),
                  label: const Text('Đã thanh toán'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
