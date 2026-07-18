import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';

class GoogleWebViewScreen extends StatefulWidget {
  final String loginUrl;
  const GoogleWebViewScreen({super.key, required this.loginUrl});

  @override
  State<GoogleWebViewScreen> createState() => _GoogleWebViewScreenState();
}

class _GoogleWebViewScreenState extends State<GoogleWebViewScreen> {
  late final WebViewController _controller;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setUserAgent("Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.181 Mobile Safari/537.36")
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageStarted: (String url) {
            setState(() {
              _isLoading = true;
            });
            _checkUrl(url);
          },
          onPageFinished: (String url) {
            setState(() {
              _isLoading = false;
            });
            _checkUrl(url);
          },
          onNavigationRequest: (NavigationRequest request) {
            if (_checkUrl(request.url)) {
              return NavigationDecision.prevent;
            }
            return NavigationDecision.navigate;
          },
        ),
      )
      ..loadRequest(Uri.parse(widget.loginUrl));
  }

  bool _checkUrl(String url) {
    debugPrint("WebView loading URL: $url");
    if (url.contains('?token=') || url.contains('&token=')) {
      final uri = Uri.parse(url);
      final token = uri.queryParameters['token'];
      if (token != null && token.isNotEmpty) {
        // Return the token as success result
        Navigator.of(context).pop({'success': true, 'token': token});
        return true;
      }
    } else if (url.contains('?error=') || url.contains('&error=')) {
      final uri = Uri.parse(url);
      final error = uri.queryParameters['error'];
      // Return the error message
      Navigator.of(context).pop({'success': false, 'error': error ?? "Đăng nhập Google thất bại"});
      return true;
    }
    return false;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text(
          'Đăng nhập với Google',
          style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
        ),
        backgroundColor: Colors.white,
        foregroundColor: Colors.black87,
        elevation: 0.5,
        centerTitle: true,
      ),
      body: Stack(
        children: [
          WebViewWidget(controller: _controller),
          if (_isLoading)
            const Center(
              child: CircularProgressIndicator(
                color: Color(0xFF1A73E8),
              ),
            ),
        ],
      ),
    );
  }
}
