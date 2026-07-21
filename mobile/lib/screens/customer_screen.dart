import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:path_provider/path_provider.dart';
import 'package:record/record.dart';
import 'package:url_launcher/url_launcher.dart';
import '../services/api_service.dart';
import '../widgets/notification_badge.dart';

class CustomerScreen extends StatefulWidget {
  const CustomerScreen({super.key});

  @override
  State<CustomerScreen> createState() => _CustomerScreenState();
}

class _CustomerScreenState extends State<CustomerScreen>
    with TickerProviderStateMixin {
  late TabController _tabController;
  final List<Map<String, dynamic>> _cart = [];

  // DB & Paginated (Lazy Load) state
  final List<Map<String, dynamic>> _medicines = [];
  int _currentPage = 1;
  bool _isLoading = false;
  bool _hasMore = true;
  final ScrollController _scrollController = ScrollController();

  // Search & Filter state
  String _searchQuery = "";
  String _selectedCategory = "";
  Timer? _debounceTimer;

  // Interaction check state
  bool _checkingInteractions = false;
  Map<String, dynamic>? _interactionResult;

  // Voice / AI Consultant state & animations
  final _audioRecorder = AudioRecorder();
  bool _recording = false; // simulated "recording" animation state
  int _timerSeconds = 0;
  Timer? _recordingTimer;
  bool _aiLoading = false;
  Map<String, dynamic>? _aiRecommendationResult;
  late AnimationController _waveAnimationController;
  final _symptomsController = TextEditingController(); // text input for symptoms
  bool _showSymptomsInput = false;

  // Checkout Form State
  final _fullnameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _addressController = TextEditingController();
  String _paymentMethod = "CASH";

  // Voucher State
  final _voucherCodeController = TextEditingController();
  Map<String, dynamic>? _appliedVoucher;
  bool _isValidatingVoucher = false;
  String? _voucherErrorMsg;

  // Profile & Order History State
  Map<String, dynamic>? _userProfile;
  List<Map<String, dynamic>> _myOrders = [];
  bool _isLoadingOrders = false;
  final _searchPhoneController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 5, vsync: this);

    // Setup lazy loading scroll listener
    _scrollController.addListener(() {
      if (_scrollController.position.pixels >=
          _scrollController.position.maxScrollExtent - 200) {
        _loadMedicines();
      }
    });

    _waveAnimationController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    );

    // Initial load
    _loadMedicines(reset: true);
    _loadUserProfileAndOrders();
  }

  Future<void> _loadUserProfileAndOrders() async {
    if (!mounted) return;
    setState(() => _isLoadingOrders = true);
    final profile = await ApiService.getProfile();
    if (profile != null && mounted) {
      _userProfile = profile;
      if (_fullnameController.text.isEmpty && profile['fullName'] != null) {
        _fullnameController.text = profile['fullName'];
      }
      if (_phoneController.text.isEmpty && profile['phone'] != null) {
        _phoneController.text = profile['phone'];
      }
      if (_addressController.text.isEmpty && profile['address'] != null) {
        _addressController.text = profile['address'];
      }
    }
    final phone = _searchPhoneController.text.isNotEmpty
        ? _searchPhoneController.text
        : (_userProfile?['phone'] ?? '');
    final orders = await ApiService.getMyOrders(phone: phone);
    if (mounted) {
      setState(() {
        _myOrders = orders;
        _isLoadingOrders = false;
      });
    }
  }

  @override
  void dispose() {
    _audioRecorder.dispose();
    _tabController.dispose();
    _scrollController.dispose();
    _debounceTimer?.cancel();
    _recordingTimer?.cancel();
    _fullnameController.dispose();
    _phoneController.dispose();
    _addressController.dispose();
    _symptomsController.dispose();
    _searchPhoneController.dispose();
    _voucherCodeController.dispose();
    _waveAnimationController.dispose();
    super.dispose();
  }

  Future<void> _applyVoucherCode() async {
    if (_appliedVoucher != null) {
      setState(() {
        _appliedVoucher = null;
        _voucherCodeController.clear();
        _voucherErrorMsg = null;
      });
      return;
    }

    final code = _voucherCodeController.text.trim();
    if (code.isEmpty) {
      setState(() => _voucherErrorMsg = 'Vui lòng nhập mã giảm giá');
      return;
    }

    setState(() {
      _isValidatingVoucher = true;
      _voucherErrorMsg = null;
    });

    final int subtotalAmt = _cart.fold(0, (sum, item) => sum + (item['price'] as int) * (item['qty'] as int));
    final res = await ApiService.validateVoucher(code, subtotalAmt);
    if (!mounted) return;

    if (res['error'] == true) {
      setState(() {
        _isValidatingVoucher = false;
        _voucherErrorMsg = res['message'] ?? 'Mã không hợp lệ';
        _appliedVoucher = null;
      });
    } else {
      setState(() {
        _isValidatingVoucher = false;
        _appliedVoucher = res;
        _voucherErrorMsg = null;
      });
      final discount = res['discount'] ?? 0;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('🎉 Áp dụng thành công mã $code! Giảm $discount ₫'),
          backgroundColor: Colors.green,
        ),
      );
    }
  }

  // Load medicines from DB with pagination (Lazy Loading)
  Future<void> _loadMedicines({bool reset = false}) async {
    if (_isLoading) return;
    if (reset) {
      setState(() {
        _currentPage = 1;
        _medicines.clear();
        _hasMore = true;
      });
    }

    if (!_hasMore) return;

    setState(() {
      _isLoading = true;
    });

    try {
      final results = await ApiService.getMedicines(
        page: _currentPage,
        limit: 10,
        search: _searchQuery,
        category: _selectedCategory,
      );

      setState(() {
        _isLoading = false;
        if (results.length < 10) {
          _hasMore = false;
        }
        _medicines.addAll(results);
        _currentPage++;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      _showToast(
        'Không thể kết nối đến máy chủ. Đang dùng chế độ offline.',
        Colors.orange,
      );
    }
  }

  Widget _buildImagePlaceholder() {
    return Container(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [Colors.blue.shade50, Colors.teal.shade50],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Icon(
        Icons.medication_liquid,
        size: 32,
        color: Colors.blue.shade300,
      ),
    );
  }

  Widget _buildDetailRow(String label, String value, {Color? valueColor}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 100,
            child: Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                color: Colors.grey.shade500,
              ),
            ),
          ),
          Expanded(
            child: Text(
              value,
              style: TextStyle(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                color: valueColor ?? const Color(0xFF2C3E50),
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _showMedicineDetails(Map<String, dynamic> med) {
    final isRx = med['isRx'] as bool? ?? false;
    final outOfStock = (med['stock'] as num? ?? 0) <= 0;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => Container(
        height: MediaQuery.of(context).size.height * 0.75,
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
        ),
        child: Column(
          children: [
            // Handle bar
            const SizedBox(height: 12),
            Container(
              width: 40,
              height: 5,
              decoration: BoxDecoration(
                color: Colors.grey.shade300,
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            const SizedBox(height: 16),

            // Main scrollable details
            Expanded(
              child: SingleChildScrollView(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Top: Image and title
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          width: 100,
                          height: 100,
                          decoration: BoxDecoration(
                            color: Colors.grey.shade50,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(color: Colors.grey.shade200),
                          ),
                          clipBehavior: Clip.antiAlias,
                          child:
                              med['image'] != null &&
                                  med['image'].toString().isNotEmpty
                              ? Image.network(
                                  med['image'],
                                  fit: BoxFit.contain,
                                  errorBuilder: (context, error, stackTrace) =>
                                      _buildImagePlaceholder(),
                                )
                              : _buildImagePlaceholder(),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 8,
                                  vertical: 4,
                                ),
                                decoration: BoxDecoration(
                                  color: isRx
                                      ? Colors.red.shade50
                                      : Colors.green.shade50,
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  isRx
                                      ? 'Rx - Thuốc kê đơn'
                                      : 'OTC - Không kê đơn',
                                  style: TextStyle(
                                    fontSize: 9,
                                    fontWeight: FontWeight.bold,
                                    color: isRx
                                        ? Colors.red.shade700
                                        : Colors.green.shade700,
                                  ),
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                med['name'] ?? 'N/A',
                                style: const TextStyle(
                                  fontWeight: FontWeight.w900,
                                  fontSize: 13,
                                  color: Color(0xFF2C3E50),
                                  height: 1.3,
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '${med['price'] ?? 0} ₫ / ${med['unit'] ?? 'Hộp'}',
                                style: const TextStyle(
                                  fontWeight: FontWeight.w900,
                                  fontSize: 13,
                                  color: Color(0xFF0D47A1),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const Divider(height: 32),

                    // Active Ingredient & Category
                    _buildDetailRow('Hoạt chất', med['active'] ?? 'N/A'),
                    _buildDetailRow(
                      'Phân nhóm',
                      med['category'] ?? 'Chưa phân loại',
                    ),
                    _buildDetailRow(
                      'Nhà sản xuất',
                      med['manufacturer'] ?? 'N/A',
                    ),
                    _buildDetailRow(
                      'Dạng bào chế',
                      med['dosage_form'] ?? 'N/A',
                    ),
                    _buildDetailRow(
                      'Số đăng ký',
                      med['registration_number'] ?? 'N/A',
                    ),
                    _buildDetailRow(
                      'Tình trạng',
                      outOfStock
                          ? 'Hết hàng'
                          : 'Còn hàng (Tồn: ${med['stock']} ${med['unit']})',
                      valueColor: outOfStock
                          ? Colors.red
                          : Colors.green.shade700,
                    ),
                    const Divider(height: 32),

                    // Công dụng (Indications)
                    const Text(
                      'Chỉ định / Công dụng',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                        color: Color(0xFF2C3E50),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      med['cong_dung'] ?? 'N/A',
                      style: TextStyle(
                        fontSize: 11,
                        color: Colors.grey.shade700,
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Cách dùng (Dosage)
                    const Text(
                      'Liều dùng / Hướng dẫn',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                        color: Color(0xFF2C3E50),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      med['cach_dung'] ?? 'N/A',
                      style: TextStyle(
                        fontSize: 11,
                        color: Colors.grey.shade700,
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Tác dụng phụ (Side effects)
                    const Text(
                      'Tác dụng không mong muốn',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                        color: Color(0xFF2C3E50),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      med['tac_dung_phu'] ?? 'N/A',
                      style: TextStyle(
                        fontSize: 11,
                        color: Colors.grey.shade700,
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Lưu ý / Chống chỉ định
                    const Text(
                      'Lưu ý & Thận trọng',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                        color: Color(0xFF2C3E50),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      med['luu_y'] ?? 'N/A',
                      style: TextStyle(
                        fontSize: 11,
                        color: Colors.grey.shade700,
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 16),

                    // Bảo quản
                    const Text(
                      'Bảo quản',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                        color: Color(0xFF2C3E50),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      med['bao_quan'] ?? 'N/A',
                      style: TextStyle(
                        fontSize: 11,
                        color: Colors.grey.shade700,
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 32),
                  ],
                ),
              ),
            ),

            // Bottom Actions: Add to Cart button
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
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
              child: SafeArea(
                top: false,
                child: Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        onPressed: outOfStock
                            ? null
                            : () {
                                _addToCart(med);
                                Navigator.pop(context);
                              },
                        icon: const Icon(
                          Icons.add_shopping_cart,
                          color: Colors.white,
                        ),
                        label: Text(
                          outOfStock
                              ? 'SẢN PHẨM HẾT HÀNG'
                              : 'THÊM VÀO GIỎ HÀNG',
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF0D47A1),
                          disabledBackgroundColor: Colors.grey.shade300,
                          padding: const EdgeInsets.symmetric(vertical: 14),
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
          ],
        ),
      ),
    );
  }

  void _onSearchChanged(String query) {
    if (_debounceTimer?.isActive ?? false) _debounceTimer!.cancel();
    _debounceTimer = Timer(const Duration(milliseconds: 500), () {
      setState(() {
        _searchQuery = query;
      });
      _loadMedicines(reset: true);
    });
  }

  // Cart operations
  void _addToCart(Map<String, dynamic> med, {int qty = 1}) {
    setState(() {
      final existingIndex = _cart.indexWhere((item) => item['id'] == med['id']);
      if (existingIndex >= 0) {
        if (_cart[existingIndex]['qty'] + qty > med['stock']) {
          _showToast(
            'Chỉ còn ${med['stock']} sản phẩm khả dụng trong kho!',
            Colors.orange,
          );
          return;
        }
        _cart[existingIndex]['qty'] += qty;
      } else {
        if (med['stock'] <= 0) {
          _showToast('Sản phẩm đã hết hàng!', Colors.red);
          return;
        }
        _cart.add({
          'id': med['id'],
          'name': med['name'],
          'price': med['price'],
          'unit': med['unit'],
          'qty': qty,
          'stock': med['stock'],
          'active': med['active'],
        });
      }
      _interactionResult = null; // Clear interaction checks when cart changes
    });
    _showToast('Đã thêm ${med['name']} vào giỏ hàng', Colors.green);
  }

  void _updateCartQty(String id, int change) {
    setState(() {
      final index = _cart.indexWhere((item) => item['id'] == id);
      if (index >= 0) {
        final newQty = _cart[index]['qty'] + change;
        if (newQty <= 0) {
          _cart.removeAt(index);
        } else {
          if (newQty > _cart[index]['stock']) {
            _showToast('Vượt quá số lượng tồn kho khả dụng!', Colors.orange);
            return;
          }
          _cart[index]['qty'] = newQty;
        }
      }
      _interactionResult = null;
    });
  }

  void _showToast(String message, Color color) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          message,
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        backgroundColor: color,
        behavior: SnackBarBehavior.floating,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
        duration: const Duration(seconds: 2),
      ),
    );
  }

  // Price calculations
  int get _subtotal => _cart.fold(
    0,
    (sum, item) => sum + ((item['price'] as int) * (item['qty'] as int)),
  );
  int get _discount => (_subtotal * 0.05).round(); // 5% VIP discount
  int get _vat => ((_subtotal - _discount) * 0.08).round(); // 8% VAT
  int get _totalAmount => _subtotal - _discount + _vat;

  // AI Drug Interaction check using database/API data
  Future<void> _checkAIInteractions() async {
    if (_cart.length < 2) {
      _showToast(
        'Cần ít nhất 2 loại thuốc để kiểm tra tương tác.',
        Colors.orange,
      );
      return;
    }

    setState(() {
      _checkingInteractions = true;
      _interactionResult = null;
    });

    final names = _cart.map((e) => e['name'] as String).toList();
    final result = await ApiService.checkInteractions(names);

    setState(() {
      _checkingInteractions = false;
      if (result != null) {
        _interactionResult = {
          'risk': result['risk'] ?? 'MEDIUM',
          'title': result['title'] ?? 'KẾT QUẢ PHÂN TÍCH TƯƠNG TÁC THUỐC',
          'description':
              result['description'] ??
              'Tìm thấy tương tác chéo tiềm ẩn giữa các hoạt chất của đơn thuốc.',
          'advice':
              result['advice'] ??
              'Nên tham khảo kỹ liều lượng và chỉ định của bác sĩ.',
        };
      } else {
        // Fallback simulation if backend is offline
        final hasAmoxicillin = names.any(
          (n) => n.toLowerCase().contains('amoxicillin'),
        );
        final hasCefuroxim = names.any(
          (n) => n.toLowerCase().contains('cefuroxim'),
        );

        if (hasAmoxicillin && hasCefuroxim) {
          _interactionResult = {
            'risk': 'HIGH',
            'title': 'CẢNH BÁO NGUY HIỂM (CẤP ĐỘ CAO)',
            'description':
                'Sử dụng đồng thời Amoxicillin và Cefuroxim (cùng nhóm Beta-lactam) làm tăng nguy cơ kháng thuốc, gây suy giảm đề kháng vi khuẩn có lợi ở ruột và tăng độc tính thận.',
            'advice':
                'Khuyên dùng: Chỉ nên chọn một loại kháng sinh điều trị thích hợp theo chỉ định của bác sĩ.',
          };
        } else {
          _interactionResult = {
            'risk': 'SAFE',
            'title': 'GIỎ HÀNG AN TOÀN',
            'description':
                'AI không phát hiện bất kỳ cảnh báo tương tác chéo nghiêm trọng nào giữa các loại dược phẩm hiện tại trong giỏ hàng.',
            'advice':
                'Lời khuyên: Hãy tuân thủ hướng dẫn liều dùng ghi trên nhãn thuốc.',
          };
        }
      }
    });
  }

  Future<void> _startVoiceRecording() async {
    try {
      if (await _audioRecorder.hasPermission()) {
        setState(() {
          _recording = true;
          _timerSeconds = 0;
          _aiRecommendationResult = null;
          _showSymptomsInput = false;
        });
        _waveAnimationController.repeat();
        _recordingTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
          setState(() => _timerSeconds++);
        });
        
        String recordPath = '';
        if (!kIsWeb) {
          final tempDir = await getTemporaryDirectory();
          recordPath = '${tempDir.path}/consult_voice_${DateTime.now().millisecondsSinceEpoch}.wav';
        }

        await _audioRecorder.start(
          const RecordConfig(encoder: AudioEncoder.wav),
          path: recordPath,
        );
      } else {
        _showToast('Không có quyền sử dụng Microphone!', Colors.orange);
        setState(() {
          _showSymptomsInput = true;
        });
      }
    } catch (e) {
      debugPrint("Lỗi bắt đầu ghi âm: $e");
      _showToast('Không hỗ trợ ghi âm trực tiếp. Đang chuyển sang nhập văn bản.', Colors.orange);
      setState(() {
        _showSymptomsInput = true;
      });
    }
  }

  Future<void> _stopVoiceRecording() async {
    _recordingTimer?.cancel();
    _waveAnimationController.stop();
    setState(() {
      _recording = false;
      _aiLoading = true;
    });

    try {
      final path = await _audioRecorder.stop();
      if (path != null) {
        final apiResult = await ApiService.getVoicePrescription(path);
        _handleAIResult(apiResult, 'Yêu cầu tư vấn bằng giọng nói');
      } else {
        throw Exception("Ghi âm trống");
      }
    } catch (e) {
      debugPrint("Lỗi ghi âm: $e");
      _showToast('Lỗi nhận diện giọng nói. Hãy mô tả triệu chứng bằng văn bản.', Colors.orange);
      setState(() {
        _aiLoading = false;
        _showSymptomsInput = true;
      });
    }
  }

  void _handleAIResult(Map<String, dynamic>? apiResult, String defaultTranscript) {
    setState(() {
      _aiLoading = false;
      _showSymptomsInput = false;
      if (apiResult != null && apiResult['success'] == true) {
        final prescription = apiResult['prescription'] as Map<String, dynamic>? ?? apiResult;
        final recommended = (prescription['recommended_drugs'] as List?) ??
            (apiResult['drugs'] as List?) ?? [];
        final transcript = apiResult['transcribed_text']?.toString() ?? defaultTranscript;

        _aiRecommendationResult = {
          'transcript': transcript,
          'symptoms': prescription['patient_symptoms'] ??
              apiResult['patient_symptoms'] ?? transcript,
          'warnings': prescription['warnings'] ??
              apiResult['warnings'] ?? 'Không phát hiện chống chỉ định.',
          'drugs': recommended.map((drug) {
            final drugName = drug['name']?.toString() ?? 'N/A';
            final match = _medicines.firstWhere(
              (m) =>
                  m['name'].toString().toLowerCase().contains(drugName.toLowerCase()) ||
                  drugName.toLowerCase().contains(m['name'].toString().toLowerCase()),
              orElse: () => {},
            );
            return {
              'name': drugName,
              'dosage': '${drug['dosage'] ?? ''} - ${drug['usage'] ?? ''}',
              'qty': 1,
              'isAvailable': match.isNotEmpty,
            };
          }).toList(),
        };
      } else {
        // Offline fallback
        _aiRecommendationResult = {
          'transcript': defaultTranscript,
          'symptoms': 'Sốt cao nhẹ, nhức đầu vùng trán, nghẹt mũi do cảm cúm. (Chế độ offline)',
          'warnings': 'Tránh uống Panadol Extra nếu bị dị ứng caffeine. Uống nhiều nước ấm.',
          'drugs': [
            {
              'name': 'Panadol Extra',
              'dosage': 'Uống 1 viên sau ăn, ngày 2-3 lần khi đau sốt.',
              'qty': 1,
              'isAvailable': _medicines.any((m) =>
                  m['name'].toString().toLowerCase().contains('panadol')),
            },
            {
              'name': 'Decolgen Forte',
              'dosage': 'Uống 1 viên sau ăn, ngày 2 lần để giảm nghẹt mũi.',
              'qty': 1,
              'isAvailable': _medicines.any((m) =>
                  m['name'].toString().toLowerCase().contains('decolgen')),
            },
            {
              'name': 'Strepsils Cool',
              'dosage': 'Ngậm trực tiếp 1 viên, cách nhau 2-3 tiếng để dịu cổ họng.',
              'qty': 1,
              'isAvailable': _medicines.any((m) =>
                  m['name'].toString().toLowerCase().contains('strepsils')),
            },
          ],
        };
      }
    });
  }

  Future<void> _callAIConsultAPI(String symptoms) async {
    setState(() => _aiLoading = true);
    final apiResult = await ApiService.getTextPrescription(symptoms);
    _handleAIResult(apiResult, symptoms);
  }

  void _addAllAiMedsToCart() {
    if (_aiRecommendationResult == null) return;
    int count = 0;
    for (var drug in _aiRecommendationResult!['drugs']) {
      final match = _medicines.firstWhere(
        (m) =>
            m['name'].toString().toLowerCase().contains(drug['name'].toString().toLowerCase()) ||
            drug['name'].toString().toLowerCase().contains(m['name'].toString().toLowerCase()),
        orElse: () => {},
      );
      if (match.isNotEmpty) {
        _addToCart(match, qty: drug['qty'] as int);
        count++;
      }
    }
    if (count > 0) {
      _showToast('Đã thêm $count sản phẩm đề xuất vào giỏ hàng!', Colors.green);
      _tabController.animateTo(1); // Swipe to Cart tab
    }
  }

  Future<void> _launchPaymentUrl(String urlString) async {
    try {
      final url = Uri.parse(urlString);
      await launchUrl(
        url,
        mode: LaunchMode.inAppBrowserView,
      );
    } catch (e) {
      debugPrint("Could not launch payment URL with inAppBrowserView: $e");
      try {
        final url = Uri.parse(urlString);
        await launchUrl(url, mode: LaunchMode.externalApplication);
      } catch (e2) {
        _showToast('Không thể tự động mở trang thanh toán.', Colors.orange);
      }
    }
  }

  Future<void> _verifyPaymentAndComplete(dynamic orderCode, BuildContext dialogCtx) async {
    final statusRes = await ApiService.checkOrderPayment(orderCode);
    if (!mounted) return;

    if (statusRes != null && statusRes['status'] == 'PAID') {
      Navigator.pop(dialogCtx); // close payment dialog
      _showToast('Thanh toán thành công! Đơn hàng đã được xác nhận.', Colors.green);
      setState(() {
        _cart.clear();
        _fullnameController.clear();
        _phoneController.clear();
        _addressController.clear();
      });
      _tabController.animateTo(0);
    } else if (statusRes != null && statusRes['status'] == 'CANCELLED') {
      _showToast('Đơn hàng đã bị hủy.', Colors.red);
    } else {
      _showToast('Chưa nhận được xác nhận thanh toán từ ngân hàng. Vui lòng hoàn tất chuyển khoản.', Colors.orange);
    }
  }

  Future<void> _processCheckout() async {
    if (_fullnameController.text.isEmpty ||
        _phoneController.text.isEmpty ||
        _addressController.text.isEmpty) {
      _showToast('Vui lòng điền đầy đủ thông tin giao hàng!', Colors.orange);
      return;
    }

    int subtotalAmt = _cart.fold(0, (sum, item) => sum + (item['price'] as int) * (item['qty'] as int));
    int memberDiscountAmt = (subtotalAmt * 0.05).round();
    int voucherDiscountAmt = _appliedVoucher != null ? (_appliedVoucher!['discount'] as num).toInt() : 0;
    int afterDiscountAmt = (subtotalAmt - memberDiscountAmt - voucherDiscountAmt).clamp(0, 999999999);
    int vatAmt = (afterDiscountAmt * 0.08).round();
    int finalTotalAmt = (afterDiscountAmt + vatAmt);

    final String mappedPaymentMethod = _paymentMethod == 'QR' ? 'QR_PAY' : _paymentMethod;

    final orderData = {
      'patientName': _fullnameController.text,
      'patientPhone': _phoneController.text,
      'shippingAddress': _addressController.text,
      'paymentMethod': mappedPaymentMethod,
      if (_appliedVoucher != null && _appliedVoucher!['code'] != null)
        'voucherCode': _appliedVoucher!['code'],
      'returnUrl': '${ApiService.baseUrl}/api/orders/payos-callback',
      'cancelUrl': '${ApiService.baseUrl}/api/orders/payos-callback?cancel=true',
      'items': _cart
          .map((item) => {
                'medicineId': (item['id'] != null && item['id'].toString().isNotEmpty)
                    ? item['id'].toString()
                    : 'MED-001',
                'name': item['name'],
                'price': item['price'],
                'quantity': item['qty'],
              })
          .toList(),
      'totalAmount': finalTotalAmt,
      'type': 'ONLINE',
    };

    // Show loading overlay
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(
        child: Card(
          color: Colors.white,
          child: Padding(
            padding: EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                CircularProgressIndicator(color: Color(0xFF0D47A1)),
                SizedBox(height: 12),
                Text('Đang xử lý đơn hàng...', style: TextStyle(fontWeight: FontWeight.bold)),
              ],
            ),
          ),
        ),
      ),
    );

    // ── ONLINE PAYMENT (QR / CARD) → gọi PayOS API ──
    if (_paymentMethod == 'CARD' || _paymentMethod == 'QR') {
      final payosResult = await ApiService.createPayOSLink(orderData);
      if (!mounted) return;
      Navigator.pop(context); // dismiss loading

      if (payosResult != null) {
        final payUrl = payosResult['checkoutUrl'] ??
            payosResult['paymentUrl'] ??
            payosResult['url'] ??
            '';
        final orderId = payosResult['orderCode'] ??
            payosResult['orderId'] ??
            payosResult['id'] ??
            'ORD-${DateTime.now().millisecondsSinceEpoch}';

        // Auto-launch URL
        if (payUrl.isNotEmpty) {
          _launchPaymentUrl(payUrl);
        }

        Timer? pollTimer;

        showDialog(
          context: context,
          builder: (ctx) {
            // Start background polling for payment status completion
            pollTimer?.cancel();
            pollTimer = Timer.periodic(const Duration(seconds: 2), (timer) async {
              final statusRes = await ApiService.checkOrderPayment(orderId);
              if (!mounted) {
                timer.cancel();
                return;
              }
              if (statusRes != null && (statusRes['status'] == 'PAID' || statusRes['paymentStatus'] == 'PAID')) {
                timer.cancel();
                if (Navigator.canPop(ctx)) {
                  Navigator.of(ctx, rootNavigator: true).pop();
                }
                _showToast('Thanh toán thành công! Đơn hàng đã được xác nhận.', Colors.green);
                setState(() {
                  _cart.clear();
                  _fullnameController.clear();
                  _phoneController.clear();
                  _addressController.clear();
                });
                _tabController.animateTo(0);
              }
            });

            return AlertDialog(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
              title: Row(
                children: [
                  Icon(Icons.qr_code_scanner, color: Colors.blue.shade700, size: 28),
                  const SizedBox(width: 8),
                  const Expanded(
                    child: Text('Thanh Toán Trực Tuyến',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                  ),
                ],
              ),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.blue.shade50,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.blue.shade100),
                    ),
                    child: Column(
                      children: [
                        Icon(Icons.payment, size: 48, color: Colors.blue.shade700),
                        const SizedBox(height: 8),
                        Text('Đơn hàng #$orderId',
                            style: const TextStyle(
                                fontWeight: FontWeight.bold, fontSize: 13)),
                        const SizedBox(height: 4),
                        Text('$_totalAmount ₫',
                            style: TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.w900,
                                color: Colors.blue.shade800)),
                      ],
                    ),
                  ),
                  if (payUrl.isNotEmpty) ...[  
                    const SizedBox(height: 16),
                    ElevatedButton.icon(
                      onPressed: () => _launchPaymentUrl(payUrl),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.blue.shade700,
                        foregroundColor: Colors.white,
                        minimumSize: const Size.fromHeight(45),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      icon: const Icon(Icons.open_in_new),
                      label: const Text(
                        'Mở Trang Thanh Toán PayOS',
                        style: TextStyle(fontWeight: FontWeight.bold),
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Hoặc sao chép đường dẫn bên dưới nếu trình duyệt không tự mở:',
                      style: TextStyle(fontSize: 9, color: Colors.grey),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: Colors.grey.shade100,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: SelectableText(
                        payUrl,
                        style: const TextStyle(fontSize: 9, color: Colors.blue),
                      ),
                    ),
                  ],
                ],
              ),
              actions: [
                OutlinedButton.icon(
                  onPressed: () {
                    _verifyPaymentAndComplete(orderId, ctx);
                  },
                  icon: const Icon(Icons.refresh, size: 16),
                  label: const Text('Kiểm tra thanh toán', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
                TextButton(
                  onPressed: () {
                    pollTimer?.cancel();
                    Navigator.pop(ctx);
                    setState(() {
                      _cart.clear();
                      _fullnameController.clear();
                      _phoneController.clear();
                      _addressController.clear();
                    });
                    _tabController.animateTo(0);
                  },
                  child: const Text('Bỏ qua & Về cửa hàng',
                      style: TextStyle(fontWeight: FontWeight.bold, color: Colors.grey)),
                ),
              ],
            );
          },
        ).then((_) => pollTimer?.cancel());
      } else {
        // PayOS failed, fall back to CASH order
        _showToast('Cổng thanh toán không phản hồi. Đang tạo đơn COD...', Colors.orange);
        final result = await ApiService.createOrder({...orderData, 'paymentMethod': 'CASH'});
        if (!mounted) return;
        if (result != null) _showOrderSuccessDialog(result);
      }
      return;
    }

    // ── CASH (COD) ──
    final result = await ApiService.createOrder(orderData);
    if (!mounted) return;
    Navigator.pop(context); // dismiss loading
    if (result != null) {
      _showOrderSuccessDialog(result);
    } else {
      _showToast('Không thể kết nối đến máy chủ để tạo đơn hàng.', Colors.red);
    }
  }

  void _showOrderSuccessDialog(Map<String, dynamic> result) {
    final orderId = result['orderId'] ?? result['id'] ?? result['orderCode'] ??
        'ORD-${DateTime.now().millisecondsSinceEpoch}';
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        title: Row(
          children: [
            Icon(Icons.check_circle, color: Colors.green.shade700),
            const SizedBox(width: 8),
            const Text('Đặt hàng thành công!',
                style: TextStyle(fontWeight: FontWeight.bold)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Đơn hàng #$orderId đã ghi nhận:',
                style:
                    const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
            const SizedBox(height: 12),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.grey.shade50,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.grey.shade200),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Khách nhận: ${_fullnameController.text}',
                      style: const TextStyle(
                          fontSize: 11, fontWeight: FontWeight.bold)),
                  Text('SĐT: ${_phoneController.text}',
                      style: const TextStyle(fontSize: 11)),
                  Text('Địa chỉ: ${_addressController.text}',
                      style: const TextStyle(fontSize: 11)),
                  Text(
                    'Thanh toán: ${_paymentMethod == 'CASH' ? 'Tiền mặt (COD)' : _paymentMethod == 'CARD' ? 'Thẻ tín dụng' : 'VNPay/QR'}',
                    style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: Colors.blue),
                  ),
                  const Divider(),
                  Text('Tổng cộng: $_totalAmount ₫',
                      style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.w900,
                          color: Colors.red)),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.pop(context);
              setState(() {
                _cart.clear();
                _fullnameController.clear();
                _phoneController.clear();
                _addressController.clear();
              });
              _tabController.animateTo(0);
            },
            child: const Text('Đóng & Về Cửa Hàng',
                style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }


  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'ABC Pharmacy Store',
              style: TextStyle(
                fontWeight: FontWeight.w900,
                fontSize: 18,
                color: Colors.white,
              ),
            ),
            Text(
              'CỔNG MUA SẮM KHÁCH HÀNG AI',
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.bold,
                color: Colors.white70,
                letterSpacing: 1.0,
              ),
            ),
          ],
        ),
        flexibleSpace: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Color(0xFF0D47A1), Color(0xFF1976D2)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
        ),
        elevation: 4,
        iconTheme: const IconThemeData(color: Colors.white),
        actions: const [
          NotificationBadge(iconColor: Colors.white),
        ],
        bottom: TabBar(
          controller: _tabController,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white60,
          indicatorColor: Colors.white,
          indicatorWeight: 3.0,
          isScrollable: false,
          labelPadding: const EdgeInsets.symmetric(horizontal: 2.0),
          labelStyle: const TextStyle(fontSize: 10.5, fontWeight: FontWeight.bold),
          unselectedLabelStyle: const TextStyle(fontSize: 10.5),
          tabs: const [
            Tab(icon: Icon(Icons.storefront, size: 20), text: 'Mua Thuốc'),
            Tab(icon: Icon(Icons.shopping_cart, size: 20), text: 'Giỏ Hàng'),
            Tab(icon: Icon(Icons.psychology, size: 20), text: 'Tư Vấn AI'),
            Tab(icon: Icon(Icons.receipt_long, size: 20), text: 'Đặt Hàng'),
            Tab(icon: Icon(Icons.person, size: 20), text: 'Hồ Sơ'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildShopTab(),
          _buildCartTab(),
          _buildAIConsultTab(),
          _buildCheckoutTab(),
          _buildProfileTab(),
        ],
      ),
    );
  }

  // TAB UIs BUILDERS
  Widget _buildShopTab() {
    return Padding(
      padding: const EdgeInsets.all(12.0),
      child: Column(
        children: [
          // Search Input
          Container(
            decoration: BoxDecoration(
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.05),
                  blurRadius: 10,
                  offset: const Offset(0, 4),
                ),
              ],
            ),
            child: TextField(
              onChanged: _onSearchChanged,
              decoration: InputDecoration(
                hintText: 'Tìm theo tên thuốc hoặc hoạt chất...',
                prefixIcon: const Icon(Icons.search, color: Color(0xFF0D47A1)),
                filled: true,
                fillColor: Colors.white,
                contentPadding: const EdgeInsets.symmetric(
                  vertical: 0,
                  horizontal: 16,
                ),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(16),
                  borderSide: BorderSide.none,
                ),
              ),
            ),
          ),
          const SizedBox(height: 12),

          // Category Chips
          SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: Row(
              children:
                  ['Tất cả', 'Kháng sinh', 'Giảm đau', 'Cảm cúm', 'Hô hấp'].map(
                    (cat) {
                      final isSelected =
                          (_selectedCategory == cat ||
                          (cat == 'Tất cả' && _selectedCategory.isEmpty));
                      return Padding(
                        padding: const EdgeInsets.only(right: 8.0),
                        child: FilterChip(
                          label: Text(
                            cat,
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: isSelected
                                  ? Colors.white
                                  : Colors.grey.shade700,
                            ),
                          ),
                          selected: isSelected,
                          onSelected: (val) {
                            setState(() {
                              _selectedCategory = cat == 'Tất cả' ? '' : cat;
                            });
                            _loadMedicines(reset: true);
                          },
                          selectedColor: const Color(0xFF0D47A1),
                          backgroundColor: Colors.white,
                          side: BorderSide(color: Colors.grey.shade200),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                          ),
                        ),
                      );
                    },
                  ).toList(),
            ),
          ),
          const SizedBox(height: 12),

          // Product Grid with Lazy Loading Infinite Scroll
          Expanded(
            child: RefreshIndicator(
              onRefresh: () => _loadMedicines(reset: true),
              child: _medicines.isEmpty && !_isLoading
                  ? const Center(
                      child: Text(
                        'Không tìm thấy sản phẩm nào',
                        style: TextStyle(color: Colors.grey),
                      ),
                    )
                  : GridView.builder(
                      controller: _scrollController,
                      gridDelegate:
                          const SliverGridDelegateWithFixedCrossAxisCount(
                            crossAxisCount: 2,
                            crossAxisSpacing: 12,
                            mainAxisSpacing: 12,
                            childAspectRatio: 0.65,
                          ),
                      itemCount: _medicines.length + (_isLoading ? 2 : 0),
                      itemBuilder: (context, index) {
                        if (index >= _medicines.length) {
                          return Container(
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(20),
                            ),
                            child: const Center(
                              child: CircularProgressIndicator(
                                color: Color(0xFF0D47A1),
                              ),
                            ),
                          );
                        }

                        final med = _medicines[index];
                        final isRx = med['isRx'] as bool;
                        final outOfStock = med['stock'] <= 0;

                        return Card(
                          color: Colors.white,
                          elevation: 3,
                          shadowColor: Colors.black.withValues(alpha: 0.1),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(20),
                            side: BorderSide(
                              color: Colors.grey.shade100,
                              width: 1,
                            ),
                          ),
                          child: InkWell(
                            onTap: () => _showMedicineDetails(med),
                            borderRadius: BorderRadius.circular(20),
                            child: Padding(
                              padding: const EdgeInsets.all(12.0),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  // Product Image with fallback
                                  Container(
                                    height: 80,
                                    width: double.infinity,
                                    decoration: BoxDecoration(
                                      color: Colors.grey.shade50,
                                      borderRadius: BorderRadius.circular(12),
                                    ),
                                    clipBehavior: Clip.antiAlias,
                                    child:
                                        med['image'] != null &&
                                            med['image'].toString().isNotEmpty
                                        ? Image.network(
                                            med['image'],
                                            fit: BoxFit.contain,
                                            errorBuilder:
                                                (context, error, stackTrace) =>
                                                    _buildImagePlaceholder(),
                                          )
                                        : _buildImagePlaceholder(),
                                  ),
                                  const SizedBox(height: 8),

                                  // Classification tag
                                  Container(
                                    padding: const EdgeInsets.symmetric(
                                      horizontal: 8,
                                      vertical: 4,
                                    ),
                                    decoration: BoxDecoration(
                                      color: isRx
                                          ? Colors.red.shade50
                                          : Colors.green.shade50,
                                      borderRadius: BorderRadius.circular(8),
                                    ),
                                    child: Text(
                                      isRx ? 'Rx (Kê đơn)' : 'OTC (Không kê)',
                                      style: TextStyle(
                                        fontSize: 8,
                                        fontWeight: FontWeight.bold,
                                        color: isRx
                                            ? Colors.red.shade700
                                            : Colors.green.shade700,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(height: 8),
                                  Text(
                                    med['name'],
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 13,
                                      color: Color(0xFF2C3E50),
                                      height: 1.2,
                                    ),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    'Hoạt chất: ${med['active']}',
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(
                                      fontSize: 10,
                                      color: Colors.grey.shade500,
                                      fontStyle: FontStyle.italic,
                                    ),
                                  ),
                                  const Spacer(),
                                  Row(
                                    mainAxisAlignment:
                                        MainAxisAlignment.spaceBetween,
                                    children: [
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment:
                                              CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              '${med['price']} ₫',
                                              style: const TextStyle(
                                                fontWeight: FontWeight.w900,
                                                fontSize: 13,
                                                color: Color(0xFF0D47A1),
                                              ),
                                            ),
                                            Text(
                                              'Tồn: ${med['stock']} ${med['unit']}',
                                              style: const TextStyle(
                                                fontSize: 9,
                                                color: Colors.grey,
                                              ),
                                            ),
                                          ],
                                        ),
                                      ),
                                      GestureDetector(
                                        onTap: outOfStock
                                            ? null
                                            : () => _addToCart(med),
                                        child: Container(
                                          padding: const EdgeInsets.all(8),
                                          decoration: BoxDecoration(
                                            color: outOfStock
                                                ? Colors.grey
                                                : const Color(0xFF0D47A1),
                                            shape: BoxShape.circle,
                                            boxShadow: [
                                              BoxShadow(
                                                color:
                                                    (outOfStock
                                                            ? Colors.grey
                                                            : const Color(
                                                                0xFF0D47A1,
                                                              ))
                                                        .withValues(alpha: 0.3),
                                                blurRadius: 4,
                                                offset: const Offset(0, 2),
                                              ),
                                            ],
                                          ),
                                          child: Icon(
                                            outOfStock
                                                ? Icons.remove_shopping_cart
                                                : Icons.add_shopping_cart,
                                            size: 16,
                                            color: Colors.white,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          ),
                        );
                      },
                    ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCartTab() {
    return Padding(
      padding: const EdgeInsets.all(12.0),
      child: _cart.isEmpty
          ? const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.shopping_cart_outlined,
                    size: 64,
                    color: Colors.grey,
                  ),
                  SizedBox(height: 12),
                  Text(
                    'Giỏ hàng trống. Hãy chọn thuốc phù hợp!',
                    style: TextStyle(
                      color: Colors.grey,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ],
              ),
            )
          : Column(
              children: [
                // AI Interaction check banner
                GestureDetector(
                  onTap: _checkAIInteractions,
                  child: Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 12,
                    ),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF673AB7), Color(0xFF512DA8)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.deepPurple.withValues(alpha: 0.3),
                          blurRadius: 8,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Row(
                      children: [
                        const Icon(
                          Icons.psychology,
                          color: Colors.white,
                          size: 24,
                        ),
                        const SizedBox(width: 12),
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Kiểm Tra Dược Lý AI',
                                style: TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 13,
                                ),
                              ),
                              Text(
                                'Phân tích tương tác chéo thời gian thực',
                                style: TextStyle(
                                  color: Colors.white70,
                                  fontSize: 10,
                                ),
                              ),
                            ],
                          ),
                        ),
                        _checkingInteractions
                            ? const SizedBox(
                                width: 16,
                                height: 16,
                                child: CircularProgressIndicator(
                                  strokeWidth: 2,
                                  color: Colors.white,
                                ),
                              )
                            : const Icon(
                                Icons.chevron_right,
                                color: Colors.white,
                              ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 12),

                // Interaction results box
                if (_interactionResult != null) ...[
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: _interactionResult!['risk'] == 'HIGH'
                          ? Colors.red.shade50
                          : Colors.green.shade50,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(
                        color: _interactionResult!['risk'] == 'HIGH'
                            ? Colors.red.shade100
                            : Colors.green.shade100,
                      ),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: [
                            Icon(
                              _interactionResult!['risk'] == 'HIGH'
                                  ? Icons.dangerous
                                  : Icons.check_circle,
                              color: _interactionResult!['risk'] == 'HIGH'
                                  ? Colors.red.shade700
                                  : Colors.green.shade700,
                              size: 20,
                            ),
                            const SizedBox(width: 8),
                            Text(
                              _interactionResult!['title'],
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 12,
                                color: _interactionResult!['risk'] == 'HIGH'
                                    ? Colors.red.shade800
                                    : Colors.green.shade800,
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        Text(
                          _interactionResult!['description'],
                          style: const TextStyle(
                            fontSize: 11,
                            height: 1.4,
                            color: Colors.black87,
                          ),
                        ),
                        if (_interactionResult!['advice'] != null) ...[
                          const SizedBox(height: 6),
                          Text(
                            _interactionResult!['advice'],
                            style: const TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: Colors.black54,
                            ),
                          ),
                        ],
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                ],

                // Cart list items
                Expanded(
                  child: ListView.builder(
                    itemCount: _cart.length,
                    itemBuilder: (context, index) {
                      final item = _cart[index];
                      return Card(
                        color: Colors.white,
                        margin: const EdgeInsets.only(bottom: 10),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                          side: BorderSide(color: Colors.grey.shade100),
                        ),
                        child: Padding(
                          padding: const EdgeInsets.all(12.0),
                          child: Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      item['name'],
                                      style: const TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 14,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      '${item['price']} ₫ / ${item['unit']}',
                                      style: TextStyle(
                                        fontSize: 11,
                                        color: Colors.grey.shade600,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              Row(
                                children: [
                                  IconButton(
                                    onPressed: () =>
                                        _updateCartQty(item['id'], -1),
                                    icon: const Icon(
                                      Icons.remove_circle_outline,
                                      color: Colors.grey,
                                    ),
                                  ),
                                  Text(
                                    item['qty'].toString(),
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 14,
                                    ),
                                  ),
                                  IconButton(
                                    onPressed: () =>
                                        _updateCartQty(item['id'], 1),
                                    icon: const Icon(
                                      Icons.add_circle_outline,
                                      color: Color(0xFF0D47A1),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ),
                const Divider(),

                // Price total calculation box
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.grey.shade100),
                  ),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'Tạm tính:',
                            style: TextStyle(fontSize: 12, color: Colors.grey),
                          ),
                          Text(
                            '$_subtotal ₫',
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'Ưu đãi VIP (5%):',
                            style: TextStyle(fontSize: 12, color: Colors.red),
                          ),
                          Text(
                            '-$_discount ₫',
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              color: Colors.red,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'Thuế VAT (8%):',
                            style: TextStyle(fontSize: 12, color: Colors.grey),
                          ),
                          Text(
                            '+$_vat ₫',
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ],
                      ),
                      const Divider(),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'TỔNG THANH TOÁN:',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.w900,
                            ),
                          ),
                          Text(
                            '$_totalAmount ₫',
                            style: const TextStyle(
                              fontSize: 16,
                              fontWeight: FontWeight.w900,
                              color: Colors.red,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),
                ElevatedButton(
                  onPressed: () => _tabController.animateTo(3),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF0D47A1),
                    foregroundColor: Colors.white,
                    minimumSize: const Size.fromHeight(48),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  child: const Text(
                    'Tiến hành đặt hàng',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                ),
              ],
            ),
    );
  }

  Widget _buildAIConsultTab() {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Header info card
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.deepPurple.shade50,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: Colors.deepPurple.shade100),
              ),
              child: Row(
                children: [
                  const Icon(Icons.auto_awesome, color: Colors.deepPurple, size: 30),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Trợ Lý Tư Vấn Thuốc AI',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                            color: Colors.deepPurple,
                          ),
                        ),
                        const SizedBox(height: 2),
                        Text(
                          kIsWeb
                              ? 'Mô tả triệu chứng bằng văn bản, AI sẽ tự phân tích và đề xuất thuốc.'
                              : 'Nhấn nút mic, nói triệu chứng, AI sẽ phân tích và đề xuất thuốc phù hợp.',
                          style: const TextStyle(
                            fontSize: 10,
                            color: Colors.black54,
                            height: 1.3,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

            // Adaptive UI: text input or mic button
            if (_showSymptomsInput) ...[
              // Text input for symptoms
              Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.deepPurple.shade200),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.deepPurple.withValues(alpha: 0.08),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                ),
                child: TextField(
                  controller: _symptomsController,
                  maxLines: 4,
                  decoration: InputDecoration(
                    hintText: 'Mô tả triệu chứng của bạn...\nVí dụ: Tôi bị sốt, nhức đầu, nghẹt mũi từ tối qua.',
                    hintStyle: TextStyle(color: Colors.grey.shade400, fontSize: 12),
                    prefixIcon: const Padding(
                      padding: EdgeInsets.only(left: 12, top: 12),
                      child: Icon(Icons.edit_note, color: Colors.deepPurple),
                    ),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(16),
                      borderSide: BorderSide.none,
                    ),
                    contentPadding: const EdgeInsets.all(16),
                  ),
                ),
              ),
              const SizedBox(height: 12),
              ElevatedButton.icon(
                onPressed: _aiLoading
                    ? null
                    : () {
                        if (_symptomsController.text.trim().isEmpty) {
                          _showToast('Vui lòng mô tả triệu chứng!', Colors.orange);
                          return;
                        }
                        _callAIConsultAPI(_symptomsController.text.trim());
                      },
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.deepPurple,
                  foregroundColor: Colors.white,
                  minimumSize: const Size.fromHeight(50),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(14),
                  ),
                ),
                icon: _aiLoading
                    ? const SizedBox(
                        width: 16,
                        height: 16,
                        child: CircularProgressIndicator(
                          strokeWidth: 2,
                          color: Colors.white,
                        ),
                      )
                    : const Icon(Icons.auto_awesome),
                label: Text(
                  _aiLoading ? 'AI đang phân tích...' : 'Phân Tích Triệu Chứng với AI',
                  style: const TextStyle(fontWeight: FontWeight.bold),
                ),
              ),
              if (!_aiLoading) ...[
                const SizedBox(height: 12),
                Center(
                  child: TextButton.icon(
                    onPressed: () => setState(() => _showSymptomsInput = false),
                    icon: const Icon(Icons.mic, color: Colors.deepPurple),
                    label: const Text(
                      'Chuyển sang tư vấn bằng giọng nói AI',
                      style: TextStyle(color: Colors.deepPurple, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              ],
            ] else ...[
              // Animated Microphone button
              Center(
                child: AnimatedBuilder(
                  animation: _waveAnimationController,
                  builder: (context, child) {
                    return CustomPaint(
                      painter: _recording
                          ? WaveformCirclePainter(_waveAnimationController.value)
                          : null,
                      child: Container(
                        padding: const EdgeInsets.all(24),
                        child: GestureDetector(
                          onTap: _recording ? _stopVoiceRecording : _startVoiceRecording,
                          child: Container(
                            width: 110,
                            height: 110,
                            decoration: BoxDecoration(
                              color: _recording ? Colors.red.shade600 : Colors.deepPurple,
                              shape: BoxShape.circle,
                              boxShadow: [
                                BoxShadow(
                                  color: (_recording ? Colors.red : Colors.deepPurple)
                                      .withValues(alpha: 0.3),
                                  blurRadius: 12,
                                  offset: const Offset(0, 4),
                                ),
                              ],
                            ),
                            child: Icon(
                              _recording ? Icons.stop : Icons.mic,
                              size: 48,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(height: 16),
              Center(
                child: Text(
                  '${(_timerSeconds ~/ 60).toString().padLeft(2, '0')}:${(_timerSeconds % 60).toString().padLeft(2, '0')}',
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    fontFamily: 'monospace',
                  ),
                ),
              ),
              Center(
                child: Text(
                  _recording
                      ? 'Đang ghi âm cuộc thoại...'
                      : _aiLoading
                          ? 'AI đang phân tích...'
                          : 'Nhấn nút để bắt đầu nói',
                  style: TextStyle(
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    color: Colors.grey.shade500,
                  ),
                ),
              ),
              if (!_recording && !_aiLoading) ...[
                const SizedBox(height: 16),
                Center(
                  child: TextButton.icon(
                    onPressed: () => setState(() => _showSymptomsInput = true),
                    icon: const Icon(Icons.keyboard, color: Colors.deepPurple),
                    label: const Text(
                      'Chuyển sang nhập triệu chứng bằng văn bản',
                      style: TextStyle(color: Colors.deepPurple, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              ],
            ],
            const SizedBox(height: 24),

            // Loading indicator
            if (_aiLoading) ...[
              const Center(
                child: Column(
                  children: [
                    CircularProgressIndicator(color: Colors.deepPurple),
                    SizedBox(height: 12),
                    Text(
                      'Đang tải dữ liệu y khoa RAG và đối chiếu tồn kho...',
                      style: TextStyle(fontSize: 11, color: Colors.grey),
                    ),
                  ],
                ),
              ),
            ],

            // Results
            if (_aiRecommendationResult != null && !_aiLoading) ...[
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: Colors.grey.shade200),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('HỘI THOẠI TRANSCRIPT:',
                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey)),
                    const SizedBox(height: 4),
                    Text('"${_aiRecommendationResult!['transcript']}"',
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, fontStyle: FontStyle.italic)),
                    const Divider(height: 20),
                    const Text('CHẨN ĐOÁN TRIỆU CHỨNG:',
                        style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey)),
                    const SizedBox(height: 4),
                    Text(_aiRecommendationResult!['symptoms'],
                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.black87)),
                    if (_aiRecommendationResult!['warnings'] != null) ...[
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                            color: Colors.amber.shade50, borderRadius: BorderRadius.circular(8)),
                        child: Text(
                          'Cảnh báo AI: ${_aiRecommendationResult!['warnings']}',
                          style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.amber.shade900),
                        ),
                      ),
                    ],
                    const Divider(height: 20),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('TOA THUỐC ĐỀ XUẤT:',
                            style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.grey)),
                        ElevatedButton.icon(
                          onPressed: _addAllAiMedsToCart,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.deepPurple,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                          ),
                          icon: const Icon(Icons.add_shopping_cart, size: 12),
                          label: const Text('Thêm tất cả',
                              style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    ...(_aiRecommendationResult!['drugs'] as List).map((drug) {
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 8.0),
                        child: Container(
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: Colors.grey.shade50,
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: Colors.grey.shade100),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.medication, color: Colors.deepPurple),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(drug['name'],
                                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                    Text(drug['dosage'],
                                        style: TextStyle(fontSize: 10, color: Colors.grey.shade600)),
                                  ],
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                decoration: BoxDecoration(
                                  color: (drug['isAvailable'] == true)
                                      ? Colors.green.shade50
                                      : Colors.red.shade50,
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  (drug['isAvailable'] == true) ? 'Còn kho' : 'Hết kho',
                                  style: TextStyle(
                                    fontSize: 8,
                                    fontWeight: FontWeight.bold,
                                    color: (drug['isAvailable'] == true)
                                        ? Colors.green.shade700
                                        : Colors.red.shade700,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    }),
                  ],
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildCheckoutTab() {
    if (_cart.isEmpty) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.shopping_bag_outlined, size: 64, color: Colors.grey),
            SizedBox(height: 12),
            Text(
              'Đơn hàng trống. Vui lòng thêm thuốc vào giỏ trước!',
              style: TextStyle(color: Colors.grey, fontWeight: FontWeight.bold),
            ),
          ],
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              'Thông tin người nhận hàng',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 14,
                color: Color(0xFF2C3E50),
              ),
            ),
            const SizedBox(height: 12),

            // Inputs
            TextField(
              controller: _fullnameController,
              decoration: InputDecoration(
                labelText: 'Họ và tên *',
                prefixIcon: const Icon(Icons.person),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _phoneController,
              keyboardType: TextInputType.phone,
              decoration: InputDecoration(
                labelText: 'Số điện thoại liên hệ *',
                prefixIcon: const Icon(Icons.phone),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: _addressController,
              maxLines: 2,
              decoration: InputDecoration(
                labelText: 'Địa chỉ giao hàng nhận thuốc *',
                prefixIcon: const Icon(Icons.location_on),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Voucher Input Card
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: _appliedVoucher != null ? Colors.green.shade400 : Colors.grey.shade300,
                  width: _appliedVoucher != null ? 1.5 : 1.0,
                ),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.02),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Row(
                    children: [
                      Icon(Icons.confirmation_number_outlined, color: Color(0xFF0D47A1), size: 20),
                      SizedBox(width: 8),
                      Text(
                        'Mã Giảm Giá / Voucher',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _voucherCodeController,
                          textCapitalization: TextCapitalization.characters,
                          decoration: InputDecoration(
                            hintText: 'Mã (VD: SUMMER20, FIXED30)',
                            isDense: true,
                            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      ElevatedButton(
                        onPressed: _isValidatingVoucher ? null : _applyVoucherCode,
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF0D47A1),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(10),
                          ),
                        ),
                        child: _isValidatingVoucher
                            ? const SizedBox(
                                width: 14,
                                height: 14,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                              )
                            : Text(_appliedVoucher != null ? 'BỎ MÃ' : 'ÁP DỤNG'),
                      ),
                    ],
                  ),
                  if (_voucherErrorMsg != null) ...[
                    const SizedBox(height: 6),
                    Text(
                      _voucherErrorMsg!,
                      style: const TextStyle(color: Colors.red, fontSize: 12, fontWeight: FontWeight.bold),
                    ),
                  ],
                  if (_appliedVoucher != null) ...[
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                      decoration: BoxDecoration(
                        color: Colors.green.shade50,
                        borderRadius: BorderRadius.circular(8),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.check_circle, color: Colors.green, size: 16),
                          const SizedBox(width: 6),
                          Expanded(
                            child: Text(
                              'Đã áp dụng mã ${_appliedVoucher!['code']} (-${_appliedVoucher!['discount']} ₫)',
                              style: const TextStyle(color: Colors.green, fontSize: 12, fontWeight: FontWeight.bold),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 20),

            const Text(
              'Hình thức thanh toán',
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 14,
                color: Color(0xFF2C3E50),
              ),
            ),
            const SizedBox(height: 8),

            // Payment method choices
            Row(
              children: [
                Expanded(
                  child: ChoiceChip(
                    label: const Text(
                      'Tiền mặt',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    selected: _paymentMethod == "CASH",
                    onSelected: (val) =>
                        setState(() => _paymentMethod = "CASH"),
                    selectedColor: const Color(
                      0xFF0D47A1,
                    ).withValues(alpha: 0.15),
                    checkmarkColor: const Color(0xFF0D47A1),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: ChoiceChip(
                    label: const Text(
                      'Thẻ tín dụng',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    selected: _paymentMethod == "CARD",
                    onSelected: (val) =>
                        setState(() => _paymentMethod = "CARD"),
                    selectedColor: const Color(
                      0xFF0D47A1,
                    ).withValues(alpha: 0.15),
                    checkmarkColor: const Color(0xFF0D47A1),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: ChoiceChip(
                    label: const Text(
                      'VNPay / QR',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    selected: _paymentMethod == "QR",
                    onSelected: (val) => setState(() => _paymentMethod = "QR"),
                    selectedColor: const Color(
                      0xFF0D47A1,
                    ).withValues(alpha: 0.15),
                    checkmarkColor: const Color(0xFF0D47A1),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 24),

            // Pricing summary
            Builder(builder: (ctx) {
              final int voucherDiscountAmt = _appliedVoucher != null ? (_appliedVoucher!['discount'] as num).toInt() : 0;
              final int afterDiscount = (_subtotal - _discount - voucherDiscountAmt).clamp(0, 999999999);
              final int vatAmt = (afterDiscount * 0.08).round();
              final int finalTotal = (afterDiscount + vatAmt);

              return Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.grey.shade200),
                ),
                child: Column(
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('Tạm tính:', style: TextStyle(fontSize: 12)),
                        Text(
                          '$_subtotal ₫',
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Ưu đãi thành viên (5%):',
                          style: TextStyle(fontSize: 12, color: Colors.red),
                        ),
                        Text(
                          '-$_discount ₫',
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: Colors.red,
                          ),
                        ),
                      ],
                    ),
                    if (_appliedVoucher != null) ...[
                      const SizedBox(height: 4),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(
                            'Voucher (${_appliedVoucher!['code']}):',
                            style: const TextStyle(fontSize: 12, color: Colors.green, fontWeight: FontWeight.bold),
                          ),
                          Text(
                            '-$voucherDiscountAmt ₫',
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              color: Colors.green,
                            ),
                          ),
                        ],
                      ),
                    ],
                    const SizedBox(height: 4),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('VAT (8%):', style: TextStyle(fontSize: 12)),
                        Text(
                          '+$vatAmt ₫',
                          style: const TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ],
                    ),
                    const Divider(),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'TỔNG THANH TOÁN:',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w900,
                          ),
                        ),
                        Text(
                          '$finalTotal ₫',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w900,
                            color: Colors.red,
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              );
            }),
            const SizedBox(height: 24),

            ElevatedButton(
              onPressed: _processCheckout,
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFF0D47A1),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14),
                ),
              ),
              child: const Text(
                'XÁC NHẬN THANH TOÁN',
                style: TextStyle(
                  fontWeight: FontWeight.bold,
                  letterSpacing: 1.0,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildProfileTab() {
    final name = _userProfile?['fullName'] ?? _userProfile?['name'] ?? 'Khách Hàng Thành Viên';
    final email = _userProfile?['email'] ?? 'user@vinapharmacy.com';
    final phone = _userProfile?['phone'] ?? '0987654321';
    final points = _userProfile?['loyaltyPoints'] ?? 1250;
    final tier = _userProfile?['memberTier'] ?? 'Thành Viên Vàng (Gold)';

    return RefreshIndicator(
      onRefresh: _loadUserProfileAndOrders,
      color: const Color(0xFF0D47A1),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // User Header Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF0D47A1), Color(0xFF1976D2)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(24),
                boxShadow: [
                  BoxShadow(
                    color: Colors.blue.withValues(alpha: 0.3),
                    blurRadius: 15,
                    offset: const Offset(0, 6),
                  ),
                ],
              ),
              child: Column(
                children: [
                  Row(
                    children: [
                      Container(
                        width: 64,
                        height: 64,
                        decoration: BoxDecoration(
                          color: Colors.white,
                          shape: BoxShape.circle,
                          border: Border.all(color: Colors.white, width: 3),
                          boxShadow: const [
                            BoxShadow(color: Colors.black26, blurRadius: 8)
                          ],
                        ),
                        child: const Icon(Icons.person, size: 38, color: Color(0xFF0D47A1)),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              name,
                              style: const TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.bold,
                                color: Colors.white,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              email,
                              style: const TextStyle(fontSize: 12, color: Colors.white70),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'SĐT: $phone',
                              style: const TextStyle(fontSize: 12, color: Colors.white70),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  const Divider(color: Colors.white24),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _buildProfileBadge(Icons.star, '$points Điểm', 'Điểm tích lũy'),
                      Container(width: 1, height: 30, color: Colors.white24),
                      _buildProfileBadge(Icons.workspace_premium, '$tier', 'Hạng tài khoản'),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),

            // Order History Header & Filter Box
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Row(
                  children: [
                    Icon(Icons.history, color: Color(0xFF0D47A1)),
                    SizedBox(width: 8),
                    Text(
                      'Lịch Sử Đơn Hàng',
                      style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0D47A1)),
                    ),
                  ],
                ),
                IconButton(
                  icon: const Icon(Icons.refresh, color: Color(0xFF0D47A1)),
                  onPressed: _loadUserProfileAndOrders,
                  tooltip: 'Tải lại đơn hàng',
                ),
              ],
            ),
            const SizedBox(height: 8),

            // Phone search input filter
            Container(
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(color: Colors.grey.shade200),
                boxShadow: [
                  BoxShadow(
                    color: Colors.black.withValues(alpha: 0.03),
                    blurRadius: 8,
                    offset: const Offset(0, 3),
                  ),
                ],
              ),
              child: TextField(
                controller: _searchPhoneController,
                keyboardType: TextInputType.phone,
                onSubmitted: (_) => _loadUserProfileAndOrders(),
                decoration: InputDecoration(
                  hintText: 'Nhập SĐT để tra cứu lịch sử đơn...',
                  prefixIcon: const Icon(Icons.search, color: Color(0xFF0D47A1)),
                  suffixIcon: IconButton(
                    icon: const Icon(Icons.send, color: Color(0xFF0D47A1)),
                    onPressed: _loadUserProfileAndOrders,
                  ),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  border: InputBorder.none,
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Order List
            if (_isLoadingOrders)
              const Center(
                child: Padding(
                  padding: EdgeInsets.all(32),
                  child: CircularProgressIndicator(color: Color(0xFF0D47A1)),
                ),
              )
            else if (_myOrders.isEmpty)
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(32),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: Colors.grey.shade200),
                ),
                child: const Column(
                  children: [
                    Icon(Icons.receipt_long_outlined, size: 56, color: Colors.grey),
                    SizedBox(height: 12),
                    Text(
                      'Chưa có đơn hàng nào',
                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Colors.grey),
                    ),
                    SizedBox(height: 4),
                    Text(
                      'Tất cả đơn hàng anh yêu đã tạo sẽ xuất hiện tại đây!',
                      style: TextStyle(fontSize: 12, color: Colors.grey),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              )
            else
              ListView.separated(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _myOrders.length,
                separatorBuilder: (ctx, i) => const SizedBox(height: 12),
                itemBuilder: (ctx, i) {
                  final order = _myOrders[i];
                  final code = order['orderCode'] ?? order['id'] ?? 'ORD-$i';
                  final status = order['paymentStatus'] ?? order['status'] ?? 'PENDING';
                  final total = order['totalAmount'] ?? 0;
                  final dateStr = order['createdAt'] != null
                      ? order['createdAt'].toString().split('T').first
                      : 'Vừa xong';
                  final items = (order['items'] as List?) ?? [];
                  final method = order['paymentMethod'] ?? 'CASH';

                  Color statusColor = Colors.orange;
                  String statusText = 'CHỜ THANH TOÁN';
                  if (status == 'PAID') {
                    statusColor = Colors.green;
                    statusText = 'ĐÃ THANH TOÁN';
                  } else if (status == 'CANCELLED') {
                    statusColor = Colors.red;
                    statusText = 'ĐÃ HỦY';
                  }

                  return Card(
                    color: Colors.white,
                    elevation: 2,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(16),
                      side: BorderSide(color: Colors.grey.shade200),
                    ),
                    child: ExpansionTile(
                      leading: CircleAvatar(
                        backgroundColor: statusColor.withValues(alpha: 0.1),
                        child: Icon(
                          status == 'PAID' ? Icons.check_circle : Icons.hourglass_top,
                          color: statusColor,
                          size: 22,
                        ),
                      ),
                      title: Text(
                        'Đơn hàng #$code',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                      subtitle: Text(
                        'Ngày: $dateStr • Thanh toán: $method',
                        style: const TextStyle(fontSize: 11, color: Colors.grey),
                      ),
                      trailing: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: statusColor.withValues(alpha: 0.1),
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              statusText,
                              style: TextStyle(
                                fontSize: 9,
                                fontWeight: FontWeight.bold,
                                color: statusColor,
                              ),
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            '$total ₫',
                            style: const TextStyle(
                              fontWeight: FontWeight.w900,
                              color: Color(0xFF0D47A1),
                              fontSize: 13,
                            ),
                          ),
                        ],
                      ),
                      children: [
                        Padding(
                          padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Divider(),
                              const Text(
                                'Chi tiết danh mục thuốc:',
                                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                              ),
                              const SizedBox(height: 6),
                              ...items.map((item) => Padding(
                                    padding: const EdgeInsets.symmetric(vertical: 2.0),
                                    child: Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Expanded(
                                          child: Text(
                                            '• ${item['name'] ?? 'Thuốc'} x${item['quantity'] ?? 1}',
                                            style: const TextStyle(fontSize: 12),
                                          ),
                                        ),
                                        Text(
                                          '${(item['price'] ?? 0) * (item['quantity'] ?? 1)} ₫',
                                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                                        ),
                                      ],
                                    ),
                                  )),
                              if (order['shippingAddress'] != null) ...[
                                const SizedBox(height: 8),
                                Text(
                                  'Địa chỉ nhận: ${order['shippingAddress']}',
                                  style: TextStyle(fontSize: 11, color: Colors.grey.shade700),
                                ),
                              ],
                            ],
                          ),
                        ),
                      ],
                    ),
                  );
                },
              ),
          ],
        ),
      ),
    );
  }

  Widget _buildProfileBadge(IconData icon, String title, String subtitle) {
    return Column(
      children: [
        Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: Colors.amber, size: 18),
            const SizedBox(width: 4),
            Text(
              title,
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                color: Colors.white,
                fontSize: 13,
              ),
            ),
          ],
        ),
        const SizedBox(height: 2),
        Text(
          subtitle,
          style: const TextStyle(fontSize: 10, color: Colors.white70),
        ),
      ],
    );
  }
}

// Wave ripple painting for voice recording microphone with pulse animation scaling
class WaveformCirclePainter extends CustomPainter {
  final double animationValue;
  WaveformCirclePainter(this.animationValue);

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final paint = Paint()
      ..color = Colors.red.withValues(alpha: (0.2 * (1.0 - animationValue)))
      ..style = PaintingStyle.stroke
      ..strokeWidth = 3;

    final radius1 = 60 + (30 * animationValue);
    final radius2 = 75 + (25 * animationValue);

    canvas.drawCircle(center, radius1, paint);
    canvas.drawCircle(center, radius2, paint);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}
