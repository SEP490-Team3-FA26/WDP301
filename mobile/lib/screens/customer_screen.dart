import 'dart:async';
import 'dart:math' as math;
import 'dart:typed_data';
import 'package:flutter/material.dart';
import 'package:flutter/gestures.dart';
import 'package:record/record.dart';
import '../services/api_service.dart';
import 'login_screen.dart';
import 'profile_screen.dart';
import 'checkout_screen.dart';

class CustomerScreen extends StatefulWidget {
  const CustomerScreen({super.key});

  @override
  State<CustomerScreen> createState() => _CustomerScreenState();
}

class _CustomerScreenState extends State<CustomerScreen>
    with TickerProviderStateMixin {
  final GlobalKey<ScaffoldState> _scaffoldKey = GlobalKey<ScaffoldState>();
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

  // Voice Consultant state & animations
  bool _recording = false;
  int _timerSeconds = 0;
  Timer? _recordingTimer;
  bool _aiLoading = false;
  String _aiStage = 'Sẵn sàng tư vấn';
  Map<String, dynamic>? _aiRecommendationResult;
  late AnimationController _waveAnimationController;
  final AudioRecorder _audioRecorder = AudioRecorder();
  StreamSubscription<Uint8List>? _audioStreamSubscription;
  final BytesBuilder _audioBytesBuilder = BytesBuilder(copy: false);
  final _aiChatController = TextEditingController();
  final List<Map<String, String>> _aiChatMessages = [
    {
      'role': 'assistant',
      'text':
          'Chào bạn, tôi là dược sĩ AI. Bạn có thể mô tả triệu chứng, tuổi, bệnh nền, dị ứng thuốc và thuốc đang dùng để tôi tư vấn an toàn hơn.',
    },
  ];

  // Checkout Form State
  final _fullnameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _addressController = TextEditingController();
  String _paymentMethod = "CASH";

  // Profile & Order History State
  Map<String, dynamic>? _userProfile;
  List<Map<String, dynamic>> _myOrders = [];
  bool _isLoadingOrders = false;
  final _searchPhoneController = TextEditingController();

  // Vouchers state
  List<Map<String, dynamic>> _vouchers = [];
  bool _isLoadingVouchers = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 5, vsync: this);
    _tabController.addListener(() {
      if (mounted) setState(() {});
    });

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

  Future<void> _loadVouchers() async {
    if (!mounted) return;
    setState(() => _isLoadingVouchers = true);
    final list = await ApiService.getVouchers();
    if (mounted) {
      setState(() {
        _vouchers = list;
        _isLoadingVouchers = false;
      });
    }
  }

  Future<void> _loadUserProfileAndOrders() async {
    if (!mounted) return;
    setState(() => _isLoadingOrders = true);
    _loadVouchers();
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

  Future<void> _openCheckoutScreen() async {
    if (_cart.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Giỏ hàng của bạn đang trống!'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    final double rawSubtotal = _cart.fold(
      0.0,
      (sum, item) =>
          sum +
          (((item['price'] ?? 0) as num).toDouble() *
              ((item['qty'] ?? item['quantity'] ?? 1) as num).toInt()),
    );

    final result = await Navigator.push<Map<String, dynamic>>(
      context,
      MaterialPageRoute(
        builder: (_) => CheckoutScreen(
          cartItems: List<Map<String, dynamic>>.from(_cart),
          userProfile: _userProfile,
          subtotal: rawSubtotal,
        ),
      ),
    );

    if (result != null && result['success'] == true) {
      setState(() {
        _cart.clear();
      });
      if (result['result'] != null && mounted) {
        _showOrderSuccessDialog(result['result']);
      }
      _tabController.animateTo(4);
      _loadUserProfileAndOrders();
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    _scrollController.dispose();
    _debounceTimer?.cancel();
    _recordingTimer?.cancel();
    _audioStreamSubscription?.cancel();
    _audioRecorder.dispose();
    _fullnameController.dispose();
    _phoneController.dispose();
    _addressController.dispose();
    _searchPhoneController.dispose();
    _aiChatController.dispose();
    _waveAnimationController.dispose();
    super.dispose();
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
        indication: _selectedCategory,
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

  Uint8List _buildWavBytes(Uint8List pcmBytes) {
    const sampleRate = 16000;
    const numChannels = 1;
    const bitsPerSample = 16;
    final byteRate = sampleRate * numChannels * bitsPerSample ~/ 8;
    final blockAlign = numChannels * bitsPerSample ~/ 8;
    final dataLength = pcmBytes.length;
    final totalLength = 44 + dataLength;
    final bytes = ByteData(totalLength);

    void writeString(int offset, String value) {
      for (var i = 0; i < value.length; i++) {
        bytes.setUint8(offset + i, value.codeUnitAt(i));
      }
    }

    writeString(0, 'RIFF');
    bytes.setUint32(4, 36 + dataLength, Endian.little);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    bytes.setUint32(16, 16, Endian.little);
    bytes.setUint16(20, 1, Endian.little);
    bytes.setUint16(22, numChannels, Endian.little);
    bytes.setUint32(24, sampleRate, Endian.little);
    bytes.setUint32(28, byteRate, Endian.little);
    bytes.setUint16(32, blockAlign, Endian.little);
    bytes.setUint16(34, bitsPerSample, Endian.little);
    writeString(36, 'data');
    bytes.setUint32(40, dataLength, Endian.little);
    final wavBytes = bytes.buffer.asUint8List();
    wavBytes.setRange(44, totalLength, pcmBytes);
    return wavBytes;
  }

  Map<String, dynamic> _mapAiPrescriptionResponse(Map<String, dynamic> result) {
    final prescription = result['prescription'] is Map
        ? Map<String, dynamic>.from(result['prescription'])
        : <String, dynamic>{};
    final recommendedDrugs = prescription['recommended_drugs'] is List
        ? prescription['recommended_drugs'] as List
        : <dynamic>[];
    return {
      'transcript':
          result['transcribed_text'] ??
          result['rag_query'] ??
          'Không nhận diện được nội dung giọng nói.',
      'symptoms': prescription['patient_symptoms'] ?? result['rag_query'] ?? '',
      'warnings': prescription['warnings'],
      'drugs': recommendedDrugs.map((drug) {
        final item = drug is Map ? Map<String, dynamic>.from(drug) : {};
        return {
          'name': item['name'] ?? 'Thuốc chưa rõ tên',
          'dosage':
              item['dosage'] ?? item['usage'] ?? 'Theo hướng dẫn dược sĩ.',
          'qty': 1,
          'isAvailable': true,
        };
      }).toList(),
    };
  }

  String _buildPharmacistReply(Map<String, dynamic> result) {
    final mapped = _mapAiPrescriptionResponse(result);
    final drugs = mapped['drugs'] is List ? mapped['drugs'] as List : [];
    final inventory = result['inventory_status'] is Map
        ? Map<String, dynamic>.from(result['inventory_status'])
        : <String, dynamic>{};
    final available = inventory['available'] is List
        ? inventory['available'] as List
        : <dynamic>[];
    final unavailable = inventory['unavailable'] is List
        ? inventory['unavailable'] as List
        : <dynamic>[];
    final buffer = StringBuffer();
    final symptoms = mapped['symptoms'].toString().trim();
    final warnings = mapped['warnings']?.toString().trim() ?? '';

    if (symptoms.isNotEmpty) {
      buffer.writeln('Tôi ghi nhận: $symptoms');
      buffer.writeln();
    }
    if (drugs.isNotEmpty) {
      buffer.writeln(
        'Thuốc có thể cân nhắc theo dữ liệu y khoa và DB nhà thuốc:',
      );
      for (final drug in drugs) {
        final item = drug is Map ? drug : {};
        buffer.writeln('- ${item['name']}: ${item['dosage']}');
      }
      if (available.isNotEmpty) {
        buffer.writeln();
        buffer.writeln('DB hiện có:');
        for (final drug in available) {
          final item = drug is Map ? drug : {};
          buffer.writeln(
            '- ${item['name']} (${item['stock'] ?? 0} ${item['unit'] ?? 'sản phẩm'})',
          );
        }
      }
      if (unavailable.isNotEmpty) {
        buffer.writeln();
        buffer.writeln('Chưa thấy trong DB/tồn kho: ${unavailable.join(', ')}');
      }
    } else {
      buffer.writeln(
        'Hiện AI chưa tìm được thuốc khớp an toàn trong dữ liệu DB. Bạn nên gặp dược sĩ trực tiếp để được hỏi thêm.',
      );
    }
    if (warnings.isNotEmpty && warnings != 'null') {
      buffer.writeln();
      buffer.writeln('Lưu ý an toàn: $warnings');
    }
    buffer.writeln();
    buffer.write(
      'Nếu sốt cao kéo dài, khó thở, đau ngực, phát ban nặng, phụ nữ mang thai/trẻ nhỏ/người bệnh nền thì nên đi khám hoặc hỏi dược sĩ trước khi dùng.',
    );
    return buffer.toString();
  }

  Future<void> _sendAiChatMessage() async {
    final message = _aiChatController.text.trim();
    if (message.isEmpty || _aiLoading) return;

    setState(() {
      _aiChatMessages.add({'role': 'user', 'text': message});
      _aiChatController.clear();
      _aiLoading = true;
      _aiStage = 'Đang tra tài liệu y khoa và đối chiếu DB thuốc';
    });
    _waveAnimationController.repeat();

    final result = await ApiService.getTextPrescription(message);
    if (!mounted) return;

    setState(() {
      _aiLoading = false;
      _aiStage = 'Sẵn sàng tư vấn';
      if (result == null) {
        _aiChatMessages.add({
          'role': 'assistant',
          'text':
              'Tôi chưa gọi được hệ thống tư vấn AI. Bạn kiểm tra ai-service, RAG/DB và cấu hình API key giúp tôi nha.',
        });
        return;
      }
      _aiRecommendationResult = _mapAiPrescriptionResponse(result);
      _aiChatMessages.add({
        'role': 'assistant',
        'text': _buildPharmacistReply(result),
      });
    });
    _waveAnimationController.stop();
  }

  // AI voice consultant recorder
  Future<void> _startVoiceRecording() async {
    final hasPermission = await _audioRecorder.hasPermission();
    if (!hasPermission) {
      _showToast('Vui lòng cấp quyền micro để dùng tư vấn AI.', Colors.orange);
      return;
    }

    _audioBytesBuilder.clear();
    final stream = await _audioRecorder.startStream(
      const RecordConfig(
        encoder: AudioEncoder.pcm16bits,
        sampleRate: 16000,
        numChannels: 1,
        echoCancel: true,
        noiseSuppress: true,
      ),
    );
    _audioStreamSubscription = stream.listen(_audioBytesBuilder.add);

    setState(() {
      _recording = true;
      _timerSeconds = 0;
      _aiStage = 'Đang ghi âm triệu chứng';
      _aiRecommendationResult = null;
    });
    _waveAnimationController.repeat();

    _recordingTimer = Timer.periodic(const Duration(seconds: 1), (timer) {
      setState(() {
        _timerSeconds++;
      });
    });
  }

  Future<void> _stopVoiceRecording() async {
    _recordingTimer?.cancel();
    await _audioRecorder.stop();
    await _audioStreamSubscription?.cancel();
    _audioStreamSubscription = null;
    setState(() {
      _recording = false;
      _aiLoading = true;
      _aiStage = 'Đang chuyển giọng nói thành văn bản';
    });
    _waveAnimationController.repeat();

    final pcmBytes = _audioBytesBuilder.toBytes();
    if (pcmBytes.isEmpty) {
      if (!mounted) return;
      setState(() {
        _aiLoading = false;
        _aiStage = 'Sẵn sàng tư vấn';
      });
      _waveAnimationController.stop();
      _showToast('Không thu được âm thanh. Bạn thử nói lại nha.', Colors.red);
      return;
    }

    setState(() => _aiStage = 'Đang tra RAG y khoa và kiểm tra tồn kho DB');
    final result = await ApiService.getVoicePrescriptionBytes(
      _buildWavBytes(pcmBytes),
    );
    if (!mounted) return;

    setState(() {
      _aiLoading = false;
      _aiStage = result == null
          ? 'Chưa nhận được phản hồi AI'
          : 'Đã có gợi ý thuốc';
      _aiRecommendationResult = result == null
          ? null
          : _mapAiPrescriptionResponse(result);
      if (result != null) {
        final mapped = _mapAiPrescriptionResponse(result);
        _aiChatMessages.add({
          'role': 'user',
          'text': mapped['transcript']?.toString() ?? 'Tư vấn bằng giọng nói',
        });
        _aiChatMessages.add({
          'role': 'assistant',
          'text': _buildPharmacistReply(result),
        });
      }
    });
    _waveAnimationController.stop();
    if (result == null) {
      _showToast(
        'AI chưa trả được thuốc gợi ý. Kiểm tra ai-service/GROQ_API_KEY nha.',
        Colors.red,
      );
    }
  }

  void _addAllAiMedsToCart() {
    if (_aiRecommendationResult == null) return;
    int count = 0;
    for (var drug in _aiRecommendationResult!['drugs']) {
      final match = _medicines.firstWhere(
        (m) => m['name'].toLowerCase() == drug['name'].toLowerCase(),
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

  void _showOrderSuccessDialog(Map<String, dynamic> result) {
    final orderId =
        result['orderId'] ??
        result['id'] ??
        result['orderCode'] ??
        'ORD-${DateTime.now().millisecondsSinceEpoch}';
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
        title: const Row(
          children: [
            Icon(Icons.check_circle, color: Colors.green),
            SizedBox(width: 8),
            Expanded(
              child: Text(
                'Đặt hàng thành công!',
                style: TextStyle(fontWeight: FontWeight.bold),
              ),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Hóa đơn đặt hàng đã được ghi nhận trên hệ thống:',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
            ),
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
                  Text(
                    'Mã đơn: $orderId',
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: Colors.indigo,
                    ),
                  ),
                  Text(
                    'Khách nhận: ${_fullnameController.text}',
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    'SĐT: ${_phoneController.text}',
                    style: const TextStyle(fontSize: 11),
                  ),
                  Text(
                    'Địa chỉ: ${_addressController.text}',
                    style: const TextStyle(fontSize: 11),
                  ),
                  Text(
                    'Thanh toán: ${_paymentMethod == "CASH"
                        ? "Tiền mặt (COD)"
                        : _paymentMethod == "CARD"
                        ? "Thẻ tín dụng"
                        : "VNPay/QR"}',
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: Colors.blue,
                    ),
                  ),
                  const Divider(),
                  Text(
                    'Tổng cộng: ${_totalAmount.toString()} ₫',
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w900,
                      color: Colors.red,
                    ),
                  ),
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
              _tabController.animateTo(0); // Return to Shop
            },
            child: const Text(
              'Đóng & Về Cửa Hàng',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildDrawer() {
    final profile = _userProfile;
    final displayName =
        (profile?['fullName'] ?? profile?['name'] ?? 'Khách hàng')
            .toString()
            .trim();
    final displayEmail = (profile?['email'] ?? '').toString().trim();
    final avatarLetter = displayName.isNotEmpty
        ? displayName.characters.first.toUpperCase()
        : 'K';

    return Drawer(
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          UserAccountsDrawerHeader(
            decoration: const BoxDecoration(color: Color(0xFF1976D2)),
            accountName: Text(
              displayName.isNotEmpty ? displayName : 'Khách hàng',
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
            accountEmail: Text(
              displayEmail.isNotEmpty ? displayEmail : 'Đang tải thông tin',
            ),
            currentAccountPicture: CircleAvatar(
              backgroundColor: Colors.white,
              child: Text(
                avatarLetter,
                style: const TextStyle(fontSize: 24, color: Color(0xFF1976D2)),
              ),
            ),
          ),
          ListTile(
            leading: const Icon(Icons.person),
            title: const Text('Hồ sơ của tôi'),
            onTap: () {
              Navigator.pop(context);
              Navigator.push(
                context,
                MaterialPageRoute(
                  builder: (_) => ProfileScreen(
                    userProfile: _userProfile,
                    onProfileUpdated: _loadUserProfileAndOrders,
                  ),
                ),
              );
            },
          ),
          ListTile(
            leading: const Icon(Icons.history),
            title: const Text('Lịch sử mua hàng'),
            onTap: () {
              Navigator.pop(context);
              _tabController.animateTo(4);
            },
          ),
          const Divider(),
          ListTile(
            leading: const Icon(Icons.logout, color: Colors.red),
            title: const Text('Đăng xuất', style: TextStyle(color: Colors.red)),
            onTap: () {
              Navigator.pop(context);
              showDialog(
                context: context,
                builder: (ctx) => AlertDialog(
                  title: const Text('Đăng xuất'),
                  content: const Text(
                    'Bạn có chắc chắn muốn đăng xuất khỏi ứng dụng?',
                  ),
                  actions: [
                    TextButton(
                      onPressed: () => Navigator.pop(ctx),
                      child: const Text('Hủy'),
                    ),
                    TextButton(
                      onPressed: () {
                        Navigator.pop(ctx);
                        Navigator.pushReplacement(
                          context,
                          MaterialPageRoute(
                            builder: (_) => const LoginScreen(),
                          ),
                        );
                      },
                      child: const Text(
                        'Đăng xuất',
                        style: TextStyle(color: Colors.red),
                      ),
                    ),
                  ],
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      key: _scaffoldKey,
      drawer: _buildDrawer(),
      backgroundColor: const Color(0xFFF2F4F7),
      body: TabBarView(
        controller: _tabController,
        physics: const NeverScrollableScrollPhysics(),
        children: [
          _buildNewShopTab(),
          _buildCartTabWithHeader(),
          _buildAIConsultTabWithHeader(),
          _buildRewardsTabWithHeader(),
          _buildProfileTabWithHeader(),
        ],
      ),
      bottomNavigationBar: BottomNavigationBar(
        currentIndex: _tabController.index,
        onTap: (index) {
          _tabController.animateTo(index);
          if (index == 3 || index == 4) {
            _loadUserProfileAndOrders();
          }
        },
        type: BottomNavigationBarType.fixed,
        selectedItemColor: const Color(0xFF0D47A1),
        unselectedItemColor: Colors.grey,
        selectedLabelStyle: const TextStyle(
          fontWeight: FontWeight.bold,
          fontSize: 11,
        ),
        unselectedLabelStyle: const TextStyle(
          fontWeight: FontWeight.normal,
          fontSize: 11,
        ),
        items: const [
          BottomNavigationBarItem(icon: Icon(Icons.home), label: 'Trang chủ'),
          BottomNavigationBarItem(
            icon: Icon(Icons.shopping_cart),
            label: 'Giỏ hàng',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.psychology),
            label: 'Tư vấn AI',
          ),
          BottomNavigationBarItem(
            icon: Icon(Icons.card_giftcard),
            label: 'Điểm thưởng',
          ),
          BottomNavigationBarItem(icon: Icon(Icons.history), label: 'Đơn hàng'),
        ],
      ),
    );
  }

  Widget _buildSimpleHeader(String title, {VoidCallback? onBack}) {
    return Container(
      padding: const EdgeInsets.only(top: 50, left: 16, right: 16, bottom: 16),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF2962FF), Color(0xFF1E88E5), Color(0xFF42A5F5)],
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
        ),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF2962FF).withValues(alpha: 0.4),
            blurRadius: 12,
            offset: const Offset(4, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          SizedBox(
            width: 44,
            child: onBack == null
                ? null
                : IconButton(
                    tooltip: 'Quay lại',
                    onPressed: onBack,
                    icon: const Icon(
                      Icons.arrow_back_ios_new,
                      color: Colors.white,
                    ),
                  ),
          ),
          Expanded(
            child: Text(
              title,
              textAlign: TextAlign.center,
              style: const TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 18,
                color: Colors.white,
              ),
            ),
          ),
          const SizedBox(width: 44),
        ],
      ),
    );
  }

  Widget _buildCartTabWithHeader() {
    return Column(
      children: [
        _buildSimpleHeader('Giỏ Hàng Của Bạn'),
        Expanded(child: _buildCartTab()),
      ],
    );
  }

  Widget _buildAIConsultTabWithHeader() {
    return Column(
      children: [
        _buildSimpleHeader('Tư Vấn Y Khoa AI'),
        Expanded(child: _buildAIConsultTab()),
      ],
    );
  }

  Widget _buildRewardsTabWithHeader() {
    return Column(
      children: [
        _buildSimpleHeader('Điểm Thưởng & Ưu Đãi VIP'),
        Expanded(child: _buildRewardsTab()),
      ],
    );
  }

  Widget _buildRewardsTab() {
    final points = _userProfile?['points'] ?? _userProfile?['loyaltyPoints'] ?? 0;
    final name = _userProfile?['fullName'] ?? 'Khách Hàng';
    final memberTier = points >= 1000 ? 'Thành Viên Vàng (Gold)' : points >= 500 ? 'Thành Viên Bạc (Silver)' : 'Thành Viên Đồng (Bronze)';

    return RefreshIndicator(
      onRefresh: _loadUserProfileAndOrders,
      color: const Color(0xFF0D47A1),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Points Header Card
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFFFF8F00), Color(0xFFFFB300)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(20),
                boxShadow: [
                  BoxShadow(
                    color: Colors.amber.withValues(alpha: 0.3),
                    blurRadius: 10,
                    offset: const Offset(0, 4),
                  ),
                ],
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            name,
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                            decoration: BoxDecoration(
                              color: Colors.white.withValues(alpha: 0.25),
                              borderRadius: BorderRadius.circular(12),
                            ),
                            child: Text(
                              memberTier,
                              style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                            ),
                          ),
                        ],
                      ),
                      const Icon(Icons.stars, color: Colors.white, size: 44),
                    ],
                  ),
                  const Divider(color: Colors.white38, height: 24),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Điểm thưởng khả dụng:',
                        style: TextStyle(color: Colors.white70, fontSize: 13),
                      ),
                      Text(
                        '$points điểm',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 22,
                          fontWeight: FontWeight.w900,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            const SizedBox(height: 20),

            const Text(
              'Đổi Voucher Giảm Giá',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),

            if (_isLoadingVouchers)
              const Padding(
                padding: EdgeInsets.all(16),
                child: Center(
                  child: CircularProgressIndicator(color: Color(0xFF0D47A1)),
                ),
              )
            else if (_vouchers.isEmpty)
              Card(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                child: const Padding(
                  padding: EdgeInsets.all(16.0),
                  child: Row(
                    children: [
                      Icon(Icons.confirmation_number_outlined, color: Colors.grey),
                      SizedBox(width: 12),
                      Expanded(
                        child: Text(
                          'Hiện chưa có mã giảm giá nào khả dụng trên hệ thống.',
                          style: TextStyle(color: Colors.grey, fontSize: 13),
                        ),
                      ),
                    ],
                  ),
                ),
              )
            else
              ..._vouchers.map((v) {
                final code = (v['code'] ?? '').toString();
                final discountType = (v['discountType'] ?? '').toString();
                final val = v['discountValue'] is num ? (v['discountValue'] as num).toInt() : 0;
                final minOrder = v['minOrderValue'] is num ? (v['minOrderValue'] as num).toInt() : 0;

                final discountText = discountType == 'PERCENTAGE' ? '-$val%' : '-${val.toString()} đ';
                final minOrderText = minOrder > 0 ? 'Áp dụng cho đơn từ ${minOrder.toString()} đ' : 'Áp dụng cho mọi đơn hàng';

                return Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  child: ListTile(
                    leading: const CircleAvatar(
                      backgroundColor: Color(0xFFFFF8E1),
                      child: Icon(Icons.confirmation_number, color: Colors.amber),
                    ),
                    title: Text('Mã $code ($discountText)', style: const TextStyle(fontWeight: FontWeight.bold)),
                    subtitle: Text(minOrderText),
                    trailing: ElevatedButton(
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Đã lưu mã $code! Hãy nhập mã này khi thanh toán.')),
                        );
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFFFF8F00),
                        foregroundColor: Colors.white,
                      ),
                      child: const Text('Nhận mã'),
                    ),
                  ),
                );
              }),

            const SizedBox(height: 20),
            const Text(
              'Đặc Quyền Thành Viên VIP',
              style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
            ),
            const SizedBox(height: 12),
            Card(
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              child: const Padding(
                padding: EdgeInsets.all(16.0),
                child: Column(
                  children: [
                    Row(
                      children: [
                        Icon(Icons.check_circle_outline, color: Colors.amber),
                        SizedBox(width: 12),
                        Expanded(child: Text('Tích 1% điểm thưởng trên mỗi hóa đơn mua lẻ và mua online.')),
                      ],
                    ),
                    Divider(height: 20),
                    Row(
                      children: [
                        Icon(Icons.check_circle_outline, color: Colors.amber),
                        SizedBox(width: 12),
                        Expanded(child: Text('Tư vấn dược sĩ AI ưu tiên miễn phí 24/7.')),
                      ],
                    ),
                    Divider(height: 20),
                    Row(
                      children: [
                        Icon(Icons.check_circle_outline, color: Colors.amber),
                        SizedBox(width: 12),
                        Expanded(child: Text('Quà tặng sinh nhật và mã giảm giá theo từng hạng thẻ.')),
                      ],
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

  Widget _buildProfileTabWithHeader() {
    return Column(
      children: [
        _buildSimpleHeader('Lịch Sử Đơn Hàng & Tài Khoản'),
        Expanded(child: _buildProfileTab()),
      ],
    );
  }

  Widget _buildHomeHeader() {
    return Container(
      padding: const EdgeInsets.only(top: 50, left: 16, right: 16, bottom: 16),
      decoration: const BoxDecoration(color: Color(0xFF2962FF)),
      child: Column(
        children: [
          Stack(
            alignment: Alignment.center,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  GestureDetector(
                    onTap: () {
                      _scaffoldKey.currentState?.openDrawer();
                    },
                    child: const Icon(
                      Icons.menu,
                      color: Colors.white,
                      size: 28,
                    ),
                  ),
                  const Icon(
                    Icons.notifications_none,
                    color: Colors.white,
                    size: 28,
                  ),
                ],
              ),
              Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(4),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(width: 8, height: 16, color: Colors.orange),
                        Container(width: 8, height: 16, color: Colors.blue),
                        Container(width: 8, height: 16, color: Colors.green),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  const Text(
                    'ABC\nPHARMACY',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.w900,
                      fontSize: 14,
                      height: 1.1,
                    ),
                    textAlign: TextAlign.center,
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 16),
          Container(
            height: 48,
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(24),
            ),
            child: TextField(
              onChanged: _onSearchChanged,
              decoration: InputDecoration(
                hintText: 'Mua trước trả sau 0% lãi suất',
                hintStyle: TextStyle(color: Colors.grey.shade600, fontSize: 14),
                contentPadding: const EdgeInsets.only(
                  left: 16,
                  top: 14,
                  bottom: 14,
                ),
                suffixIcon: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.mic_none, color: Colors.blue.shade700),
                    const SizedBox(width: 12),
                    Icon(Icons.qr_code_scanner, color: Colors.blue.shade700),
                    const SizedBox(width: 12),
                  ],
                ),
                border: InputBorder.none,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildGreetingSection() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.only(
          topLeft: Radius.circular(24),
          topRight: Radius.circular(24),
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Row(
              children: [
                CircleAvatar(
                  radius: 20,
                  backgroundColor: Colors.transparent,
                  child: const Icon(
                    Icons.account_circle,
                    color: Colors.grey,
                    size: 40,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Xin chào, ${_userProfile?['fullName'] ?? 'Khách hàng'}',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                        overflow: TextOverflow.ellipsis,
                        maxLines: 1,
                      ),
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.all(2),
                            decoration: const BoxDecoration(
                              color: Colors.amber,
                              shape: BoxShape.circle,
                            ),
                            child: const Text(
                              'F',
                              style: TextStyle(
                                color: Colors.white,
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                          ),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              '${_userProfile?['points'] ?? _userProfile?['loyaltyPoints'] ?? 0} điểm thưởng',
                              style: const TextStyle(fontSize: 12, color: Colors.black87),
                              overflow: TextOverflow.ellipsis,
                              maxLines: 1,
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 8),
          OutlinedButton.icon(
            onPressed: () {
              _tabController.animateTo(4);
              _loadUserProfileAndOrders();
            },
            icon: const Icon(Icons.receipt_long, size: 16),
            label: const Text('Đơn của tôi'),
            style: OutlinedButton.styleFrom(
              foregroundColor: Colors.black87,
              side: BorderSide(color: Colors.grey.shade300),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
              ),
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 0),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAIBanner() {
    return GestureDetector(
      onTap: () => _tabController.animateTo(2),
      child: Container(
        margin: const EdgeInsets.all(16),
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFF4FC3F7), Color(0xFF1E88E5), Color(0xFF1565C0)],
            begin: Alignment.centerLeft,
            end: Alignment.centerRight,
          ),
          borderRadius: BorderRadius.circular(16),
          boxShadow: [
            BoxShadow(
              color: const Color(0xFF1E88E5).withValues(alpha: 0.5),
              blurRadius: 12,
              spreadRadius: 1,
              offset: const Offset(4, 4),
            ),
          ],
        ),
        child: Row(
          children: [
            const Icon(
              Icons.chat_bubble_outline,
              color: Colors.white,
              size: 40,
            ),
            const SizedBox(width: 16),
            const Expanded(
              child: Text(
                'Chat với Dược sĩ AI',
                style: TextStyle(
                  color: Colors.white,
                  fontWeight: FontWeight.bold,
                  fontSize: 18,
                ),
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
              ),
              child: const Text(
                'Chat ngay',
                style: TextStyle(
                  color: Color(0xFF1976D2),
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildShortcutsRow() {
    final items = [
      {
        'icon': Icons.medication,
        'label': 'Cần mua\nthuốc',
        'color': Colors.blue,
      },
      {
        'icon': Icons.location_on,
        'label': 'Tìm nhà\nthuốc',
        'color': Colors.red,
      },
      {
        'icon': Icons.family_restroom,
        'label': 'Tài khoản\ngia đình',
        'color': Colors.orange,
      },
      {'icon': Icons.pregnant_woman, 'label': 'Mẹ và bé', 'color': Colors.pink},
      {
        'icon': Icons.vaccines,
        'label': 'Tiêm Vắc\nxin',
        'color': Colors.blueGrey,
      },
      {
        'icon': Icons.description,
        'label': 'Đơn của\ntôi',
        'color': Colors.green,
      },
    ];

    return ScrollConfiguration(
      behavior: ScrollConfiguration.of(context).copyWith(
        dragDevices: {PointerDeviceKind.touch, PointerDeviceKind.mouse},
      ),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 16),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: items.map((item) {
            return Padding(
              padding: const EdgeInsets.only(right: 16.0),
              child: Column(
                children: [
                  Container(
                    width: 50,
                    height: 50,
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.05),
                          blurRadius: 4,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Icon(
                      item['icon'] as IconData,
                      color: item['color'] as Color,
                      size: 28,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    item['label'] as String,
                    textAlign: TextAlign.center,
                    style: const TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.w600,
                      height: 1.2,
                    ),
                  ),
                ],
              ),
            );
          }).toList(),
        ),
      ),
    );
  }

  Widget _buildPromoCarousel() {
    return Container(
      height: 140,
      margin: const EdgeInsets.symmetric(vertical: 16, horizontal: 16),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(16),
        gradient: const LinearGradient(
          colors: [Color(0xFF81C784), Color(0xFF4CAF50), Color(0xFF388E3C)],
          begin: Alignment.centerLeft,
          end: Alignment.centerRight,
        ),
        boxShadow: [
          BoxShadow(
            color: const Color(0xFF4CAF50).withValues(alpha: 0.5),
            blurRadius: 12,
            spreadRadius: 1,
            offset: const Offset(4, 4),
          ),
        ],
      ),
      child: Stack(
        children: [
          Positioned(
            left: 16,
            top: 16,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  '3 QUÀ TẶNG\nMIỄN PHÍ*',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 24,
                    fontWeight: FontWeight.w900,
                    height: 1.1,
                  ),
                ),
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 6,
                  ),
                  decoration: BoxDecoration(
                    color: Colors.red,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: const Text(
                    'Đăng ký ngay',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                ),
              ],
            ),
          ),
          Positioned(
            right: -20,
            bottom: -20,
            child: Icon(
              Icons.card_giftcard,
              size: 120,
              color: Colors.white.withValues(alpha: 0.3),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildNewShopTab() {
    return Column(
      children: [
        _buildHomeHeader(),
        Expanded(
          child: RefreshIndicator(
            onRefresh: () => _loadMedicines(reset: true),
            child: ListView(
              controller: _scrollController,
              padding: const EdgeInsets.all(0),
              children: [
                _buildGreetingSection(),
                _buildAIBanner(),
                _buildShortcutsRow(),
                _buildPromoCarousel(),
                Padding(
                  padding: const EdgeInsets.all(12.0),
                  child: _buildCategoryChips(),
                ),
                _buildNewProductGrid(),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildCategoryChips() {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children:
            [
              {'value': '', 'label': 'Tất cả'},
              {'value': 'Giảm đau', 'label': 'Giảm đau'},
              {'value': 'Kháng sinh', 'label': 'Kháng sinh'},
              {'value': 'Dị ứng', 'label': 'Chống dị ứng'},
              {'value': 'Ho', 'label': 'Ho / Sổ mũi'},
              {'value': 'Dạ dày', 'label': 'Dạ dày'},
            ].map((item) {
              final cat = item['value']!;
              final label = item['label']!;
              final isSelected = _selectedCategory == cat;
              return Padding(
                padding: const EdgeInsets.only(right: 8.0),
                child: FilterChip(
                  label: Text(
                    label,
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w600,
                      color: isSelected ? Colors.white : Colors.grey.shade700,
                    ),
                  ),
                  selected: isSelected,
                  showCheckmark: isSelected,
                  checkmarkColor: Colors.white,
                  padding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 10,
                  ),
                  onSelected: (val) {
                    setState(() {
                      _selectedCategory = cat;
                    });
                    _loadMedicines(reset: true);
                  },
                  selectedColor: const Color(0xFF1554A6),
                  backgroundColor: Colors.white,
                  side: BorderSide(
                    color: isSelected
                        ? Colors.transparent
                        : Colors.grey.shade300,
                  ),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(24),
                  ),
                ),
              );
            }).toList(),
      ),
    );
  }

  Widget _buildNewProductGrid() {
    if (_medicines.isEmpty && !_isLoading) {
      return const Padding(
        padding: EdgeInsets.all(32.0),
        child: Center(
          child: Text(
            'Không tìm thấy sản phẩm nào',
            style: TextStyle(color: Colors.grey),
          ),
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 8.0),
      child: GridView.builder(
        shrinkWrap: true,
        physics: const NeverScrollableScrollPhysics(),
        gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
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
                child: CircularProgressIndicator(color: Color(0xFF0D47A1)),
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
              side: BorderSide(color: Colors.grey.shade100, width: 1),
            ),
            child: InkWell(
              onTap: () => _showMedicineDetails(med),
              borderRadius: BorderRadius.circular(20),
              child: Padding(
                padding: const EdgeInsets.all(12.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
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
                              errorBuilder: (context, error, stackTrace) =>
                                  _buildImagePlaceholder(),
                            )
                          : _buildImagePlaceholder(),
                    ),
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: isRx ? Colors.red.shade50 : Colors.green.shade50,
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
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
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
                          onTap: outOfStock ? null : () => _addToCart(med),
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
                                              : const Color(0xFF0D47A1))
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
    );
  }

  // TAB UIs BUILDERS
  // ignore: unused_element
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
                  [
                    {'value': '', 'label': 'Tất cả'},
                    {'value': 'Giảm đau', 'label': 'Giảm đau'},
                    {'value': 'Kháng sinh', 'label': 'Kháng sinh'},
                    {'value': 'Dị ứng', 'label': 'Chống dị ứng'},
                    {'value': 'Ho', 'label': 'Ho / Sổ mũi'},
                    {'value': 'Dạ dày', 'label': 'Dạ dày'},
                  ].map((item) {
                    final cat = item['value']!;
                    final label = item['label']!;
                    final isSelected = _selectedCategory == cat;
                    return Padding(
                      padding: const EdgeInsets.only(right: 8.0),
                      child: FilterChip(
                        label: Text(
                          label,
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: isSelected
                                ? Colors.white
                                : Colors.grey.shade700,
                          ),
                        ),
                        selected: isSelected,
                        showCheckmark: isSelected,
                        checkmarkColor: Colors.white,
                        padding: const EdgeInsets.symmetric(
                          horizontal: 16,
                          vertical: 10,
                        ),
                        onSelected: (val) {
                          setState(() {
                            _selectedCategory = cat;
                          });
                          _loadMedicines(reset: true);
                        },
                        selectedColor: const Color(0xFF1554A6),
                        backgroundColor: Colors.white,
                        side: BorderSide(
                          color: isSelected
                              ? Colors.transparent
                              : Colors.grey.shade300,
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(24),
                        ),
                      ),
                    );
                  }).toList(),
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
                  onPressed: _openCheckoutScreen,
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

  Widget _buildVoiceConsultCard() {
    final statusColor = _recording
        ? Colors.red.shade600
        : _aiLoading
        ? Colors.indigo.shade600
        : Colors.deepPurple;
    final timerText =
        '${(math.max(0, _timerSeconds ~/ 60)).toString().padLeft(2, '0')}:${(math.max(0, _timerSeconds % 60)).toString().padLeft(2, '0')}';
    final quickPrompts = [
      'Tôi sốt, đau đầu, nghẹt mũi từ hôm qua',
      'Tôi ho khan, đau họng 2 ngày',
      'Tôi đau bụng, buồn nôn sau khi ăn',
    ];

    return LayoutBuilder(
      builder: (context, constraints) {
        final compact = constraints.maxWidth < 360;
        final micSize = compact ? 94.0 : 112.0;

        return AnimatedContainer(
          duration: const Duration(milliseconds: 250),
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: statusColor.withValues(alpha: 0.18)),
            boxShadow: [
              BoxShadow(
                color: statusColor.withValues(alpha: 0.10),
                blurRadius: 18,
                offset: const Offset(0, 8),
              ),
            ],
          ),
          child: Column(
            children: [
              Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          _recording
                              ? 'Đang lắng nghe triệu chứng'
                              : _aiLoading
                              ? 'Đang xử lý tư vấn'
                              : 'Tư vấn bằng giọng nói',
                          style: const TextStyle(
                            fontSize: 15,
                            fontWeight: FontWeight.w900,
                            color: Color(0xFF263238),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          _aiStage,
                          style: TextStyle(
                            fontSize: 11,
                            height: 1.3,
                            color: Colors.grey.shade600,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 10,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: statusColor.withValues(alpha: 0.10),
                      borderRadius: BorderRadius.circular(999),
                    ),
                    child: Text(
                      timerText,
                      style: TextStyle(
                        fontSize: 13,
                        fontWeight: FontWeight.w900,
                        fontFamily: 'monospace',
                        color: statusColor,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              AnimatedBuilder(
                animation: _waveAnimationController,
                builder: (context, child) {
                  final pulse = _recording || _aiLoading
                      ? 1 + (_waveAnimationController.value * 0.08)
                      : 1.0;
                  return Transform.scale(
                    scale: pulse,
                    child: CustomPaint(
                      painter: _recording
                          ? WaveformCirclePainter(
                              _waveAnimationController.value,
                            )
                          : _aiLoading
                          ? ProcessingCirclePainter(
                              _waveAnimationController.value,
                            )
                          : null,
                      child: Padding(
                        padding: const EdgeInsets.all(22),
                        child: GestureDetector(
                          onTap: _aiLoading
                              ? null
                              : _recording
                              ? _stopVoiceRecording
                              : _startVoiceRecording,
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 220),
                            width: micSize,
                            height: micSize,
                            decoration: BoxDecoration(
                              color: statusColor,
                              shape: BoxShape.circle,
                              boxShadow: [
                                BoxShadow(
                                  color: statusColor.withValues(alpha: 0.35),
                                  blurRadius: 18,
                                  offset: const Offset(0, 8),
                                ),
                              ],
                            ),
                            child: Icon(
                              _recording
                                  ? Icons.stop
                                  : _aiLoading
                                  ? Icons.psychology_alt
                                  : Icons.mic,
                              size: compact ? 40 : 48,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ),
                    ),
                  );
                },
              ),
              if (_recording || _aiLoading) ...[
                const SizedBox(height: 8),
                ClipRRect(
                  borderRadius: BorderRadius.circular(999),
                  child: LinearProgressIndicator(
                    minHeight: 6,
                    value: _recording ? null : 0.72,
                    backgroundColor: Colors.grey.shade100,
                    color: statusColor,
                  ),
                ),
              ],
              const SizedBox(height: 14),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: quickPrompts.map((prompt) {
                  return ActionChip(
                    visualDensity: VisualDensity.compact,
                    label: Text(prompt, style: const TextStyle(fontSize: 10)),
                    onPressed: _aiLoading || _recording
                        ? null
                        : () {
                            _aiChatController.text = prompt;
                            _sendAiChatMessage();
                          },
                  );
                }).toList(),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildAIConsultTab() {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Informational header
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.deepPurple.shade50,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: Colors.deepPurple.shade100),
              ),
              child: const Row(
                children: [
                  Icon(Icons.auto_awesome, color: Colors.deepPurple, size: 30),
                  SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          'Trợ Lý Chẩn Đoán Triệu Chúng AI',
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 13,
                            color: Colors.deepPurple,
                          ),
                        ),
                        SizedBox(height: 2),
                        Text(
                          'Hãy nhấn nút và mô tả các triệu chứng của bạn, AI sẽ tự động phân tích và đề xuất thuốc phù hợp nhất.',
                          style: TextStyle(
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

            _buildVoiceConsultCard(),
            const SizedBox(height: 24),

            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: Colors.deepPurple.shade100),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Row(
                    children: [
                      Icon(
                        Icons.chat_bubble_outline,
                        color: Colors.deepPurple,
                        size: 18,
                      ),
                      SizedBox(width: 8),
                      Text(
                        'Chat với dược sĩ AI',
                        style: TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.bold,
                          color: Colors.deepPurple,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  ..._aiChatMessages.map((message) {
                    final isUser = message['role'] == 'user';
                    return Align(
                      alignment: isUser
                          ? Alignment.centerRight
                          : Alignment.centerLeft,
                      child: Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 10,
                        ),
                        constraints: const BoxConstraints(maxWidth: 320),
                        decoration: BoxDecoration(
                          color: isUser
                              ? Colors.deepPurple
                              : Colors.grey.shade100,
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: Text(
                          message['text'] ?? '',
                          style: TextStyle(
                            fontSize: 12,
                            height: 1.35,
                            color: isUser ? Colors.white : Colors.black87,
                          ),
                        ),
                      ),
                    );
                  }),
                  if (_aiLoading)
                    Align(
                      alignment: Alignment.centerLeft,
                      child: Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 10,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.deepPurple.shade50,
                          borderRadius: BorderRadius.circular(14),
                        ),
                        child: const Text(
                          'Đang phân tích triệu chứng...',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.deepPurple,
                          ),
                        ),
                      ),
                    ),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _aiChatController,
                          minLines: 1,
                          maxLines: 3,
                          textInputAction: TextInputAction.send,
                          onSubmitted: (_) => _sendAiChatMessage(),
                          decoration: InputDecoration(
                            hintText: 'VD: Tôi ho khan, đau họng 2 ngày...',
                            isDense: true,
                            filled: true,
                            fillColor: Colors.grey.shade50,
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(14),
                              borderSide: BorderSide(
                                color: Colors.grey.shade200,
                              ),
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      IconButton.filled(
                        onPressed: _aiLoading ? null : _sendAiChatMessage,
                        style: IconButton.styleFrom(
                          backgroundColor: Colors.deepPurple,
                          foregroundColor: Colors.white,
                        ),
                        icon: const Icon(Icons.send),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 24),

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

            // Results UI Box
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
                    const Text(
                      'HỘI THOẠI TRANSCRIPT:',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: Colors.grey,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '"${_aiRecommendationResult!['transcript']}"',
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        fontStyle: FontStyle.italic,
                      ),
                    ),
                    const Divider(height: 20),
                    const Text(
                      'CHẨN ĐOÁN TRIỆU CHỨNG:',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: Colors.grey,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      _aiRecommendationResult!['symptoms'],
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: Colors.black87,
                      ),
                    ),
                    if (_aiRecommendationResult!['warnings'] != null) ...[
                      const SizedBox(height: 8),
                      Container(
                        padding: const EdgeInsets.all(8),
                        decoration: BoxDecoration(
                          color: Colors.amber.shade50,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          'Cảnh báo AI: ${_aiRecommendationResult!['warnings']}',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: Colors.amber.shade900,
                          ),
                        ),
                      ),
                    ],
                    const Divider(height: 20),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'TOA THUỐC ĐỀ XUẤT:',
                          style: TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                            color: Colors.grey,
                          ),
                        ),
                        ElevatedButton.icon(
                          onPressed: _addAllAiMedsToCart,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.deepPurple,
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(
                              horizontal: 10,
                              vertical: 4,
                            ),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(10),
                            ),
                          ),
                          icon: const Icon(Icons.add_shopping_cart, size: 12),
                          label: const Text(
                            'Thêm tất cả',
                            style: TextStyle(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 8),
                    // Suggested drugs list view
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
                              const Icon(
                                Icons.medication,
                                color: Colors.deepPurple,
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      drug['name'],
                                      style: const TextStyle(
                                        fontSize: 12,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    Text(
                                      drug['dosage'],
                                      style: TextStyle(
                                        fontSize: 10,
                                        color: Colors.grey.shade600,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              Container(
                                padding: const EdgeInsets.symmetric(
                                  horizontal: 6,
                                  vertical: 2,
                                ),
                                decoration: BoxDecoration(
                                  color: Colors.green.shade50,
                                  borderRadius: BorderRadius.circular(4),
                                ),
                                child: Text(
                                  'Còn kho',
                                  style: TextStyle(
                                    fontSize: 8,
                                    fontWeight: FontWeight.bold,
                                    color: Colors.green.shade700,
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

  Widget _buildProfileTab() {
    final name =
        _userProfile?['fullName'] ??
        _userProfile?['name'] ??
        'Khách Hàng';
    final email = _userProfile?['email'] ?? 'Chưa cập nhật email';
    final phone = _userProfile?['phone'] ?? 'Chưa cập nhật SĐT';
    final points = _userProfile?['points'] ?? _userProfile?['loyaltyPoints'] ?? 0;
    final tier = _userProfile?['memberTier'] ?? (points >= 1000 ? 'Thành Viên Vàng (Gold)' : 'Thành Viên Mới');

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
                            BoxShadow(color: Colors.black26, blurRadius: 8),
                          ],
                        ),
                        child: const Icon(
                          Icons.person,
                          size: 38,
                          color: Color(0xFF0D47A1),
                        ),
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
                              style: const TextStyle(
                                fontSize: 12,
                                color: Colors.white70,
                              ),
                            ),
                            const SizedBox(height: 2),
                            Text(
                              'SĐT: $phone',
                              style: const TextStyle(
                                fontSize: 12,
                                color: Colors.white70,
                              ),
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
                      _buildProfileBadge(
                        Icons.star,
                        '$points Điểm',
                        'Điểm tích lũy',
                      ),
                      Container(width: 1, height: 30, color: Colors.white24),
                      _buildProfileBadge(
                        Icons.workspace_premium,
                        '$tier',
                        'Hạng tài khoản',
                      ),
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
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF0D47A1),
                      ),
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
                  prefixIcon: const Icon(
                    Icons.search,
                    color: Color(0xFF0D47A1),
                  ),
                  suffixIcon: IconButton(
                    icon: const Icon(Icons.send, color: Color(0xFF0D47A1)),
                    onPressed: _loadUserProfileAndOrders,
                  ),
                  contentPadding: const EdgeInsets.symmetric(
                    horizontal: 16,
                    vertical: 12,
                  ),
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
                    Icon(
                      Icons.receipt_long_outlined,
                      size: 56,
                      color: Colors.grey,
                    ),
                    SizedBox(height: 12),
                    Text(
                      'Chưa có đơn hàng nào',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 15,
                        color: Colors.grey,
                      ),
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
                  final status =
                      order['paymentStatus'] ?? order['status'] ?? 'PENDING';
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
                          status == 'PAID'
                              ? Icons.check_circle
                              : Icons.hourglass_top,
                          color: statusColor,
                          size: 22,
                        ),
                      ),
                      title: Text(
                        'Đơn hàng #$code',
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                        ),
                      ),
                      subtitle: Text(
                        'Ngày: $dateStr • Thanh toán: $method',
                        style: const TextStyle(
                          fontSize: 11,
                          color: Colors.grey,
                        ),
                      ),
                      trailing: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 3,
                            ),
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
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12,
                                ),
                              ),
                              const SizedBox(height: 6),
                              ...items.map(
                                (item) => Padding(
                                  padding: const EdgeInsets.symmetric(
                                    vertical: 2.0,
                                  ),
                                  child: Row(
                                    mainAxisAlignment:
                                        MainAxisAlignment.spaceBetween,
                                    children: [
                                      Expanded(
                                        child: Text(
                                          '• ${item['name'] ?? 'Thuốc'} x${item['quantity'] ?? 1}',
                                          style: const TextStyle(fontSize: 12),
                                        ),
                                      ),
                                      Text(
                                        '${(item['price'] ?? 0) * (item['quantity'] ?? 1)} ₫',
                                        style: const TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.bold,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                              if (order['shippingAddress'] != null) ...[
                                const SizedBox(height: 8),
                                Text(
                                  'Địa chỉ nhận: ${order['shippingAddress']}',
                                  style: TextStyle(
                                    fontSize: 11,
                                    color: Colors.grey.shade700,
                                  ),
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

class ProcessingCirclePainter extends CustomPainter {
  final double animationValue;
  ProcessingCirclePainter(this.animationValue);

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final radius = size.width / 2 - 8;
    final basePaint = Paint()
      ..color = Colors.indigo.withValues(alpha: 0.10)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 5;
    final progressPaint = Paint()
      ..color = Colors.indigo.withValues(alpha: 0.75)
      ..style = PaintingStyle.stroke
      ..strokeWidth = 5
      ..strokeCap = StrokeCap.round;

    canvas.drawCircle(center, radius, basePaint);
    canvas.drawArc(
      Rect.fromCircle(center: center, radius: radius),
      (animationValue * math.pi * 2) - math.pi / 2,
      math.pi * 1.3,
      false,
      progressPaint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}
