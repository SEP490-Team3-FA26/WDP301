import 'dart:math' as math;
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter/material.dart';
import '../models/user_role.dart';
import '../services/api_service.dart';
import '../services/socket_service.dart';
import 'google_webview_screen.dart';
import 'admin_screen.dart';
import 'director_screen.dart';
import 'warehouse_screen.dart';
import 'branch_screen.dart';
import 'customer_screen.dart';
import 'pharmacist_screen.dart';
import 'register_screen.dart';
import 'forgot_password_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen>
    with SingleTickerProviderStateMixin {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  late AnimationController _animController;
  late Animation<double> _fadeAnimation;
  late Animation<double> _logoScaleAnimation;
  late Animation<Offset> _slideAnimation;

  final Map<UserRole, Map<String, String>> demoCredentials = const {
    UserRole.admin:      {'email': 'admin@vinapharmacy.com',      'password': '123456'},
    UserRole.headBranch: {'email': 'director@vinapharmacy.com',   'password': '123456'},
    UserRole.warehouse:  {'email': 'warehouse@vinapharmacy.com',  'password': '123456'},
    UserRole.branch:     {'email': 'manager@vinapharmacy.com',    'password': '123456'},
    UserRole.pharmacist: {'email': 'pharmacist@vinapharmacy.com', 'password': '123456'},
    UserRole.customer:   {'email': 'user@vinapharmacy.com',       'password': '123456'},
  };

  @override
  void initState() {
    super.initState();
    // Clear token and disconnect socket on landing/returning to LoginScreen
    SocketService().disconnect();
    ApiService.currentToken = '';

    _animController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1200),
    );

    _fadeAnimation = CurvedAnimation(
      parent: _animController,
      curve: const Interval(0.0, 0.7, curve: Curves.easeOut),
    );

    _logoScaleAnimation = Tween<double>(begin: 0.6, end: 1.0).animate(
      CurvedAnimation(
        parent: _animController,
        curve: const Interval(0.0, 0.6, curve: Curves.elasticOut),
      ),
    );

    _slideAnimation =
        Tween<Offset>(begin: const Offset(0.0, 0.2), end: Offset.zero).animate(
          CurvedAnimation(
            parent: _animController,
            curve: const Interval(0.2, 1.0, curve: Curves.easeOutCubic),
          ),
        );

    _animController.forward();
  }

  @override
  void dispose() {
    _animController.dispose();
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  Future<void> _handleRealLogin() async {
    final email = _emailController.text.trim();
    final password = _passwordController.text.trim();
    if (email.isEmpty || password.isEmpty) {
      _showErrorDialog('Vui lòng nhập đầy đủ Email và Mật khẩu.');
      return;
    }

    _showLoadingDialog();

    try {
      final response = await http.post(
        Uri.parse('${ApiService.baseUrl}/api/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'email': email, 'password': password}),
      ).timeout(const Duration(seconds: 5));

      if (!mounted) return;

      if (response.statusCode == 200 || response.statusCode == 201) {
        final data = jsonDecode(response.body);
        if (data != null && data['access_token'] != null) {
          final token = data['access_token'];
          ApiService.currentToken = token;
          
          final profile = await ApiService.getProfile(token);
          if (!mounted) return;
          Navigator.of(context).pop(); // dismiss loading
          
          if (profile != null) {
            final userRole = _parseRole(profile['role']);
            // Initialize socket connection after login
            SocketService().initSocket(token);
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Đăng nhập thành công! Chào mừng ${profile['fullName'] ?? ''}'),
                backgroundColor: const Color(0xFF2E7D32),
              ),
            );
            _goToScreen(userRole);
          } else {
            _showErrorDialog('Không thể tải thông tin tài khoản (Profile rỗng).');
          }
        } else {
          Navigator.of(context).pop();
          _showErrorDialog('Đăng nhập thất bại: Không nhận được token.');
        }
      } else {
        Navigator.of(context).pop();
        _showErrorDialog('Sai email hoặc mật khẩu (401)!');
      }
    } catch (e) {
      if (!mounted) return;
      Navigator.of(context).pop();
      _showErrorDialog('Lỗi kết nối tới máy chủ DB: $e');
    }
  }

  Future<void> _handleDemoLogin(UserRole role) async {
    _showLoadingDialog();
    try {
      final response = await http.post(
        Uri.parse('${ApiService.baseUrl}/api/auth/demo-token'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'role': role.name}),
      ).timeout(const Duration(seconds: 4));
      
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data != null && data['access_token'] != null) {
          ApiService.currentToken = data['access_token'];
          // Initialize socket connection for demo login
          SocketService().initSocket(data['access_token']);
        }
      }
    } catch (e) {
      debugPrint("Demo token retrieval failed: $e");
    }

    if (!mounted) return;
    Navigator.pop(context); // Dismiss loading dialog
    _goToScreen(role);
  }

  void _goToScreen(UserRole role) {
    Widget targetScreen;
    switch (role) {
      case UserRole.admin:
        targetScreen = const AdminScreen();
        break;
      case UserRole.headBranch:
        targetScreen = const DirectorScreen();
        break;
      case UserRole.warehouse:
        targetScreen = const WarehouseScreen();
        break;
      case UserRole.branch:
        targetScreen = const BranchScreen();
        break;
      case UserRole.pharmacist:
        targetScreen = const PharmacistScreen();
        break;
      case UserRole.customer:
        targetScreen = const CustomerScreen();
        break;
    }

    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => targetScreen),
    );
  }


  void _showLoadingDialog() {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(
        child: Card(
          color: Colors.white,
          child: Padding(
            padding: EdgeInsets.all(24.0),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                CircularProgressIndicator(color: Color(0xFF1A73E8)),
                SizedBox(height: 16),
                Text(
                  'Đang xử lý thông tin...',
                  style: TextStyle(color: Colors.black87, fontWeight: FontWeight.w500),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _showErrorDialog(String message) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        backgroundColor: Colors.white,
        title: const Text('Lỗi đăng nhập', style: TextStyle(fontWeight: FontWeight.bold)),
        content: Text(message),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Đóng', style: TextStyle(color: Color(0xFF1A73E8))),
          ),
        ],
      ),
    );
  }

  UserRole _parseRole(String? roleStr) {
    switch (roleStr) {
      case 'admin':
        return UserRole.admin;
      case 'head_branch':
        return UserRole.headBranch;
      case 'warehouse':
        return UserRole.warehouse;
      case 'branch':
        return UserRole.branch;
      case 'pharmacist':
        return UserRole.pharmacist;
      case 'user':
      default:
        return UserRole.customer;
    }
  }

  Future<void> _handleGoogleLogin() async {
    final String loginUrl = '${ApiService.baseUrl}/api/auth/google';
    final result = await Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => GoogleWebViewScreen(loginUrl: loginUrl),
      ),
    );

    if (!mounted) return;

    if (result != null && result is Map<String, dynamic>) {
      if (result['success'] == true) {
        final token = result['token'];
        // Save token globally for all API calls
        ApiService.currentToken = token ?? '';
        _showLoadingDialog();
        
        try {
          final profile = await ApiService.getProfile(token);
          if (!mounted) return;
          Navigator.of(context).pop(); // dismiss loading dialog

          if (profile != null) {
            final roleStr = profile['role'];
            final userRole = _parseRole(roleStr);
            
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text('Đăng nhập thành công! Chào mừng ${profile['fullName'] ?? ''}'),
                backgroundColor: const Color(0xFF2E7D32),
              ),
            );
            _goToScreen(userRole);
          } else {
            _showErrorDialog('Không thể tải thông tin tài khoản sau khi đăng nhập Google.');
          }
        } catch (e) {
          if (!mounted) return;
          Navigator.of(context).pop(); // dismiss loading dialog
          _showErrorDialog('Có lỗi xảy ra khi kết nối tới máy chủ: $e');
        }
      } else {
        _showErrorDialog(result['error'] ?? 'Đăng nhập Google thất bại');
      }
    }
  }


  Future<void> _navigateToRegister() async {
    final registeredEmail = await Navigator.push<String>(
      context,
      MaterialPageRoute(builder: (context) => const RegisterScreen()),
    );

    if (registeredEmail != null && registeredEmail.isNotEmpty) {
      setState(() {
        _emailController.text = registeredEmail;
        _passwordController.clear();
      });
    }
  }

  Future<void> _navigateToForgotPassword() async {
    final resetEmail = await Navigator.push<String>(
      context,
      MaterialPageRoute(builder: (context) => const ForgotPasswordScreen()),
    );

    if (resetEmail != null && resetEmail.isNotEmpty) {
      setState(() {
        _emailController.text = resetEmail;
        _passwordController.clear();
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            colors: [Color(0xFFE3F2FD), Colors.white],
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
          ),
        ),
        child: FloatingBackground(
          child: SafeArea(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(
                horizontal: 24.0,
                vertical: 24.0,
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const SizedBox(height: 24),

                    // Animated Logo & Title
                    FadeTransition(
                      opacity: _fadeAnimation,
                      child: ScaleTransition(
                        scale: _logoScaleAnimation,
                        child: Column(
                          children: [
                            Center(
                              child: Container(
                                padding: const EdgeInsets.all(20),
                                decoration: BoxDecoration(
                                  color: const Color(
                                    0xFF1A73E8,
                                  ).withValues(alpha: 0.1),
                                  shape: BoxShape.circle,
                                ),
                                child: const Icon(
                                  Icons.local_pharmacy,
                                  size: 72,
                                  color: Color(0xFF1A73E8),
                                ),
                              ),
                            ),
                            const SizedBox(height: 16),
                            const Center(
                              child: Text(
                                'ABC Pharmacy',
                                style: TextStyle(
                                  fontSize: 32,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF0D47A1),
                                  letterSpacing: 1.2,
                                ),
                              ),
                            ),
                            const Center(
                              child: Text(
                                'Hệ thống quản lý chuỗi nhà thuốc thông minh',
                                style: TextStyle(
                                  fontSize: 14,
                                  color: Colors.blueGrey,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),

                    const SizedBox(height: 32),

                    // Animated Form Inputs
                    FadeTransition(
                      opacity: _fadeAnimation,
                      child: SlideTransition(
                        position: _slideAnimation,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            TextField(
                              controller: _emailController,
                              style: const TextStyle(color: Colors.black87),
                              decoration: InputDecoration(
                                prefixIcon: const Icon(
                                  Icons.email_outlined,
                                  color: Color(0xFF1A73E8),
                                ),
                                hintText: 'Email nhân viên / Khách hàng',
                                hintStyle: const TextStyle(
                                  color: Colors.black38,
                                ),
                                filled: true,
                                fillColor: const Color(0xFFF1F5F9),
                                focusedBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(16),
                                  borderSide: const BorderSide(
                                    color: Color(0xFF1A73E8),
                                    width: 2,
                                  ),
                                ),
                                enabledBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(16),
                                  borderSide: BorderSide.none,
                                ),
                              ),
                            ),
                            const SizedBox(height: 16),
                            TextField(
                              controller: _passwordController,
                              obscureText: true,
                              style: const TextStyle(color: Colors.black87),
                              decoration: InputDecoration(
                                prefixIcon: const Icon(
                                  Icons.lock_outline,
                                  color: Color(0xFF1A73E8),
                                ),
                                hintText: 'Mật khẩu',
                                hintStyle: const TextStyle(
                                  color: Colors.black38,
                                ),
                                filled: true,
                                fillColor: const Color(0xFFF1F5F9),
                                focusedBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(16),
                                  borderSide: const BorderSide(
                                    color: Color(0xFF1A73E8),
                                    width: 2,
                                  ),
                                ),
                                enabledBorder: OutlineInputBorder(
                                  borderRadius: BorderRadius.circular(16),
                                  borderSide: BorderSide.none,
                                ),
                              ),
                            ),
                            const SizedBox(height: 8),
                            Align(
                              alignment: Alignment.centerRight,
                              child: TextButton(
                                onPressed: _navigateToForgotPassword,
                                child: const Text(
                                  'Quên mật khẩu?',
                                  style: TextStyle(
                                    color: Color(0xFF1A73E8),
                                    fontWeight: FontWeight.w600,
                                    fontSize: 14,
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(height: 12),

                            // Login Button
                            ElevatedButton(
                              onPressed: _handleRealLogin,
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF1A73E8),
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(
                                  vertical: 16,
                                ),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(16),
                                ),
                                elevation: 2,
                              ),
                              child: const Text(
                                'Đăng nhập',
                                style: TextStyle(
                                  fontSize: 16,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                            ),
                            const SizedBox(height: 16),
                            const Row(
                              children: [
                                Expanded(child: Divider(color: Colors.black12)),
                                Padding(
                                  padding: EdgeInsets.symmetric(horizontal: 16),
                                  child: Text(
                                    'Hoặc',
                                    style: TextStyle(
                                      color: Colors.black45,
                                      fontSize: 13,
                                      fontWeight: FontWeight.w500,
                                    ),
                                  ),
                                ),
                                Expanded(child: Divider(color: Colors.black12)),
                              ],
                            ),
                            const SizedBox(height: 16),
                            OutlinedButton(
                              onPressed: _handleGoogleLogin,
                              style: OutlinedButton.styleFrom(
                                backgroundColor: Colors.white,
                                foregroundColor: Colors.black87,
                                side: const BorderSide(color: Color(0xFFDADCE0)),
                                padding: const EdgeInsets.symmetric(vertical: 14),
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(16),
                                ),
                                elevation: 0,
                              ),
                              child: const Row(
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                                  Icon(
                                    Icons.g_mobiledata,
                                    size: 32,
                                    color: Colors.red,
                                  ),
                                  SizedBox(width: 12),
                                  Text(
                                    'Đăng nhập bằng Google',
                                    style: TextStyle(
                                      fontSize: 15,
                                      fontWeight: FontWeight.w600,
                                      color: Colors.black87,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 20),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                const Text(
                                  'Chưa có tài khoản? ',
                                  style: TextStyle(color: Colors.black54),
                                ),
                                GestureDetector(
                                  onTap: _navigateToRegister,
                                  child: const Text(
                                    'Đăng ký ngay',
                                    style: TextStyle(
                                      color: Color(0xFF1A73E8),
                                      fontWeight: FontWeight.bold,
                                      fontSize: 15,
                                    ),
                                  ),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),

                    const SizedBox(height: 32),

                    // Animated Demo Panel
                    FadeTransition(
                      opacity: _fadeAnimation,
                      child: SlideTransition(
                        position: _slideAnimation,
                        child: Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(20),
                            border: Border.all(color: const Color(0xFFE2E8F0)),
                            boxShadow: [
                              BoxShadow(
                                color: Colors.black.withValues(alpha: 0.02),
                                blurRadius: 10,
                                offset: const Offset(0, 4),
                              ),
                            ],
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              const Text(
                                'TRẢI NGHIỆM NHANH CÁC VAI TRÒ (DEMO)',
                                textAlign: TextAlign.center,
                                style: TextStyle(
                                  fontSize: 11,
                                  fontWeight: FontWeight.bold,
                                  color: Colors.blueGrey,
                                  letterSpacing: 1.0,
                                ),
                              ),
                              const SizedBox(height: 12),
                              Wrap(
                                spacing: 8,
                                runSpacing: 8,
                                alignment: WrapAlignment.center,
                                children: UserRole.values.map((role) {
                                  Color color;
                                  switch (role) {
                                    case UserRole.admin:
                                      color = Colors.indigo.shade700;
                                      break;
                                    case UserRole.headBranch:
                                      color = const Color(0xFF0D47A1);
                                      break;
                                    case UserRole.warehouse:
                                      color = const Color(0xFF00838F);
                                      break;
                                    case UserRole.branch:
                                      color = const Color(0xFF2E7D32);
                                      break;
                                    case UserRole.pharmacist:
                                      color = const Color(0xFF0288D1);
                                      break;
                                    case UserRole.customer:
                                      color = Colors.purple.shade700;
                                      break;
                                  }

                                  return ActionChip(
                                    backgroundColor: color.withValues(
                                      alpha: 0.08,
                                    ),
                                    side: BorderSide(
                                      color: color.withValues(alpha: 0.2),
                                    ),
                                    label: Text(
                                      role.label,
                                      style: TextStyle(
                                        color: color,
                                        fontSize: 12,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    onPressed: () => _handleDemoLogin(role),
                                  );
                                }).toList(),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      );
    }
}

// FLOATING BACKDROP PARTICLES SYSTEM
class FloatingBackground extends StatefulWidget {
  final Widget child;
  const FloatingBackground({super.key, required this.child});

  @override
  State<FloatingBackground> createState() => _FloatingBackgroundState();
}

class _FloatingBackgroundState extends State<FloatingBackground>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  final List<BackgroundParticle> _particles = [];
  final math.Random _random = math.Random();

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 15),
    )..repeat();

    // Initialize random floating particles representing pills, shields, and medical crosses
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (!mounted) return;
      final size = MediaQuery.of(context).size;
      for (int i = 0; i < 15; i++) {
        _particles.add(
          BackgroundParticle(
            x: _random.nextDouble() * size.width,
            y: _random.nextDouble() * size.height,
            speedX: (_random.nextDouble() - 0.5) * 0.5,
            speedY: (_random.nextDouble() - 0.5) * 0.5,
            size: _random.nextDouble() * 26 + 18,
            rotation: _random.nextDouble() * math.pi * 2,
            rotationSpeed: (_random.nextDouble() - 0.5) * 0.015,
            type: ParticleType
                .values[_random.nextInt(ParticleType.values.length)],
            opacity:
                _random.nextDouble() * 0.08 +
                0.04, // Keep it subtle so it does not interfere with reading
          ),
        );
      }
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _controller,
      builder: (context, child) {
        final size = MediaQuery.of(context).size;
        for (var p in _particles) {
          p.update(size.width, size.height);
        }
        return CustomPaint(
          painter: BackgroundParticlesPainter(particles: _particles),
          child: widget.child,
        );
      },
    );
  }
}

enum ParticleType { pill, shield, cross }

class BackgroundParticle {
  double x;
  double y;
  double speedX;
  double speedY;
  double size;
  double rotation;
  double rotationSpeed;
  ParticleType type;
  double opacity;

  BackgroundParticle({
    required this.x,
    required this.y,
    required this.speedX,
    required this.speedY,
    required this.size,
    required this.rotation,
    required this.rotationSpeed,
    required this.type,
    required this.opacity,
  });

  void update(double width, double height) {
    x += speedX;
    y += speedY;
    rotation += rotationSpeed;

    // Wrap around border edges
    if (x < -size) {
      x = width + size;
    } else if (x > width + size) {
      x = -size;
    }
    if (y < -size) {
      y = height + size;
    } else if (y > height + size) {
      y = -size;
    }
  }
}

class BackgroundParticlesPainter extends CustomPainter {
  final List<BackgroundParticle> particles;
  BackgroundParticlesPainter({required this.particles});

  @override
  void paint(Canvas canvas, Size size) {
    for (var p in particles) {
      final paint = Paint()
        ..color = const Color(0xFF1A73E8).withValues(alpha: p.opacity)
        ..style = PaintingStyle.fill;

      canvas.save();
      canvas.translate(p.x, p.y);
      canvas.rotate(p.rotation);

      switch (p.type) {
        case ParticleType.pill:
          _drawPill(canvas, p.size, paint);
          break;
        case ParticleType.shield:
          _drawShield(canvas, p.size, paint);
          break;
        case ParticleType.cross:
          _drawCross(canvas, p.size, paint);
          break;
      }

      canvas.restore();
    }
  }

  // Draws capsule tablet shape
  void _drawPill(Canvas canvas, double size, Paint paint) {
    final rect = Rect.fromCenter(
      center: Offset.zero,
      width: size,
      height: size * 0.45,
    );
    final rrect = RRect.fromRectAndRadius(rect, Radius.circular(size * 0.225));
    canvas.drawRRect(rrect, paint);

    // Draw capsule division seam line
    final linePaint = Paint()
      ..color = Colors.white.withValues(alpha: paint.color.a * 0.8)
      ..strokeWidth = 1.5
      ..style = PaintingStyle.stroke;
    canvas.drawLine(
      Offset(0, -size * 0.225),
      Offset(0, size * 0.225),
      linePaint,
    );
  }

  // Draws virus safety shield shape
  void _drawShield(Canvas canvas, double size, Paint paint) {
    final path = Path();
    final w = size * 0.75;
    final h = size;

    path.moveTo(0, -h / 2);
    path.quadraticBezierTo(w / 2, -h / 2, w / 2, -h / 6);
    path.quadraticBezierTo(w / 2, h / 4, 0, h / 2);
    path.quadraticBezierTo(-w / 2, h / 4, -w / 2, -h / 6);
    path.quadraticBezierTo(-w / 2, -h / 2, 0, -h / 2);
    path.close();

    canvas.drawPath(path, paint);

    // Draw a subtle inner shield accent line
    final accentPaint = Paint()
      ..color = Colors.white.withValues(alpha: paint.color.a * 0.5)
      ..strokeWidth = 1.2
      ..style = PaintingStyle.stroke;
    final accentPath = Path();
    final aw = w * 0.6;
    final ah = h * 0.75;
    accentPath.moveTo(0, -ah / 2);
    accentPath.quadraticBezierTo(aw / 2, -ah / 2, aw / 2, -ah / 6);
    accentPath.quadraticBezierTo(aw / 2, ah / 4, 0, ah / 2);
    accentPath.quadraticBezierTo(-aw / 2, ah / 4, -aw / 2, -ah / 6);
    accentPath.quadraticBezierTo(-aw / 2, -ah / 2, 0, -ah / 2);
    accentPath.close();
    canvas.drawPath(accentPath, accentPaint);
  }

  // Draws medical plus shape
  void _drawCross(Canvas canvas, double size, Paint paint) {
    final thick = size * 0.22;
    final len = size * 0.7;

    final path = Path();
    path.addRect(
      Rect.fromCenter(center: Offset.zero, width: len, height: thick),
    );
    path.addRect(
      Rect.fromCenter(center: Offset.zero, width: thick, height: len),
    );

    canvas.drawPath(path, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}
