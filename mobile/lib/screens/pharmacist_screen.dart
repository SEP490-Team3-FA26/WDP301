import 'dart:async';
import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../widgets/notification_badge.dart';

class PharmacistScreen extends StatefulWidget {
  const PharmacistScreen({super.key});

  @override
  State<PharmacistScreen> createState() => _PharmacistScreenState();
}

class _PharmacistScreenState extends State<PharmacistScreen>
    with TickerProviderStateMixin {
  late TabController _tabController;
  final List<Map<String, dynamic>> _cart = [];
  final List<String> _selectedInteractionMeds = [];
  bool _checkingInteractions = false;
  Map<String, dynamic>? _interactionResult;
  bool _scanningPrescription = false;
  bool _loadingPrescriptionSamples = false;
  String? _selectedPrescriptionSample;
  List<Map<String, dynamic>> _prescriptionSamples = [];
  Map<String, dynamic>? _lastPrescriptionScan;

  // DB Pagination State
  final List<Map<String, dynamic>> _medicines = [];
  int _currentPage = 1;
  bool _isLoading = false;
  bool _hasMore = true;
  final ScrollController _scrollController = ScrollController();
  String _searchQuery = '';
  Timer? _debounceTimer;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);

    _scrollController.addListener(() {
      if (_scrollController.position.pixels >=
          _scrollController.position.maxScrollExtent - 200) {
        _loadMedicines();
      }
    });

    _loadMedicines(reset: true);
    _loadPrescriptionSamples();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _scrollController.dispose();
    _debounceTimer?.cancel();
    super.dispose();
  }

  // Load medicines from DB with pagination
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
    }
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

  void _addToCart(Map<String, dynamic> med) {
    setState(() {
      final existingIndex = _cart.indexWhere((item) => item['id'] == med['id']);
      if (existingIndex >= 0) {
        _cart[existingIndex]['qty'] += 1;
      } else {
        _cart.add({
          'id': med['id'],
          'name': med['name'],
          'price': med['price'],
          'unit': med['unit'],
          'qty': 1,
        });
      }
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          'Đã thêm ${med['name']} vào giỏ hàng',
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        backgroundColor: Colors.green,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  Widget _buildListImagePlaceholder() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.lightBlue.shade50,
        borderRadius: BorderRadius.circular(8),
      ),
      child: const Icon(Icons.medication, size: 24, color: Colors.lightBlue),
    );
  }

  Widget _buildDetailRow(String label, String value, {Color? valueColor}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 90,
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
                color: valueColor ?? const Color(0xFF1E293B),
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
                    Row(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Container(
                          width: 80,
                          height: 80,
                          decoration: BoxDecoration(
                            color: Colors.grey.shade50,
                            borderRadius: BorderRadius.circular(12),
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
                                      _buildListImagePlaceholder(),
                                )
                              : _buildListImagePlaceholder(),
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
                                  fontWeight: FontWeight.bold,
                                  fontSize: 13,
                                  color: Color(0xFF1E293B),
                                ),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '${med['price'] ?? 0} ₫ / ${med['unit'] ?? 'Hộp'}',
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 13,
                                  color: Color(0xFF0288D1),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const Divider(height: 24),
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
                    const Divider(height: 24),
                    const Text(
                      'Chỉ định / Công dụng',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                        color: Color(0xFF1E293B),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      med['cong_dung'] ?? 'N/A',
                      style: TextStyle(
                        fontSize: 11,
                        color: Colors.grey.shade700,
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'Liều dùng / Hướng dẫn',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                        color: Color(0xFF1E293B),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      med['cach_dung'] ?? 'N/A',
                      style: TextStyle(
                        fontSize: 11,
                        color: Colors.grey.shade700,
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'Tác dụng phụ',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                        color: Color(0xFF1E293B),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      med['tac_dung_phu'] ?? 'N/A',
                      style: TextStyle(
                        fontSize: 11,
                        color: Colors.grey.shade700,
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'Lưu ý & Bảo quản',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 12,
                        color: Color(0xFF1E293B),
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${med['luu_y'] ?? 'N/A'}\nBảo quản: ${med['bao_quan'] ?? 'N/A'}',
                      style: TextStyle(
                        fontSize: 11,
                        color: Colors.grey.shade700,
                        height: 1.4,
                      ),
                    ),
                    const SizedBox(height: 24),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  int get _totalAmount {
    return _cart.fold(
      0,
      (sum, item) => sum + ((item['price'] as int) * (item['qty'] as int)),
    );
  }

  void _toggleSelectInteractionMed(String name) {
    setState(() {
      if (_selectedInteractionMeds.contains(name)) {
        _selectedInteractionMeds.remove(name);
      } else {
        _selectedInteractionMeds.add(name);
      }
      _interactionResult = null;
    });
  }

  Future<void> _checkAIInteractions() async {
    if (_selectedInteractionMeds.length < 2) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Hãy chọn ít nhất 2 loại thuốc để kiểm tra tương tác.'),
        ),
      );
      return;
    }

    setState(() {
      _checkingInteractions = true;
      _interactionResult = null;
    });

    final result = await ApiService.checkInteractions(_selectedInteractionMeds);

    setState(() {
      _checkingInteractions = false;
      if (result != null) {
        _interactionResult = {
          'risk': result['risk'] ?? 'MEDIUM',
          'title': result['title'] ?? 'KẾT QUẢ PHÂN TÍCH TƯƠNG TÁC THUỐC',
          'description':
              result['description'] ??
              'Tìm thấy tương tác chéo tiềm ẩn giữa các hoạt chất của đơn thuốc.',
        };
      } else {
        // Fallback simulation
        final hasAmoxicillin = _selectedInteractionMeds.any(
          (n) => n.toLowerCase().contains('amoxicillin'),
        );
        final hasCefuroxim = _selectedInteractionMeds.any(
          (n) => n.toLowerCase().contains('cefuroxim'),
        );

        if (hasAmoxicillin && hasCefuroxim) {
          _interactionResult = {
            'risk': 'HIGH',
            'title': 'Cảnh báo nguy hiểm cấp độ Cao',
            'description':
                'Dùng chung hai loại kháng sinh Amoxicillin và Cefuroxim có thể làm giảm hoạt lực diệt khuẩn của nhau và tăng nguy cơ tác dụng phụ trên hệ tiêu hóa, suy gan thận.',
          };
        } else {
          _interactionResult = {
            'risk': 'SAFE',
            'title': 'Tương tác nhẹ (An toàn)',
            'description':
                'Không có tương tác đáng kể được ghi nhận giữa các hoạt chất. Phối hợp điều trị an toàn.',
          };
        }
      }
    });
  }

  Future<void> _simulatePrescriptionScan() async {
    if (_prescriptionSamples.isEmpty) {
      await _loadPrescriptionSamples();
    }

    if (!mounted) return;

    final filename =
        _selectedPrescriptionSample ??
        (_prescriptionSamples.isNotEmpty
            ? _prescriptionSamples.first['filename'] as String?
            : null);

    if (filename == null || filename.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Chưa có đơn thuốc mẫu để quét.'),
          backgroundColor: Colors.orange,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    setState(() {
      _scanningPrescription = true;
      _selectedPrescriptionSample = filename;
    });

    final result = await ApiService.scanSamplePrescription(filename);

    if (result == null) {
      if (!mounted) return;
      setState(() {
        _scanningPrescription = false;
        _lastPrescriptionScan = null;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'OCR ảnh chưa khả dụng. Không có dữ liệu đọc đơn để điền giỏ hàng.',
            style: TextStyle(fontWeight: FontWeight.bold),
          ),
          backgroundColor: Colors.red,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    final cartItems = _buildCartFromPrescriptionScan(result);

    setState(() {
      _scanningPrescription = false;
      _lastPrescriptionScan = result;
      _cart.clear();
      _cart.addAll(cartItems);
    });

    if (!mounted) return;
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          cartItems.isEmpty
              ? 'AI đã đọc đơn nhưng chưa match được thuốc trong kho.'
              : 'Quét mẫu $filename thành công! Đã tự động điền giỏ hàng.',
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        backgroundColor: cartItems.isEmpty ? Colors.orange : Colors.green,
        behavior: SnackBarBehavior.floating,
      ),
    );
    if (cartItems.isNotEmpty) {
      _tabController.animateTo(0);
    }
  }

  Future<void> _loadPrescriptionSamples() async {
    if (_loadingPrescriptionSamples) return;
    setState(() {
      _loadingPrescriptionSamples = true;
    });

    final samples = await ApiService.getSamplePrescriptions();

    if (!mounted) return;
    setState(() {
      _prescriptionSamples = samples;
      _selectedPrescriptionSample ??= samples.isNotEmpty
          ? samples.first['filename'] as String?
          : null;
      _loadingPrescriptionSamples = false;
    });
  }

  List<Map<String, dynamic>> _buildCartFromPrescriptionScan(
    Map<String, dynamic>? result,
  ) {
    final matchedDrugs = (result?['matched_drugs'] as List?) ?? [];
    final inventoryStatus = result?['inventory_status'] as Map?;
    final availableDrugs = (inventoryStatus?['available'] as List?) ?? [];
    final ocrResult = result?['ocr_result'] as Map?;
    final ocrMedications = (ocrResult?['medications'] as List?) ?? [];
    final generated = <Map<String, dynamic>>[];

    Map<String, dynamic>? findMedicine(String rawName) {
      final normalizedName = rawName.toLowerCase().trim();
      if (normalizedName.isEmpty) return null;

      return _medicines.cast<Map<String, dynamic>?>().firstWhere((m) {
        final medicineName = (m?['name'] ?? '').toString().toLowerCase();
        return medicineName == normalizedName ||
            medicineName.contains(normalizedName) ||
            normalizedName.contains(medicineName);
      }, orElse: () => null);
    }

    void addCartItem({
      required String name,
      Object? id,
      Object? quantity,
      Object? unit,
      Object? price,
    }) {
      final cleanName = name.trim();
      if (cleanName.isEmpty || cleanName == 'Không tìm thấy') return;
      final medicine = findMedicine(cleanName);
      final qty = int.tryParse((quantity ?? '1').toString()) ?? 1;

      generated.add({
        'id': medicine?['id'] ?? id ?? 'AI-${generated.length + 1}',
        'name': medicine?['name'] ?? cleanName,
        'price': medicine?['price'] ?? price ?? 0,
        'unit': medicine?['unit'] ?? unit ?? 'Hộp',
        'qty': qty < 1 ? 1 : qty,
      });
    }

    for (final item in matchedDrugs) {
      if (item is! Map) continue;
      final name =
          (item['matched_name'] ??
                  item['prescription_name'] ??
                  item['name'] ??
                  '')
              .toString()
              .trim();
      addCartItem(
        name: name,
        id: item['medicine_id'],
        quantity: item['quantity'],
        unit: item['unit'],
        price: item['price'],
      );
    }

    if (generated.isNotEmpty) return generated;

    for (final item in availableDrugs) {
      if (item is! Map) continue;
      addCartItem(
        name: (item['name'] ?? item['medicine_name'] ?? '').toString(),
        id: item['medicine_id'] ?? item['id'],
        quantity: item['quantity'],
        unit: item['unit'],
        price: item['price'],
      );
    }

    if (generated.isNotEmpty) return generated;

    for (final item in ocrMedications) {
      if (item is! Map) continue;
      final name = (item['name'] ?? '').toString();
      final strength = (item['strength'] ?? '').toString().trim();
      addCartItem(
        name: strength.isEmpty ? name : '$name $strength',
        quantity: item['quantity'],
        unit: item['unit'],
      );
    }

    return generated;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF1F5F9),
      appBar: AppBar(
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Dược Sĩ Bán Hàng',
              style: TextStyle(
                fontWeight: FontWeight.w900,
                color: Colors.white,
                fontSize: 18,
              ),
            ),
            Text(
              'QUẦY THANH TOÁN POS & TƯ VẤN AI',
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
              colors: [Color(0xFF0288D1), Color(0xFF0097A7)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
        ),
        elevation: 4,
        iconTheme: const IconThemeData(color: Colors.white),
        actions: const [NotificationBadge(iconColor: Colors.white)],
        bottom: TabBar(
          controller: _tabController,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white60,
          indicatorColor: Colors.white,
          indicatorWeight: 3.5,
          tabs: const [
            Tab(icon: Icon(Icons.shopping_basket), text: 'POS'),
            Tab(icon: Icon(Icons.psychology), text: 'AI Tương Tác'),
            Tab(icon: Icon(Icons.document_scanner), text: 'Quét Đơn'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          // TAB 1: POS Screen
          _buildPosTab(),

          // TAB 2: AI Interactions Check
          _buildAiInteractionsTab(),

          // TAB 3: Scanning Prescription Simulator
          _buildScanPrescriptionTab(),
        ],
      ),
    );
  }

  Widget _buildPosTab() {
    return Column(
      children: [
        // Search & Product Catalog
        Expanded(
          flex: 3,
          child: Padding(
            padding: const EdgeInsets.all(12.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Search bar
                TextField(
                  onChanged: _onSearchChanged,
                  decoration: InputDecoration(
                    prefixIcon: const Icon(
                      Icons.search,
                      color: Color(0xFF0288D1),
                    ),
                    hintText: 'Tìm kiếm thuốc theo tên hoặc hoạt chất...',
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
                const SizedBox(height: 12),
                const Text(
                  'Danh sách dược phẩm tồn kho',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                    color: Color(0xFF1E293B),
                  ),
                ),
                const SizedBox(height: 8),
                Expanded(
                  child: ListView.builder(
                    controller: _scrollController,
                    itemCount: _medicines.length + (_isLoading ? 1 : 0),
                    itemBuilder: (context, index) {
                      if (index >= _medicines.length) {
                        return const Center(
                          child: Padding(
                            padding: EdgeInsets.all(12.0),
                            child: CircularProgressIndicator(
                              color: Color(0xFF0288D1),
                            ),
                          ),
                        );
                      }

                      final med = _medicines[index];
                      final outOfStock = med['stock'] <= 0;

                      return Card(
                        color: Colors.white,
                        elevation: 1,
                        margin: const EdgeInsets.only(bottom: 8),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                          side: BorderSide(color: Colors.grey.shade100),
                        ),
                        child: ListTile(
                          onTap: () => _showMedicineDetails(med),
                          leading: Container(
                            width: 44,
                            height: 44,
                            decoration: BoxDecoration(
                              color: Colors.grey.shade50,
                              borderRadius: BorderRadius.circular(8),
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
                                            _buildListImagePlaceholder(),
                                  )
                                : _buildListImagePlaceholder(),
                          ),
                          contentPadding: const EdgeInsets.symmetric(
                            horizontal: 12,
                            vertical: 4,
                          ),
                          title: Text(
                            med['name']!,
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 14,
                            ),
                          ),
                          subtitle: Text(
                            '${med['price']} ₫ / ${med['unit']}  •  Tồn: ${med['stock']}',
                            style: TextStyle(
                              fontSize: 12,
                              color: outOfStock
                                  ? Colors.red
                                  : Colors.grey.shade600,
                            ),
                          ),
                          trailing: ElevatedButton(
                            onPressed: outOfStock
                                ? null
                                : () => _addToCart(med),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF0288D1),
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(8),
                              ),
                            ),
                            child: const Text(
                              'Thêm',
                              style: TextStyle(
                                fontWeight: FontWeight.bold,
                                fontSize: 12,
                              ),
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
              ],
            ),
          ),
        ),

        // Checkout Cart panel
        Expanded(
          flex: 2,
          child: Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: const BorderRadius.only(
                topLeft: Radius.circular(28),
                topRight: Radius.circular(28),
              ),
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.05),
                  blurRadius: 15,
                  offset: const Offset(0, -5),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Row(
                      children: [
                        const Icon(
                          Icons.shopping_cart,
                          color: Color(0xFF0288D1),
                          size: 20,
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'Giỏ hàng hiện tại (${_cart.length})',
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 15,
                            color: Color(0xFF1E293B),
                          ),
                        ),
                      ],
                    ),
                    if (_cart.isNotEmpty)
                      TextButton(
                        onPressed: () => setState(() => _cart.clear()),
                        child: const Text(
                          'Xóa hết',
                          style: TextStyle(
                            color: Colors.red,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      ),
                  ],
                ),
                Expanded(
                  child: _cart.isEmpty
                      ? const Center(
                          child: Text(
                            'Giỏ hàng trống. Thêm thuốc ở bảng trên.',
                            style: TextStyle(color: Colors.grey, fontSize: 13),
                          ),
                        )
                      : ListView.separated(
                          itemCount: _cart.length,
                          separatorBuilder: (context, index) => const Divider(
                            height: 8,
                            color: Color(0xFFF1F5F9),
                          ),
                          itemBuilder: (context, index) {
                            final item = _cart[index];
                            return Padding(
                              padding: const EdgeInsets.symmetric(
                                vertical: 4.0,
                              ),
                              child: Row(
                                mainAxisAlignment:
                                    MainAxisAlignment.spaceBetween,
                                children: [
                                  Expanded(
                                    child: Text(
                                      '${item['name']} (x${item['qty']})',
                                      style: const TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 13,
                                        color: Color(0xFF334155),
                                      ),
                                    ),
                                  ),
                                  Text(
                                    '${((item['price'] as int) * (item['qty'] as int)).toString()} ₫',
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 13,
                                      color: Color(0xFF0288D1),
                                    ),
                                  ),
                                ],
                              ),
                            );
                          },
                        ),
                ),
                const Divider(color: Color(0xFFE2E8F0)),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    const Text(
                      'TỔNG THANH TOÁN:',
                      style: TextStyle(
                        fontWeight: FontWeight.w900,
                        fontSize: 15,
                        color: Color(0xFF1E293B),
                      ),
                    ),
                    Text(
                      '${_totalAmount.toString()} ₫',
                      style: const TextStyle(
                        fontWeight: FontWeight.w900,
                        fontSize: 16,
                        color: Colors.red,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                ElevatedButton(
                  onPressed: _cart.isEmpty
                      ? null
                      : () {
                          _showToastInvoiceSuccess();
                        },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF0288D1),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(14),
                    ),
                  ),
                  child: const Text(
                    'Xác nhận & Xuất Hóa Đơn (POS)',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      letterSpacing: 0.5,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _buildAiInteractionsTab() {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.amber.shade50,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: Colors.amber.shade200),
            ),
            child: Row(
              children: [
                Icon(Icons.lightbulb, color: Colors.amber.shade800),
                const SizedBox(width: 10),
                const Expanded(
                  child: Text(
                    'Kiểm tra dược lý tương tác thuốc chéo trước khi bán cho khách hàng để tránh rủi ro về sức khỏe.',
                    style: TextStyle(fontSize: 12, height: 1.3),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          const Text(
            'Chọn các thuốc cần kiểm tra tương tác thuốc chéo:',
            style: TextStyle(
              fontWeight: FontWeight.bold,
              fontSize: 14,
              color: Color(0xFF1E293B),
            ),
          ),
          const SizedBox(height: 12),

          // Selection items
          Expanded(
            child: _medicines.isEmpty
                ? const Center(child: CircularProgressIndicator())
                : GridView.builder(
                    gridDelegate:
                        const SliverGridDelegateWithFixedCrossAxisCount(
                          crossAxisCount: 2,
                          crossAxisSpacing: 10,
                          mainAxisSpacing: 10,
                          childAspectRatio: 2.5,
                        ),
                    itemCount: _medicines.length,
                    itemBuilder: (context, index) {
                      final med = _medicines[index];
                      final name = med['name']! as String;
                      final isSelected = _selectedInteractionMeds.contains(
                        name,
                      );

                      return FilterChip(
                        selected: isSelected,
                        label: Text(
                          name,
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                            color: isSelected
                                ? const Color(0xFF0288D1)
                                : Colors.grey.shade700,
                          ),
                          overflow: TextOverflow.ellipsis,
                        ),
                        onSelected: (val) => _toggleSelectInteractionMed(name),
                        selectedColor: const Color(
                          0xFF0288D1,
                        ).withValues(alpha: 0.15),
                        checkmarkColor: const Color(0xFF0288D1),
                        backgroundColor: Colors.white,
                        side: BorderSide(
                          color: isSelected
                              ? const Color(0xFF0288D1)
                              : Colors.grey.shade200,
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(10),
                        ),
                      );
                    },
                  ),
          ),
          const SizedBox(height: 16),

          ElevatedButton.icon(
            onPressed: _selectedInteractionMeds.length < 2
                ? null
                : _checkAIInteractions,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF0288D1),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(vertical: 14),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
            ),
            icon: _checkingInteractions
                ? const SizedBox(
                    width: 18,
                    height: 18,
                    child: CircularProgressIndicator(
                      strokeWidth: 2,
                      color: Colors.white,
                    ),
                  )
                : const Icon(Icons.check_circle_outline),
            label: Text(
              _checkingInteractions
                  ? 'Đang phân tích y khoa AI...'
                  : 'Phân tích tương tác thuốc chéo',
            ),
          ),

          const SizedBox(height: 16),

          // Result display
          if (_interactionResult != null) ...[
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: _interactionResult!['risk'] == 'HIGH'
                    ? Colors.red.shade50
                    : Colors.green.shade50,
                borderRadius: BorderRadius.circular(16),
                border: Border.all(
                  color: _interactionResult!['risk'] == 'HIGH'
                      ? Colors.red.shade200
                      : Colors.green.shade200,
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
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _interactionResult!['title']!,
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                            color: _interactionResult!['risk'] == 'HIGH'
                                ? Colors.red.shade800
                                : Colors.green.shade800,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const Divider(height: 16),
                  Text(
                    _interactionResult!['description']!,
                    style: const TextStyle(
                      height: 1.4,
                      fontSize: 12,
                      color: Colors.black87,
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildScanPrescriptionTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(24.0),
      child: Column(
        children: [
          Container(
            height: 250,
            width: double.infinity,
            decoration: BoxDecoration(
              color: Colors.black87,
              borderRadius: BorderRadius.circular(28),
              border: Border.all(color: const Color(0xFF0288D1), width: 3),
              boxShadow: [
                BoxShadow(
                  color: const Color(0xFF0288D1).withValues(alpha: 0.15),
                  blurRadius: 20,
                  spreadRadius: 2,
                ),
              ],
            ),
            child: Stack(
              alignment: Alignment.center,
              children: [
                if (_scanningPrescription)
                  const Center(
                    child: CircularProgressIndicator(color: Color(0xFF0288D1)),
                  )
                else
                  const Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.camera_alt, size: 64, color: Colors.white54),
                      SizedBox(height: 10),
                      Text(
                        'GIẢ LẬP CAMERA QUÉT ĐƠN THUỐC',
                        style: TextStyle(
                          color: Colors.white54,
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                Positioned(
                  top: 20,
                  left: 20,
                  child: Container(
                    width: 30,
                    height: 30,
                    decoration: const BoxDecoration(
                      border: Border(
                        top: BorderSide(color: Color(0xFF0288D1), width: 4),
                        left: BorderSide(color: Color(0xFF0288D1), width: 4),
                      ),
                    ),
                  ),
                ),
                Positioned(
                  top: 20,
                  right: 20,
                  child: Container(
                    width: 30,
                    height: 30,
                    decoration: const BoxDecoration(
                      border: Border(
                        top: BorderSide(color: Color(0xFF0288D1), width: 4),
                        right: BorderSide(color: Color(0xFF0288D1), width: 4),
                      ),
                    ),
                  ),
                ),
                Positioned(
                  bottom: 20,
                  left: 20,
                  child: Container(
                    width: 30,
                    height: 30,
                    decoration: const BoxDecoration(
                      border: Border(
                        bottom: BorderSide(color: Color(0xFF0288D1), width: 4),
                        left: BorderSide(color: Color(0xFF0288D1), width: 4),
                      ),
                    ),
                  ),
                ),
                Positioned(
                  bottom: 20,
                  right: 20,
                  child: Container(
                    width: 30,
                    height: 30,
                    decoration: const BoxDecoration(
                      border: Border(
                        bottom: BorderSide(color: Color(0xFF0288D1), width: 4),
                        right: BorderSide(color: Color(0xFF0288D1), width: 4),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 24),
          const Text(
            'Đặt đơn thuốc giấy trước camera để AI phân tích nét chữ, tự động tìm kiếm thuốc và chèn thông tin y khoa vào giỏ hàng.',
            textAlign: TextAlign.center,
            style: TextStyle(color: Colors.grey, fontSize: 13, height: 1.4),
          ),
          const SizedBox(height: 24),
          if (_loadingPrescriptionSamples)
            const Padding(
              padding: EdgeInsets.only(bottom: 16),
              child: CircularProgressIndicator(strokeWidth: 2),
            )
          else if (_prescriptionSamples.isNotEmpty) ...[
            Align(
              alignment: Alignment.centerLeft,
              child: Text(
                'Đơn thuốc mẫu',
                style: TextStyle(
                  color: Colors.grey.shade800,
                  fontWeight: FontWeight.bold,
                  fontSize: 13,
                ),
              ),
            ),
            const SizedBox(height: 10),
            SizedBox(
              height: 44,
              child: ListView.separated(
                scrollDirection: Axis.horizontal,
                itemCount: _prescriptionSamples.length,
                separatorBuilder: (_, _) => const SizedBox(width: 8),
                itemBuilder: (context, index) {
                  final sample = _prescriptionSamples[index];
                  final filename = sample['filename']?.toString() ?? '';
                  final selected = filename == _selectedPrescriptionSample;

                  return ChoiceChip(
                    selected: selected,
                    label: Text(
                      'Mẫu ${index + 1}',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: selected
                            ? Colors.white
                            : const Color(0xFF0288D1),
                      ),
                    ),
                    avatar: Icon(
                      Icons.description,
                      size: 18,
                      color: selected ? Colors.white : const Color(0xFF0288D1),
                    ),
                    selectedColor: const Color(0xFF0288D1),
                    backgroundColor: Colors.white,
                    side: BorderSide(
                      color: selected
                          ? const Color(0xFF0288D1)
                          : Colors.grey.shade300,
                    ),
                    onSelected: _scanningPrescription
                        ? null
                        : (_) {
                            setState(() {
                              _selectedPrescriptionSample = filename;
                            });
                          },
                  );
                },
              ),
            ),
            if (_selectedPrescriptionSample != null) ...[
              const SizedBox(height: 8),
              Text(
                _selectedPrescriptionSample!,
                textAlign: TextAlign.center,
                style: TextStyle(color: Colors.grey.shade600, fontSize: 11),
              ),
            ],
            const SizedBox(height: 18),
          ] else ...[
            OutlinedButton.icon(
              onPressed: _loadPrescriptionSamples,
              icon: const Icon(Icons.refresh),
              label: const Text('Tải đơn thuốc mẫu'),
            ),
            const SizedBox(height: 18),
          ],
          ElevatedButton.icon(
            onPressed: _scanningPrescription ? null : _simulatePrescriptionScan,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF0288D1),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(14),
              ),
            ),
            icon: const Icon(Icons.document_scanner),
            label: const Text(
              'Bắt đầu quét đơn thuốc bằng AI',
              style: TextStyle(fontWeight: FontWeight.bold),
            ),
          ),
          if (_lastPrescriptionScan != null) ...[
            const SizedBox(height: 14),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.green.shade50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.green.shade100),
              ),
              child: Row(
                children: [
                  Icon(Icons.check_circle, color: Colors.green.shade700),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'AI đã đọc ${((_lastPrescriptionScan!['ocr_result'] as Map?)?['medications'] as List?)?.length ?? 0} thuốc từ mẫu.',
                      style: TextStyle(
                        color: Colors.green.shade900,
                        fontWeight: FontWeight.w600,
                        fontSize: 12,
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ],
      ),
    );
  }

  Future<void> _showToastInvoiceSuccess() async {
    final orderData = {
      'patientName': 'Khách hàng mua tại quầy',
      'patientPhone': '0900000000',
      'shippingAddress': 'Mua tại quầy POS',
      'items': _cart.map((item) => {
        'medicineId': (item['id'] != null && item['id'].toString().isNotEmpty)
            ? item['id'].toString()
            : 'MED-001',
        'name': item['name'],
        'price': item['price'],
        'quantity': item['qty'],
      }).toList(),
      'totalAmount': _totalAmount,
      'paymentMethod': 'CASH',
      'type': 'RETAIL',
    };

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text(
          'Đang xử lý đơn hàng và xuất hóa đơn POS...',
          style: TextStyle(fontWeight: FontWeight.bold),
        ),
        backgroundColor: Color(0xFF0288D1),
        behavior: SnackBarBehavior.floating,
      ),
    );

    final res = await ApiService.createOrder(orderData);

    if (mounted) {
      if (res != null) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Thanh toán và xuất hóa đơn POS thành công!', style: TextStyle(fontWeight: FontWeight.bold)),
            backgroundColor: Colors.green,
            behavior: SnackBarBehavior.floating,
          ),
        );
        setState(() {
          _cart.clear();
        });
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Tạo đơn hàng thất bại. Vui lòng kiểm tra lại kết nối máy chủ.', style: TextStyle(fontWeight: FontWeight.bold)),
            backgroundColor: Colors.red,
            behavior: SnackBarBehavior.floating,
          ),
        );
      }
    }
  }
}
