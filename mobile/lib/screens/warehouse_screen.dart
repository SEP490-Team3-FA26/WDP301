import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:http/http.dart' as http;
import 'package:flutter/services.dart';
import '../services/api_service.dart';


class WarehouseScreen extends StatefulWidget {
  const WarehouseScreen({super.key});

  @override
  State<WarehouseScreen> createState() => _WarehouseScreenState();
}

class _WarehouseScreenState extends State<WarehouseScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  
  // Track expanded medicine IDs for batch dropdowns
  final Set<String> _expandedMedIds = {};

  // Goods Receipt sessions loaded dynamically from DB
  final List<Map<String, dynamic>> _goodsReceipts = [];

  Map<String, dynamic>? _selectedReceipt;
  Map<String, dynamic>? _selectedItem;
  final TextEditingController _actualQtyController = TextEditingController();
  String? _selectedImagePath;
  
  int _currentInspectionIndex = 0;
  bool _isAiAnalyzing = false;
  bool _isSavingCount = false;
  bool _isCheckAnimationActive = false;
  bool _hasRealServerConnection = true;
  Timer? _healthCheckTimer;
  int _aiErrorCountForCurrentItem = 0;

  // DB Pagination State
  final List<Map<String, dynamic>> _medicines = [];
  int _currentPage = 1;
  bool _isLoading = false;
  bool _hasMore = true;
  final ScrollController _scrollController = ScrollController();
  String _searchQuery = '';
  Timer? _debounceTimer;

  // Lot Tracking State
  final TextEditingController _batchNoController = TextEditingController();
  bool _isTracing = false;
  Map<String, dynamic>? _traceResult;
  String? _traceError;
  
  // AI Forecast State
  int _forecastPeriod = 30;
  bool _isForecasting = false;
  Map<String, dynamic>? _forecastResult;
  String? _forecastError;

  final List<Map<String, dynamic>> _expiredBatches = [
    {
      'medicineName': 'Panadol Extra',
      'batchNo': 'Lô B0 (Hết hạn)',
      'expDate': '01/05/2026',
      'stock': 20,
      'unit': 'Hộp',
      'status': 'EXPIRED',
    },
    {
      'medicineName': 'Amoxicillin 500mg',
      'batchNo': 'Lô A0 (Hết hạn)',
      'expDate': '20/04/2026',
      'stock': 15,
      'unit': 'Hộp',
      'status': 'EXPIRED',
    },
    {
      'medicineName': 'Cefuroxim 500mg',
      'batchNo': 'Lô C0 (Cận hạn)',
      'expDate': '30/06/2026',
      'stock': 50,
      'unit': 'Hộp',
      'status': 'SOON_TO_EXPIRE',
    }
  ];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 5, vsync: this);
    
    _scrollController.addListener(() {
      if (_scrollController.position.pixels >= _scrollController.position.maxScrollExtent - 200) {
        _loadMedicines();
      }
    });

    _loadMedicines(reset: true);
    _loadGoodsReceipts();
    _loadExpirationReport();
    _startHealthCheck();
    _runForecast(_forecastPeriod);
  }

  Future<void> _loadExpirationReport() async {
    try {
      final report = await ApiService.getExpirationReport();
      if (mounted) {
        setState(() {
          _expiredBatches.clear();
          for (var item in report) {
            _expiredBatches.add({
              'medicineName': item['medicineName'] ?? item['name'] ?? 'Thuốc',
              'batchNo': item['batchNo'] ?? 'Lô KD',
              'expDate': item['expDate'] ?? '2026-12-31',
              'stock': item['stock'] ?? 0,
              'unit': item['unit'] ?? 'Hộp',
              'status': item['status'] ?? 'EXPIRED',
            });
          }
        });
      }
    } catch (e) {
      debugPrint("Error loading expiration report: $e");
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    _scrollController.dispose();
    _batchNoController.dispose();
    _debounceTimer?.cancel();
    _healthCheckTimer?.cancel();
    super.dispose();
  }

  void _startHealthCheck() {
    _healthCheckTimer = Timer.periodic(const Duration(seconds: 8), (timer) async {
      try {
        final response = await http.get(Uri.parse('${ApiService.baseUrl}/api/medicines?limit=1')).timeout(
          const Duration(seconds: 2),
        );
        final isConnected = response.statusCode == 200;
        if (isConnected != _hasRealServerConnection) {
          setState(() {
            _hasRealServerConnection = isConnected;
          });
        }
      } catch (_) {
        if (_hasRealServerConnection) {
          setState(() {
            _hasRealServerConnection = false;
          });
        }
      }
    });
  }

  // Load goods receipts note list dynamically from database
  Future<void> _loadGoodsReceipts() async {
    setState(() {
      _isLoading = true;
    });
    try {
      final List<dynamic> dbReceipts = await ApiService.getGoodsReceipts();
      final List<Map<String, dynamic>> mapped = [];
      for (var gr in dbReceipts) {
        final String grStatus = gr['status']?.toString() ?? 'DRAFT';
        if (grStatus != 'DRAFT' && grStatus != 'INSPECTING' && grStatus != 'PENDING_APPROVAL' && grStatus != 'COMPLETED') {
          continue; // Only show relevant sessions to the keeper
        }

        final items = gr['items'] as List? ?? [];
        final List<Map<String, dynamic>> mappedItems = [];
        for (var item in items) {
          final medId = item['medicineId']?.toString() ?? '';
          String name = 'Thuốc chưa rõ';
          String unit = 'Hộp';
          
          // Try to find name in already loaded medicines list
          final med = _medicines.firstWhere((m) => m['id'] == medId, orElse: () => {});
          if (med.isNotEmpty) {
            name = med['name'] ?? name;
            unit = med['unit'] ?? unit;
          } else {
            // Fetch dynamically from DB
            final dbMed = await ApiService.getMedicineById(medId);
            if (dbMed != null) {
              name = dbMed['name'] ?? name;
              unit = dbMed['unit'] ?? unit;
            }
          }

          mappedItems.add({
            'id': item['_id']?.toString() ?? '',
            'medicineId': medId,
            'name': name,
            'expectedQty': item['quantity'] ?? 0,
            'unit': unit,
            'status': item['status'] == 'VERIFIED' ? 'CHECKED' : 'PENDING',
            'aiCount': item['actualQty'],
            'actualQty': item['actualQty'],
            'recordId': null,
            'image': null,
          });
        }

        mapped.add({
          'id': gr['_id']?.toString() ?? '',
          'poId': gr['poId']?.toString() ?? 'PO-Unknown',
          'supplier': gr['supplier']?.toString() ?? 'Đối tác Dược phẩm',
          'status': grStatus,
          'date': gr['createdAt'] != null
              ? gr['createdAt'].toString().substring(0, 10)
              : '27/06/2026',
          'items': mappedItems,
        });
      }
      
      setState(() {
        _goodsReceipts.clear();
        _goodsReceipts.addAll(mapped);
      });
    } catch (e) {
      debugPrint("Error loading goods receipts: $e");
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
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

  Widget _buildListImagePlaceholder() {
    return Container(
      decoration: BoxDecoration(
        color: Colors.cyan.shade50,
        borderRadius: BorderRadius.circular(8),
      ),
      child: const Icon(
        Icons.medication_outlined,
        size: 24,
        color: Colors.cyan,
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
            width: 90,
            child: Text(
              label,
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey.shade500),
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
                          child: med['image'] != null && med['image'].toString().isNotEmpty
                              ? Image.network(
                                  med['image'],
                                  fit: BoxFit.contain,
                                  errorBuilder: (context, error, stackTrace) => _buildListImagePlaceholder(),
                                )
                              : _buildListImagePlaceholder(),
                        ),
                        const SizedBox(width: 16),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: isRx ? Colors.red.shade50 : Colors.green.shade50,
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  isRx ? 'Rx - Thuốc kê đơn' : 'OTC - Không kê đơn',
                                  style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: isRx ? Colors.red.shade700 : Colors.green.shade700),
                                ),
                              ),
                              const SizedBox(height: 8),
                              Text(
                                med['name'] ?? 'N/A',
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF1E293B)),
                              ),
                              const SizedBox(height: 4),
                              Text(
                                '${med['price'] ?? 0} ₫ / ${med['unit'] ?? 'Hộp'}',
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF00838F)),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const Divider(height: 24),
                    _buildDetailRow('Hoạt chất', med['active'] ?? 'N/A'),
                    _buildDetailRow('Phân nhóm', med['category'] ?? 'Chưa phân loại'),
                    _buildDetailRow('Nhà sản xuất', med['manufacturer'] ?? 'N/A'),
                    _buildDetailRow('Dạng bào chế', med['dosage_form'] ?? 'N/A'),
                    _buildDetailRow('Số đăng ký', med['registration_number'] ?? 'N/A'),
                    _buildDetailRow('Tình trạng', outOfStock ? 'Hết hàng' : 'Còn hàng (Tồn: ${med['stock']} ${med['unit']})', 
                        valueColor: outOfStock ? Colors.red : Colors.green.shade700),
                    const Divider(height: 24),
                    const Text('Chỉ định / Công dụng', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFF1E293B))),
                    const SizedBox(height: 4),
                    Text(med['cong_dung'] ?? 'N/A', style: TextStyle(fontSize: 11, color: Colors.grey.shade700, height: 1.4)),
                    const SizedBox(height: 12),
                    const Text('Liều dùng / Hướng dẫn', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFF1E293B))),
                    const SizedBox(height: 4),
                    Text(med['cach_dung'] ?? 'N/A', style: TextStyle(fontSize: 11, color: Colors.grey.shade700, height: 1.4)),
                    const SizedBox(height: 12),
                    const Text('Tác dụng phụ', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFF1E293B))),
                    const SizedBox(height: 4),
                    Text(med['tac_dung_phu'] ?? 'N/A', style: TextStyle(fontSize: 11, color: Colors.grey.shade700, height: 1.4)),
                    const SizedBox(height: 12),
                    const Text('Lưu ý & Bảo quản', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFF1E293B))),
                    const SizedBox(height: 4),
                    Text('${med['luu_y'] ?? 'N/A'}\nBảo quản: ${med['bao_quan'] ?? 'N/A'}', style: TextStyle(fontSize: 11, color: Colors.grey.shade700, height: 1.4)),
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

  void _onSearchChanged(String query) {
    if (_debounceTimer?.isActive ?? false) _debounceTimer!.cancel();
    _debounceTimer = Timer(const Duration(milliseconds: 500), () {
      setState(() {
        _searchQuery = query;
      });
      _loadMedicines(reset: true);
    });
  }

  void _toggleExpand(String id) {
    setState(() {
      if (_expandedMedIds.contains(id)) {
        _expandedMedIds.remove(id);
      } else {
        _expandedMedIds.add(id);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Thủ Kho Dược', style: TextStyle(fontWeight: FontWeight.w900, color: Colors.white, fontSize: 18)),
            Text('QUẢN LÝ NHẬP XUẤT & TỒN KHO LÔ HÀNG', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.white70, letterSpacing: 1.0)),
          ],
        ),
        flexibleSpace: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Color(0xFF00838F), Color(0xFF00ACC1)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
        ),
        elevation: 4,
        iconTheme: const IconThemeData(color: Colors.white),
        bottom: TabBar(
          controller: _tabController,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white60,
          indicatorColor: Colors.white,
          indicatorWeight: 3.5,
          isScrollable: true,
          tabs: const [
            Tab(text: 'Tồn Kho'),
            Tab(text: 'Kiểm Nhận AI'),
            Tab(text: 'Hết Hạn'),
            Tab(text: 'Truy Xuất Lô'),
            Tab(text: 'Dự Báo AI'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildInventoryTab(),
          _buildGrnInspectionTab(),
          _buildExpirationReportTab(),
          _buildLotTrackingTab(),
          _buildAIForecastTab(),
        ],
      ),

    );
  }

  Widget _buildInventoryTab() {
    return RefreshIndicator(
      onRefresh: () => _loadMedicines(reset: true),
      child: SingleChildScrollView(
        controller: _scrollController,
        physics: const AlwaysScrollableScrollPhysics(),
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Stats overview row
              Row(
                children: [
                  Expanded(
                    child: _buildSimpleStatCard(
                      title: 'Tổng số loại',
                      value: '${_medicines.length}',
                      icon: Icons.medical_services,
                      color: Colors.blue,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _buildSimpleStatCard(
                      title: 'Sắp hết hàng',
                      value: '${_medicines.where((m) => (m['stock'] as int) <= 50).length}',
                      icon: Icons.warning_amber_rounded,
                      color: Colors.amber,
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: _buildSimpleStatCard(
                      title: 'Lô cận/hết hạn',
                      value: '${_expiredBatches.length}',
                      icon: Icons.calendar_today,
                      color: Colors.red,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              // Search Bar
              Container(
                decoration: BoxDecoration(
                  boxShadow: [
                    BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 10, offset: const Offset(0, 4))
                  ]
                ),
                child: TextField(
                  onChanged: _onSearchChanged,
                  decoration: InputDecoration(
                    prefixIcon: const Icon(Icons.search, color: Color(0xFF00838F)),
                    hintText: 'Tìm kiếm thuốc theo tên hoặc hoạt chất...',
                    filled: true,
                    fillColor: Colors.white,
                    contentPadding: const EdgeInsets.symmetric(vertical: 0, horizontal: 16),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(16),
                      borderSide: BorderSide.none,
                    ),
                  ),
                ),
              ),
              const SizedBox(height: 16),

              // Medicine items with batch dropdowns
              ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _medicines.length + (_isLoading ? 1 : 0),
                itemBuilder: (context, index) {
                  if (index >= _medicines.length) {
                    return const Center(
                      child: Padding(
                        padding: EdgeInsets.all(12.0),
                        child: CircularProgressIndicator(color: Color(0xFF00838F)),
                      ),
                    );
                  }

                  final med = _medicines[index];
                  final isLow = (med['stock'] as int) <= 50;
                  final batches = med['batches'] as List? ?? [];
                  final hasMultipleBatches = batches.isNotEmpty;
                  final isExpanded = _expandedMedIds.contains(med['id']);

                  return Card(
                    color: Colors.white,
                    margin: const EdgeInsets.only(bottom: 12),
                    elevation: 2,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20), side: BorderSide(color: Colors.grey.shade100)),
                    child: Column(
                      children: [
                        ListTile(
                          onTap: () => _showMedicineDetails(med),
                          leading: Container(
                            width: 44,
                            height: 44,
                            decoration: BoxDecoration(
                              color: Colors.grey.shade50,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            clipBehavior: Clip.antiAlias,
                            child: med['image'] != null && med['image'].toString().isNotEmpty
                                ? Image.network(
                                    med['image'],
                                    fit: BoxFit.contain,
                                    errorBuilder: (context, error, stackTrace) => _buildListImagePlaceholder(),
                                  )
                                : _buildListImagePlaceholder(),
                          ),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                          title: Row(
                            children: [
                              Expanded(
                                child: Text(
                                  med['name']!,
                                  style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF1E293B)),
                                ),
                              ),
                              if (isLow)
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: Colors.red.shade50,
                                    borderRadius: BorderRadius.circular(8),
                                    border: Border.all(color: Colors.red.shade100),
                                  ),
                                  child: const Text(
                                    'Sắp hết',
                                    style: TextStyle(color: Colors.red, fontSize: 9, fontWeight: FontWeight.bold),
                                  ),
                                )
                            ],
                          ),
                          subtitle: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const SizedBox(height: 4),
                              Text('Hoạt chất: ${med['active']}  •  Giá: ${med['price']} ₫'),
                              const SizedBox(height: 4),
                              Text(
                                'Tồn kho: ${med['stock']} ${med['unit']} / Cảnh báo: 50 ${med['unit']}',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 12,
                                  color: isLow ? Colors.red : Colors.grey.shade700,
                                ),
                              ),
                            ],
                          ),
                          trailing: hasMultipleBatches
                              ? IconButton(
                                  icon: Icon(
                                    isExpanded ? Icons.keyboard_arrow_up : Icons.keyboard_arrow_down,
                                    color: const Color(0xFF00838F),
                                  ),
                                  onPressed: () => _toggleExpand(med['id']!),
                                )
                              : null,
                        ),
                        
                        // Collapsible Batch Dropdown list
                        if (hasMultipleBatches && isExpanded)
                          Container(
                            decoration: BoxDecoration(
                              color: const Color(0xFF00838F).withValues(alpha: 0.05),
                              borderRadius: const BorderRadius.only(bottomLeft: Radius.circular(20), bottomRight: Radius.circular(20)),
                            ),
                            padding: const EdgeInsets.all(14),
                            child: Column(
                              children: [
                                const Row(
                                  children: [
                                    Icon(Icons.inventory_2_outlined, size: 14, color: Color(0xFF00838F)),
                                    SizedBox(width: 6),
                                    Text(
                                      'Hạn sử dụng chi tiết từng lô:',
                                      style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFF00838F)),
                                    ),
                                  ],
                                ),
                                const Divider(height: 12),
                                ...batches.map((b) {
                                  return Padding(
                                    padding: const EdgeInsets.symmetric(vertical: 4.0),
                                    child: Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Text(
                                          '${b['batchNo']}  (HSD: ${b['expDate']})',
                                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w500),
                                        ),
                                        Text(
                                          '${b['stock']} ${med['unit']}',
                                          style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                                        ),
                                      ],
                                    ),
                                  );
                                }),
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
      ),
    );
  }

  Widget _buildExpirationReportTab() {
    return Padding(
      padding: const EdgeInsets.all(16.0),
      child: ListView.builder(
        itemCount: _expiredBatches.length,
        itemBuilder: (context, index) {
          final eb = _expiredBatches[index];
          final isExpired = eb['status'] == 'EXPIRED';

          return Card(
            color: Colors.white,
            margin: const EdgeInsets.only(bottom: 12),
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20), side: BorderSide(color: Colors.grey.shade100)),
            elevation: 2,
            child: Padding(
              padding: const EdgeInsets.all(16.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        eb['medicineName']!,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF1E293B)),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: isExpired ? Colors.red.shade50 : Colors.amber.shade50,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          isExpired ? 'Hết Hạn' : 'Cận Hạn',
                          style: TextStyle(
                            color: isExpired ? Colors.red : Colors.amber.shade900,
                            fontSize: 10,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                      )
                    ],
                  ),
                  const Divider(height: 16),
                  Text('Mã Lô: ${eb['batchNo']}', style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
                  const SizedBox(height: 4),
                  Text('Hạn sử dụng: ${eb['expDate']}', style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
                  const SizedBox(height: 4),
                  Text('Tồn lô: ${eb['stock']} ${eb['unit']}', style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      ElevatedButton.icon(
                        onPressed: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('Đã lên kế hoạch xử lý lô ${eb['batchNo']}', style: const TextStyle(fontWeight: FontWeight.bold)),
                              backgroundColor: isExpired ? Colors.red : const Color(0xFF00838F),
                              behavior: SnackBarBehavior.floating,
                            ),
                          );
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: isExpired ? Colors.red : const Color(0xFF00838F),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                        icon: const Icon(Icons.delete_sweep, size: 16),
                        label: Text(isExpired ? 'Tiêu hủy lô' : 'Xử lý cận hạn'),
                      )
                    ],
                  )
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildGrnInspectionTab() {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(color: Color(0xFF00838F)),
      );
    }

    if (_selectedReceipt == null) {
      // 1. Render Receipt List
      final pendingReceipts = _goodsReceipts.where((gr) => gr['status'] == 'DRAFT' || gr['status'] == 'INSPECTING').toList();
      final completedReceipts = _goodsReceipts.where((gr) => gr['status'] == 'PENDING_APPROVAL' || gr['status'] == 'COMPLETED').toList();

      return RefreshIndicator(
        onRefresh: _loadGoodsReceipts,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              const Text(
                'Phiếu Nhập Hàng Chờ Kiểm Nhận (GRN)',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF1E293B)),
              ),
              const SizedBox(height: 12),
              if (pendingReceipts.isEmpty)
                const Card(
                  child: Padding(
                    padding: EdgeInsets.all(24.0),
                    child: Text('Không có phiếu nhập hàng nào chờ xử lý.', textAlign: TextAlign.center),
                  ),
                )
              else
                ...pendingReceipts.map((gr) => _buildReceiptCard(gr)),
              const SizedBox(height: 24),
              const Text(
                'Lịch Sử Phiếu Đã Duyệt Nhập Kho',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Colors.grey),
              ),
              const SizedBox(height: 12),
              if (completedReceipts.isEmpty)
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 12.0),
                  child: Text('Chưa duyệt phiếu nào trong phiên này.', style: TextStyle(color: Colors.grey, fontSize: 12)),
                )
              else
                ...completedReceipts.map((gr) => _buildReceiptCard(gr)),
            ],
          ),
        ),
      );
    } else {
      // 2. Render Worksheet for selected Receipt
      return _buildInspectionWorksheet();
    }
  }

  Widget _buildReceiptCard(Map<String, dynamic> gr) {
    final String status = gr['status']?.toString() ?? 'DRAFT';
    final isCompleted = status == 'COMPLETED';
    final isPendingApproval = status == 'PENDING_APPROVAL';
    final items = gr['items'] as List;
    final checkedCount = items.where((i) => i['status'] == 'CHECKED').length;

    String statusLabel = 'CHỜ KIỂM';
    Color badgeColor = Colors.amber.shade50;
    Color textColor = Colors.amber.shade900;
    Color borderColor = Colors.grey.shade200;

    if (status == 'COMPLETED') {
      statusLabel = 'ĐÃ NHẬP KHO';
      badgeColor = Colors.green.shade50;
      textColor = Colors.green.shade700;
      borderColor = Colors.green.shade100;
    } else if (status == 'PENDING_APPROVAL') {
      statusLabel = 'CHỜ DUYỆT';
      badgeColor = Colors.blue.shade50;
      textColor = Colors.blue.shade700;
      borderColor = Colors.blue.shade100;
    } else if (status == 'CANCELLED') {
      statusLabel = 'ĐÃ HỦY';
      badgeColor = Colors.red.shade50;
      textColor = Colors.red.shade700;
      borderColor = Colors.red.shade100;
    } else if (status == 'INSPECTING') {
      statusLabel = 'ĐANG KIỂM';
      badgeColor = Colors.orange.shade50;
      textColor = Colors.orange.shade800;
      borderColor = Colors.orange.shade200;
    } else if (status == 'DRAFT') {
      statusLabel = 'NHÁP';
      badgeColor = Colors.grey.shade100;
      textColor = Colors.grey.shade700;
      borderColor = Colors.grey.shade200;
    }

    return Card(
      color: Colors.white,
      margin: const EdgeInsets.only(bottom: 12),
      elevation: 2,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: BorderSide(color: borderColor),
      ),
      child: ListTile(
        contentPadding: const EdgeInsets.all(16),
        title: Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Expanded(
              child: Text(
                'Phiếu: ${gr['id']}',
                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF1E293B)),
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const SizedBox(width: 8),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(
                color: badgeColor,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Text(
                statusLabel,
                style: TextStyle(
                  color: textColor,
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                ),
              ),
            )
          ],
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 8),
            Text('Nhà cung cấp: ${gr['supplier']}', style: TextStyle(color: Colors.grey.shade700, fontSize: 13)),
            const SizedBox(height: 4),
            Text('Đơn đặt hàng: ${gr['poId']}  •  Ngày: ${gr['date']}', style: const TextStyle(color: Colors.grey, fontSize: 12)),
            const SizedBox(height: 8),
            Row(
              children: [
                Icon(
                  isCompleted ? Icons.check_circle_outline : (isPendingApproval ? Icons.hourglass_top : Icons.checklist_rounded), 
                  size: 14, 
                  color: isCompleted ? Colors.green : (isPendingApproval ? Colors.blue : Colors.orange)
                ),
                const SizedBox(width: 4),
                Text(
                  isCompleted 
                      ? 'Đã nhập tồn kho đầy đủ'
                      : (isPendingApproval 
                          ? 'Đã gửi báo cáo kiểm nhận'
                          : 'Tiến độ kiểm: $checkedCount/${items.length} dòng hàng'),
                  style: TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: isCompleted ? Colors.green : (isPendingApproval ? Colors.blue : Colors.orange),
                  ),
                ),
              ],
            )
          ],
        ),
        trailing: (status == 'DRAFT' || status == 'INSPECTING') 
            ? const Icon(Icons.arrow_forward_ios, size: 16, color: Colors.grey)
            : null,
        onTap: (status == 'DRAFT' || status == 'INSPECTING') ? () {
          setState(() {
            _selectedReceipt = gr;
            _selectedItem = null;
            _selectedImagePath = null;
            _actualQtyController.clear();
          });
        } : () {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text(isPendingApproval 
                  ? 'Phiếu đang chờ quản lý phê duyệt. Không thể chỉnh sửa!' 
                  : 'Phiếu đã hoàn tất nhập kho!'),
              backgroundColor: Colors.blueGrey,
            ),
          );
        },
      ),
    );
  }

  Widget _buildInspectionWorksheet() {
    final gr = _selectedReceipt!;
    final items = gr['items'] as List;
    final isCompleted = gr['status'] == 'COMPLETED';

    final int verifiedCount = items.where((i) => i['status'] == 'CHECKED').length;
    final int skippedCount = items.where((i) => i['status'] == 'SKIPPED').length;
    final int pendingCount = items.where((i) => i['status'] == 'PENDING').length;
    final int totalCount = items.length;
    final double progress = totalCount > 0 ? verifiedCount / totalCount : 0.0;

    final hasPendingOrSkipped = pendingCount > 0 || skippedCount > 0;

    if (_selectedItem == null) {
      // 1. Receipt Summary / Checklist View
      return Stack(
        children: [
          Column(
            children: [
              // Receipt Header Info
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                color: Colors.white,
                child: Row(
                  children: [
                    IconButton(
                      icon: const Icon(Icons.arrow_back, color: Color(0xFF00838F)),
                      onPressed: () {
                        setState(() {
                          _selectedReceipt = null;
                          _selectedItem = null;
                          _selectedImagePath = null;
                        });
                      },
                    ),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'Bảng Kiểm Nhận: ${gr['id']}',
                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16, color: Color(0xFF1E293B)),
                          ),
                          Text(
                            'NCC: ${gr['supplier']}',
                            style: const TextStyle(fontSize: 12, color: Colors.grey),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ),
                    ),
                    if (hasPendingOrSkipped && !isCompleted)
                      ElevatedButton.icon(
                        onPressed: () {
                          final idx = items.indexWhere((i) => i['status'] == 'PENDING' || i['status'] == 'SKIPPED');
                          if (idx != -1) {
                            setState(() {
                              _selectedItem = items[idx];
                              _currentInspectionIndex = idx;
                              _selectedImagePath = null;
                              _actualQtyController.clear();
                              _aiErrorCountForCurrentItem = 0;
                            });
                          }
                        },
                        icon: const Icon(Icons.play_arrow, size: 14),
                        label: Text(
                          verifiedCount > 0 ? 'TIẾP TỤC' : 'BẮT ĐẦU KIỂM',
                          style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold),
                        ),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF00838F),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                        ),
                      )
                  ],
                ),
              ),
              const Divider(height: 1),

              // Progress Bar
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                color: Colors.white,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(4),
                      child: LinearProgressIndicator(
                        value: progress,
                        backgroundColor: Colors.grey.shade200,
                        valueColor: const AlwaysStoppedAnimation<Color>(Colors.green),
                        minHeight: 6,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          '$verifiedCount Đã xác nhận ✔',
                          style: const TextStyle(color: Colors.green, fontWeight: FontWeight.bold, fontSize: 11),
                        ),
                        Text(
                          '$skippedCount Bỏ qua ⏭',
                          style: const TextStyle(color: Colors.orange, fontWeight: FontWeight.bold, fontSize: 11),
                        ),
                        Text(
                          '$pendingCount Chưa kiểm ○',
                          style: const TextStyle(color: Colors.grey, fontWeight: FontWeight.bold, fontSize: 11),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const Divider(height: 1),

              // Offline Warning Bar
              if (!_hasRealServerConnection)
                Container(
                  color: Colors.red.shade600,
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 16),
                  child: const Row(
                    children: [
                      Icon(Icons.wifi_off, color: Colors.white, size: 14),
                      SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'Mất kết nối máy chủ. Tạm thời chuyển sang chế độ đếm thủ công.',
                          style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                ),

              // Items List
              Expanded(
                child: SingleChildScrollView(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      const Text(
                        'Danh Sách SKU Đơn Nhập Khẩu',
                        style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.grey),
                      ),
                      const SizedBox(height: 8),
                      ...items.map((item) {
                        final status = item['status']?.toString() ?? 'PENDING';
                        final isChecked = status == 'CHECKED';
                        final isSkipped = status == 'SKIPPED';
                        final isSelected = _selectedItem != null && _selectedItem!['id'] == item['id'];

                        Color cardBorderColor = Colors.grey.shade200;
                        Icon trailingIcon = const Icon(Icons.radio_button_off, color: Colors.grey);
                        Widget subtitleWidget = Text('Yêu cầu nhận: ${item['expectedQty']} ${item['unit']}');

                        if (isChecked) {
                          final expectedQty = item['expectedQty'] as int;
                          final actualQty = item['actualQty'] as int? ?? expectedQty;
                          final bool isMismatched = expectedQty != actualQty;
                          cardBorderColor = Colors.green.shade200;
                          trailingIcon = isMismatched 
                              ? const Icon(Icons.warning, color: Colors.orange) 
                              : const Icon(Icons.check_circle, color: Colors.green);
                          subtitleWidget = Text(
                            'Đã Kiểm: Thực nhận $actualQty / Dự kiến $expectedQty ${item['unit']}',
                            style: TextStyle(color: Colors.green.shade700, fontWeight: FontWeight.bold),
                          );
                        } else if (isSkipped) {
                          cardBorderColor = Colors.orange.shade200;
                          trailingIcon = const Icon(Icons.redo_rounded, color: Colors.orange);
                          subtitleWidget = Text(
                            'Đã bỏ qua ⏭ (Dự kiến: ${item['expectedQty']} ${item['unit']})',
                            style: TextStyle(color: Colors.orange.shade700, fontWeight: FontWeight.bold),
                          );
                        }

                        return Card(
                          color: isSelected ? Colors.cyan.shade50.withValues(alpha: 0.5) : Colors.white,
                          margin: const EdgeInsets.only(bottom: 8),
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                            side: BorderSide(color: cardBorderColor, width: 1.0),
                          ),
                          child: ListTile(
                            dense: true,
                            title: Text(
                              item['name'],
                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                            ),
                            subtitle: subtitleWidget,
                            trailing: trailingIcon,
                            onTap: isCompleted
                                ? null
                                : () {
                                    final idx = items.indexOf(item);
                                    setState(() {
                                      _selectedItem = item;
                                      _currentInspectionIndex = idx;
                                      _selectedImagePath = null;
                                      _actualQtyController.clear();
                                      _aiErrorCountForCurrentItem = 0;
                                      if (isChecked) {
                                        _actualQtyController.text = item['actualQty'].toString();
                                      }
                                    });
                                  },
                          ),
                        );
                      }),
                      const SizedBox(height: 16),

                      // Submit button
                      if (!isCompleted)
                        Padding(
                          padding: const EdgeInsets.symmetric(vertical: 16.0),
                          child: ElevatedButton.icon(
                            onPressed: (pendingCount == 0 && skippedCount == 0) ? _submitInspectionReport : null,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: const Color(0xFF00838F),
                              foregroundColor: Colors.white,
                              disabledBackgroundColor: Colors.grey.shade300,
                              disabledForegroundColor: Colors.grey.shade500,
                              padding: const EdgeInsets.all(16),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                              elevation: (pendingCount == 0 && skippedCount == 0) ? 4 : 0,
                            ),
                            icon: const Icon(Icons.send_rounded),
                            label: const Text(
                              'GỬI BÁO CÁO KIỂM NHẬN',
                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, letterSpacing: 1.1),
                            ),
                          ),
                        ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      );
    } else {
      // 2. Render Carousel Inspection View
      final item = _selectedItem!;
      return PopScope(
        canPop: false,
        onPopInvokedWithResult: (didPop, result) {
          if (didPop) return;
          _goToWorksheet();
        },
        child: Stack(
          children: [
            Column(
              children: [
                // Carousel Header
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  color: Colors.white,
                  child: Row(
                    children: [
                      IconButton(
                        icon: const Icon(Icons.arrow_back, color: Color(0xFF00838F)),
                        onPressed: _goToWorksheet,
                      ),
                      Expanded(
                        child: Text(
                          '${item['name']} (${_currentInspectionIndex + 1} / ${items.length})',
                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF1E293B)),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      Text(
                        item['status'] == 'CHECKED' ? '✔ ĐÃ KIỂM' : (item['status'] == 'SKIPPED' ? '⏭ ĐÃ BỎ QUA' : '○ CHƯA KIỂM'),
                        style: TextStyle(
                          fontSize: 10,
                          fontWeight: FontWeight.bold,
                          color: item['status'] == 'CHECKED' ? Colors.green : (item['status'] == 'SKIPPED' ? Colors.orange : Colors.grey),
                        ),
                      ),
                    ],
                  ),
                ),
                const Divider(height: 1),

                // Carousel Navigation Bar
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                  color: Colors.grey.shade50,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      TextButton.icon(
                        onPressed: _currentInspectionIndex > 0 ? _goToPrev : null,
                        icon: const Icon(Icons.chevron_left, size: 16),
                        label: const Text('Trước đó', style: TextStyle(fontSize: 11)),
                        style: TextButton.styleFrom(
                          foregroundColor: const Color(0xFF00838F),
                        ),
                      ),
                      TextButton.icon(
                        onPressed: _skipCurrentItem,
                        icon: const Icon(Icons.redo_rounded, size: 14),
                        label: const Text('Bỏ qua', style: TextStyle(fontSize: 11)),
                        style: TextButton.styleFrom(foregroundColor: Colors.orange.shade700),
                      ),
                      TextButton.icon(
                        onPressed: _goToWorksheet,
                        icon: const Icon(Icons.list_alt_rounded, size: 14),
                        label: const Text('Danh sách', style: TextStyle(fontSize: 11)),
                        style: TextButton.styleFrom(foregroundColor: Colors.blueGrey),
                      ),
                      TextButton.icon(
                        onPressed: _currentInspectionIndex < items.length - 1 ? _goToNext : null,
                        icon: const Icon(Icons.chevron_right, size: 16),
                        label: const Text('Tiếp theo', style: TextStyle(fontSize: 11)),
                        style: TextButton.styleFrom(
                          foregroundColor: const Color(0xFF00838F),
                        ),
                      ),
                    ],
                  ),
                ),
                const Divider(height: 1),

                // Offline Warning Bar
                if (!_hasRealServerConnection)
                  Container(
                    color: Colors.red.shade600,
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(vertical: 6, horizontal: 16),
                    child: const Row(
                      children: [
                        Icon(Icons.wifi_off, color: Colors.white, size: 14),
                        SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Mất kết nối máy chủ. Tạm thời chuyển sang chế độ đếm thủ công.',
                            style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                    ),
                  ),

                // Card content
                Expanded(
                  child: SingleChildScrollView(
                    padding: const EdgeInsets.all(16.0),
                    child: _buildItemInspectionWorksheetCard(),
                  ),
                ),
              ],
            ),
            if (_isCheckAnimationActive)
              Positioned.fill(
                child: Container(
                  color: Colors.black38,
                  child: Center(
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 24),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        boxShadow: const [BoxShadow(color: Colors.black12, blurRadius: 10)],
                      ),
                      child: const Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Icon(Icons.check_circle, color: Colors.green, size: 64),
                          SizedBox(height: 12),
                          Text(
                            'Đã xác nhận ✔',
                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Colors.green),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      );
    }
  }

  Widget _buildItemInspectionWorksheetCard() {
    final item = _selectedItem!;
    final bool hasImage = _selectedImagePath != null || item['image'] != null;
    final bool hasAIResult = item['aiCount'] != null;
    final int expectedQty = item['expectedQty'] as int;
    final int? aiCount = item['aiCount'] as int?;

    // Determine Discrepancy details
    double pctDiff = 0.0;
    String discrepancyStatus = 'MATCH';
    if (aiCount != null) {
      final int diff = aiCount - expectedQty;
      pctDiff = (diff.abs() / expectedQty);
      if (diff == 0) {
        discrepancyStatus = 'MATCH';
      } else if (pctDiff <= 0.02) {
        discrepancyStatus = 'WARNING';
      } else {
        discrepancyStatus = 'MISMATCH';
      }
    }

    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
      color: Colors.white,
      child: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                const Icon(Icons.camera_alt, color: Color(0xFF00838F)),
                const SizedBox(width: 8),
                Expanded(
                  child: Text(
                    'Kiểm Nhận: ${item['name']}',
                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF1E293B)),
                  ),
                ),
              ],
            ),
            const Divider(height: 24),

            // Image Preview
            Container(
              height: 180,
              decoration: BoxDecoration(
                color: Colors.grey.shade50,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.grey.shade200),
              ),
              child: _selectedImagePath != null
                  ? ClipRRect(
                      borderRadius: BorderRadius.circular(12),
                      child: Image.file(
                        File(_selectedImagePath!),
                        fit: BoxFit.cover,
                      ),
                    )
                  : (item['image'] != null && item['image'].toString().isNotEmpty
                      ? ClipRRect(
                          borderRadius: BorderRadius.circular(12),
                          child: Image.network(
                            item['image'].toString().startsWith('http')
                                ? item['image']
                                : 'http://10.0.2.2:8000${item['image']}',
                            fit: BoxFit.cover,
                            errorBuilder: (c, e, s) => const Center(child: Icon(Icons.broken_image, size: 48)),
                          ),
                        )
                      : const Center(
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(Icons.photo_library_outlined, size: 48, color: Colors.grey),
                              SizedBox(height: 8),
                              Text('Chưa chụp ảnh minh chứng', style: TextStyle(color: Colors.grey, fontSize: 12)),
                            ],
                          ),
                        )),
            ),
            const SizedBox(height: 12),

            // Capture buttons
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _pickImage(ImageSource.camera),
                    icon: const Icon(Icons.add_a_photo_outlined, size: 16),
                    label: const Text('Máy Ảnh', style: TextStyle(fontSize: 11)),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFF00838F),
                      side: const BorderSide(color: Color(0xFF00838F)),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _pickImage(ImageSource.gallery),
                    icon: const Icon(Icons.image_search_outlined, size: 16),
                    label: const Text('Thư Viện', style: TextStyle(fontSize: 11)),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFF00838F),
                      side: const BorderSide(color: Color(0xFF00838F)),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                  ),
                ),
              ],
            ),
            
            // Sim capture helper
            Padding(
              padding: const EdgeInsets.only(top: 8.0),
              child: OutlinedButton.icon(
                onPressed: _mockCaptureSamplePhoto,
                icon: const Icon(Icons.science, size: 16),
                label: const Text('Tải ảnh test mẫu (Giả Lập)', style: TextStyle(fontSize: 11)),
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.purple,
                  side: const BorderSide(color: Colors.purple),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
              ),
            ),
            const SizedBox(height: 16),

            // AI Count action button
            if (hasImage && !hasAIResult && !_isAiAnalyzing)
              ElevatedButton.icon(
                onPressed: _runAIInspection,
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF00838F),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.all(12),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
                icon: const Icon(Icons.rocket_launch, size: 18),
                label: const Text('BẮT ĐẦU PHÂN TÍCH AI (AI COUNT)', style: TextStyle(fontWeight: FontWeight.bold)),
              ),

            if (_isAiAnalyzing)
              Column(
                children: [
                  const Center(
                    child: Padding(
                      padding: EdgeInsets.all(12.0),
                      child: CircularProgressIndicator(color: Color(0xFF00838F)),
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _aiErrorCountForCurrentItem == 0 ? 'Uploading...' : 'Analyzing...',
                    style: const TextStyle(color: Colors.grey, fontSize: 12, fontStyle: FontStyle.italic),
                  ),
                ],
              ),

            // AI error Recovery UI
            if (!hasAIResult && !_isAiAnalyzing && _aiErrorCountForCurrentItem > 0)
              Container(
                margin: const EdgeInsets.only(top: 12),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.red.shade50,
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: Colors.red.shade200),
                ),
                child: Column(
                  children: [
                    Text(
                      'Không thể nhận diện hình ảnh qua AI! (Số lần thử: $_aiErrorCountForCurrentItem)',
                      style: TextStyle(color: Colors.red.shade900, fontWeight: FontWeight.bold, fontSize: 12),
                      textAlign: TextAlign.center,
                    ),
                    const SizedBox(height: 12),
                    Row(
                      children: [
                        Expanded(
                          child: ElevatedButton.icon(
                            onPressed: _runAIInspection,
                            icon: const Icon(Icons.refresh, size: 14),
                            label: const Text('Thử lại AI', style: TextStyle(fontSize: 11)),
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.red.shade600,
                              foregroundColor: Colors.white,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                            ),
                          ),
                        ),
                        if (_aiErrorCountForCurrentItem >= 2) ...[
                          const SizedBox(width: 8),
                          Expanded(
                            child: ElevatedButton.icon(
                              onPressed: _manualCountBypass,
                              icon: const Icon(Icons.edit, size: 14),
                              label: const Text('Nhập thủ công', style: TextStyle(fontSize: 11)),
                              style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.orange.shade700,
                                foregroundColor: Colors.white,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                              ),
                            ),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),

            // AI results & verify fields
            if (hasAIResult && !_isAiAnalyzing) ...[
              const Divider(height: 24),
              // Match Status Bar
              _buildDiscrepancyBar(discrepancyStatus, aiCount!, expectedQty),
              const SizedBox(height: 12),
              OutlinedButton.icon(
                onPressed: () {
                  setState(() {
                    item['aiCount'] = null;
                    item['recordId'] = null;
                    item['image'] = null;
                    _selectedImagePath = null;
                    _actualQtyController.clear();
                  });
                },
                icon: const Icon(Icons.refresh, size: 16),
                label: const Text('Quét lại ảnh khác (Làm mới)', style: TextStyle(fontSize: 11)),
                style: OutlinedButton.styleFrom(
                  foregroundColor: Colors.red.shade700,
                  side: BorderSide(color: Colors.red.shade300),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                ),
              ),
              const SizedBox(height: 16),

              // Manual verification counts
              const Text(
                'Thủ kho xác nhận số lượng thực tế:',
                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFF1E293B)),
              ),
              const SizedBox(height: 6),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _actualQtyController,
                      keyboardType: TextInputType.number,
                      decoration: InputDecoration(
                        hintText: 'Nhập số đếm thực tế...',
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  ElevatedButton(
                    onPressed: _isSavingCount ? null : _confirmActualCount,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green.shade600,
                      foregroundColor: Colors.white,
                      disabledBackgroundColor: Colors.grey.shade300,
                      disabledForegroundColor: Colors.grey.shade500,
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                    ),
                    child: Text(
                      _isSavingCount ? 'ĐANG LƯU...' : 'XÁC NHẬN',
                      style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                    ),
                  )
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildDiscrepancyBar(String status, int aiCount, int expectedQty) {
    MaterialColor color = Colors.green;
    String message = 'Khớp hoàn toàn (0)';
    IconData icon = Icons.check_circle;

    final diff = aiCount - expectedQty;
    if (status == 'MATCH') {
      color = Colors.green;
      message = 'SỐ LƯỢNG KHỚP HOÀN TOÀN: AI đếm $aiCount / Hóa đơn $expectedQty';
      icon = Icons.check_circle;
    } else if (status == 'WARNING') {
      color = Colors.orange;
      message = 'CẢNH BÁO CHÊNH LỆCH NHẸ (Thừa/thiếu ${diff.abs()} hộp, sai lệch <= 2%). AI đếm: $aiCount';
      icon = Icons.warning_amber_rounded;
    } else {
      color = Colors.red;
      message = 'SAI LỆCH LỚN (Thừa/thiếu ${diff.abs()} hộp, vượt quá 2% sai số). AI đếm: $aiCount';
      icon = Icons.error_outline;
    }

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withValues(alpha: 0.3)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: color, size: 20),
          const SizedBox(width: 8),
          Expanded(
            child: Text(
              message,
              style: TextStyle(color: color.shade900, fontWeight: FontWeight.bold, fontSize: 12, height: 1.3),
            ),
          )
        ],
      ),
    );
  }

  // Image Picker picker implementation
  final ImagePicker _picker = ImagePicker();
  Future<void> _pickImage(ImageSource source) async {
    try {
      final XFile? pickedFile = await _picker.pickImage(
        source: source,
        maxWidth: 1024,
        maxHeight: 1024,
        imageQuality: 85,
      );
      if (pickedFile != null) {
        setState(() {
          _selectedImagePath = pickedFile.path;
        });
      }
    } catch (e) {
      debugPrint("Error picking image: $e");
    }
  }

  // Mock a mock sample photo for testing in emulators where file picker/camera might fail
  Future<void> _mockCaptureSamplePhoto() async {
    // Generate a simple mock text file or just pretend we have a picture to invoke testing
    // To be compatible with http MultipartFile, we write a small mock png/jpg file in the app data directory
    try {
      final tempDir = Directory.systemTemp;
      final mockFile = File('${tempDir.path}/mock_medicine_cluster.jpg');
      
      // Write some mock pixel bytes representing a JPEG
      await mockFile.writeAsBytes(List.generate(100, (index) => index));
      setState(() {
        _selectedImagePath = mockFile.path;
      });
      
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Đã tải ảnh giả lập thành công! Hãy nhấn Bắt đầu phân tích AI để test.'),
          backgroundColor: Colors.purple,
          duration: Duration(seconds: 2),
        ),
      );
    } catch (e) {
      debugPrint("Mock photo capture failed: $e");
    }
  }

  // AI run_workflow query
  Future<void> _runAIInspection() async {
    if (_selectedReceipt == null || _selectedItem == null || _selectedImagePath == null) return;
    setState(() {
      _isAiAnalyzing = true;
    });
    try {
      final result = await ApiService.inspectReceiptItemAI(
        receiptId: _selectedReceipt!['id'],
        receiptItemId: _selectedItem!['id'],
        filePath: _selectedImagePath!,
      );
      
      setState(() {
        _isAiAnalyzing = false;
        _aiErrorCountForCurrentItem = 0;
        _selectedItem!['aiCount'] = result['aiCount'];
        _selectedItem!['recordId'] = result['inspectionRecordId'];
        _selectedItem!['image'] = result['evidenceImage'];
        _actualQtyController.text = result['aiCount'].toString();
      });
    } catch (e) {
      setState(() {
        _isAiAnalyzing = false;
        _aiErrorCountForCurrentItem++;
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Lỗi phân tích AI: $e. Thử lại hoặc chọn đếm thủ công.', style: const TextStyle(fontWeight: FontWeight.bold)),
          backgroundColor: Colors.red,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  Future<void> _confirmActualCount() async {
    if (_selectedItem == null || _selectedItem!['recordId'] == null) return;
    final int? actualQty = int.tryParse(_actualQtyController.text);
    if (actualQty == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Vui lòng nhập số lượng thực tế hợp lệ!'), backgroundColor: Colors.red),
      );
      return;
    }
    
    setState(() {
      _isSavingCount = true; 
    });
    
    final recordId = _selectedItem!['recordId']?.toString() ?? '';
    bool success = true;
    
    // Check if mock
    if (!recordId.startsWith('MOCK-REC-')) {
      success = await ApiService.verifyReceiptItemCount(
        inspectionRecordId: recordId,
        actualQty: actualQty,
        userId: 'TK-092', 
      );
    }
    
    if (success) {
      HapticFeedback.lightImpact();
      
      setState(() {
        _isSavingCount = false;
        _selectedItem!['actualQty'] = actualQty;
        _selectedItem!['status'] = 'CHECKED';
        _isCheckAnimationActive = true;
      });
      
      await Future.delayed(const Duration(milliseconds: 500));
      
      if (mounted) {
        setState(() {
          _isCheckAnimationActive = false;
          _selectedImagePath = null;
          _actualQtyController.clear();
          
          // Auto advance slide transition
          final items = _selectedReceipt!['items'] as List;
          int nextIdx = -1;
          for (int i = _currentInspectionIndex + 1; i < items.length; i++) {
            if (items[i]['status'] == 'PENDING' || items[i]['status'] == 'SKIPPED') {
              nextIdx = i;
              break;
            }
          }
          if (nextIdx == -1) {
            for (int i = 0; i < _currentInspectionIndex; i++) {
              if (items[i]['status'] == 'PENDING' || items[i]['status'] == 'SKIPPED') {
                nextIdx = i;
                break;
              }
            }
          }
          
          if (nextIdx != -1) {
            _currentInspectionIndex = nextIdx;
            _selectedItem = items[nextIdx];
            _aiErrorCountForCurrentItem = 0;
            final isChecked = _selectedItem!['status'] == 'CHECKED';
            if (isChecked) {
              _actualQtyController.text = _selectedItem!['actualQty'].toString();
            }
          } else {
            _selectedItem = null;
          }
        });
      }
    } else {
      setState(() {
        _isSavingCount = false;
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Xác nhận số lượng thất bại! Vui lòng thử lại.'), backgroundColor: Colors.red),
      );
    }
  }

  // submit goods receipt inspection report to manager
  Future<void> _submitInspectionReport() async {
    if (_selectedReceipt == null) return;
    
    final pendingItems = _selectedReceipt!['items'].where((i) => i['status'] == 'PENDING').toList();
    final skippedItems = _selectedReceipt!['items'].where((i) => i['status'] == 'SKIPPED').toList();
    
    if (pendingItems.isNotEmpty || skippedItems.isNotEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Không thể gửi báo cáo! Vui lòng hoàn tất kiểm đếm hoặc quyết định số lượng cho tất cả sản phẩm (không để trạng thái Bỏ qua) trước khi gửi.'),
          backgroundColor: Colors.red,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Gửi báo cáo kiểm nhận'),
        content: const Text('Báo cáo kiểm nhận sẽ được gửi lên Quản lý. Bạn không thể chỉnh sửa trừ khi Quản lý yêu cầu kiểm lại (Re-inspect).'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Hủy bỏ'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Xác nhận gửi'),
          ),
        ],
      ),
    );
    if (confirm != true) return;

    setState(() {
      _isLoading = true; 
    });

    final success = await ApiService.submitInspection(_selectedReceipt!['id']);
    
    if (success) {
      setState(() {
        _isLoading = false;
      });
      
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Đã gửi báo cáo kiểm nhận thành công cho phiếu ${_selectedReceipt!['id']}! Vui lòng chờ quản lý phê duyệt nhập tồn.'),
          backgroundColor: Colors.green,
          behavior: SnackBarBehavior.floating,
        ),
      );
      
      setState(() {
        _selectedReceipt = null;
        _selectedItem = null;
        _selectedImagePath = null;
      });
      _loadGoodsReceipts(); // Refresh list to remove the submitted receipt
    } else {
      setState(() {
        _isLoading = false;
      });
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Gửi báo cáo kiểm nhận thất bại! Vui lòng thử lại.'), backgroundColor: Colors.red),
      );
    }
  }

  void _manualCountBypass() {
    setState(() {
      _selectedItem!['aiCount'] = _selectedItem!['expectedQty'];
      _selectedItem!['recordId'] = 'MOCK-REC-${DateTime.now().millisecondsSinceEpoch}';
      _selectedItem!['image'] = '';
      _actualQtyController.text = _selectedItem!['expectedQty'].toString();
      _aiErrorCountForCurrentItem = 0;
      _isAiAnalyzing = false;
    });
  }

  bool _hasUnsavedChanges(Map<String, dynamic> item) {
    final hasImage = _selectedImagePath != null || item['image'] != null;
    final hasAIResult = item['aiCount'] != null;
    final isChecked = item['status'] == 'CHECKED';
    return hasImage && hasAIResult && !isChecked;
  }

  Future<bool> _promptUnsavedChanges() async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Thay đổi chưa lưu'),
        content: const Text('Bạn có thay đổi chưa xác nhận cho dòng hàng này. Bạn có chắc chắn muốn rời đi và hủy bỏ kết quả quét hiện tại?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Tiếp tục kiểm'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            style: TextButton.styleFrom(foregroundColor: Colors.red),
            child: const Text('Hủy bỏ'),
          ),
        ],
      ),
    );
    return confirmed ?? false;
  }

  void _goToPrev() async {
    if (_hasUnsavedChanges(_selectedItem!)) {
      final discard = await _promptUnsavedChanges();
      if (!discard) return;
    }
    setState(() {
      _currentInspectionIndex--;
      _selectedItem = _selectedReceipt!['items'][_currentInspectionIndex];
      _selectedImagePath = null;
      _actualQtyController.clear();
      _aiErrorCountForCurrentItem = 0;
      final isChecked = _selectedItem!['status'] == 'CHECKED';
      if (isChecked) {
        _actualQtyController.text = _selectedItem!['actualQty'].toString();
      }
    });
  }

  void _goToNext() async {
    if (_hasUnsavedChanges(_selectedItem!)) {
      final discard = await _promptUnsavedChanges();
      if (!discard) return;
    }
    setState(() {
      _currentInspectionIndex++;
      _selectedItem = _selectedReceipt!['items'][_currentInspectionIndex];
      _selectedImagePath = null;
      _actualQtyController.clear();
      _aiErrorCountForCurrentItem = 0;
      final isChecked = _selectedItem!['status'] == 'CHECKED';
      if (isChecked) {
        _actualQtyController.text = _selectedItem!['actualQty'].toString();
      }
    });
  }

  void _skipCurrentItem() {
    setState(() {
      _selectedItem!['status'] = 'SKIPPED';
      // Auto advance
      final items = _selectedReceipt!['items'] as List;
      if (_currentInspectionIndex < items.length - 1) {
        _currentInspectionIndex++;
        _selectedItem = items[_currentInspectionIndex];
        _selectedImagePath = null;
        _actualQtyController.clear();
        _aiErrorCountForCurrentItem = 0;
        final isChecked = _selectedItem!['status'] == 'CHECKED';
        if (isChecked) {
          _actualQtyController.text = _selectedItem!['actualQty'].toString();
        }
      } else {
        // Last SKU reached, return to checklist
        _selectedItem = null;
        _selectedImagePath = null;
      }
    });
  }

  void _goToWorksheet() async {
    if (_selectedItem != null && _hasUnsavedChanges(_selectedItem!)) {
      final discard = await _promptUnsavedChanges();
      if (!discard) return;
    }
    setState(() {
      _selectedItem = null;
      _selectedImagePath = null;
    });
  }

  Widget _buildSimpleStatCard({
    required String title,
    required String value,
    required IconData icon,
    required Color color,
  }) {

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 6, offset: const Offset(0, 2))
        ],
        border: Border.all(color: Colors.grey.shade100),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(color: color.withValues(alpha: 0.1), shape: BoxShape.circle),
            child: Icon(icon, color: color, size: 20),
          ),
          const SizedBox(height: 12),
          Text(title, style: const TextStyle(fontSize: 10, color: Colors.grey, fontWeight: FontWeight.bold)),
          const SizedBox(height: 4),
          Text(value, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
        ],
      ),
    );
  }

  Future<void> _runTrace(String batchNo) async {
    if (batchNo.trim().isEmpty) return;
    setState(() {
      _isTracing = true;
      _traceResult = null;
      _traceError = null;
    });

    try {
      final res = await ApiService.traceLot(batchNo.trim());
      setState(() {
        _traceResult = res;
      });
    } catch (e) {
      setState(() {
        _traceError = 'Không thể truy xuất thông tin lô thuốc này.';
      });
    } finally {
      setState(() {
        _isTracing = false;
      });
    }
  }

  Future<void> _runForecast(int periodDays) async {
    setState(() {
      _isForecasting = true;
      _forecastResult = null;
      _forecastError = null;
    });

    try {
      final res = await ApiService.getAIForecast(periodDays);
      setState(() {
        _forecastResult = res;
      });
    } catch (e) {
      setState(() {
        _forecastError = 'Lỗi khi tải dự báo nhu cầu nhập hàng.';
      });
    } finally {
      setState(() {
        _isForecasting = false;
      });
    }
  }

  Widget _buildLotTrackingTab() {
    return SingleChildScrollView(
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Card(
            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            elevation: 2,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('Truy xuất mã lô thuốc', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _batchNoController,
                          decoration: InputDecoration(
                            hintText: 'Nhập mã lô thuốc (VD: INIT-BATCH)...',
                            filled: true,
                            fillColor: Colors.grey.shade50,
                            contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                          ),
                          onSubmitted: (val) => _runTrace(val),
                        ),
                      ),
                      const SizedBox(width: 8),
                      IconButton(
                        onPressed: () => _runTrace(_batchNoController.text),
                        icon: _isTracing 
                          ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                          : const Icon(Icons.search, color: Colors.white),
                        style: IconButton.styleFrom(
                          backgroundColor: const Color(0xFF00838F),
                          padding: const EdgeInsets.all(12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8,
                    runSpacing: 4,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      const Text('Mẫu:', style: TextStyle(fontSize: 12, color: Colors.grey, fontWeight: FontWeight.bold)),
                      ...['INIT-BATCH', 'LOT-2026-A', 'LOT-2026-B'].map((lot) => GestureDetector(
                        onTap: () {
                          _batchNoController.text = lot;
                          _runTrace(lot);
                        },
                        child: Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                          decoration: BoxDecoration(color: Colors.cyan.shade50, borderRadius: BorderRadius.circular(8), border: Border.all(color: Colors.cyan.shade200)),
                          child: Text(lot, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF006064))),
                        ),
                      )),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          if (_isTracing)
            const Center(
              child: Padding(
                padding: EdgeInsets.symmetric(vertical: 40.0),
                child: CircularProgressIndicator(color: Color(0xFF00838F)),
              ),
            )
          else if (_traceError != null)
            Center(
              child: Padding(
                padding: const EdgeInsets.symmetric(vertical: 40.0),
                child: Text(_traceError!, style: const TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
              ),
            )
          else if (_traceResult != null) ...[
            _buildTraceInfoCard(),
            const SizedBox(height: 16),
            _buildTraceOriginCard(),
            const SizedBox(height: 16),
            const Text('Hành Trình Lưu Uyển (Timeline)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF1E293B))),
            const SizedBox(height: 12),
            _buildTraceTimeline(),
          ],
        ],
      ),
    );
  }

  Widget _buildTraceInfoCard() {
    final med = _traceResult!['medicine'] ?? {};
    final batches = _traceResult!['batches'] as List? ?? [];
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(color: Colors.indigo.shade50, borderRadius: BorderRadius.circular(8)),
              child: const Text('Thông tin dược phẩm', style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Colors.indigo)),
            ),
            const SizedBox(height: 12),
            Text(med['name'] ?? 'Thuốc không tên', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18, color: Color(0xFF1E293B))),
            const SizedBox(height: 8),
            _buildDetailRow('Mã lô hàng', _traceResult!['batchNo'] ?? ''),
            _buildDetailRow('Phân nhóm', med['category'] ?? 'N/A'),
            _buildDetailRow('Đơn vị tính', med['unit'] ?? 'Hộp'),
            _buildDetailRow('Mã SKU', med['sku'] ?? 'N/A'),
            const Divider(height: 24),
            const Text('Tồn kho thực tế các chi nhánh', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Color(0xFF1E293B))),
            const SizedBox(height: 8),
            ...batches.map((b) {
              final isCentral = b['branchId'] == 'CENTRAL_WH';
              final isActive = b['status'] == 'ACTIVE';
              return Container(
                margin: const EdgeInsets.only(bottom: 8),
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(color: Colors.grey.shade50, borderRadius: BorderRadius.circular(10), border: Border.all(color: Colors.grey.shade200)),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(isCentral ? 'Kho Tổng Trung Tâm' : 'Chi nhánh ${b['branchId']}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                        const SizedBox(height: 2),
                        Text('Hạn dùng: ${b['expDate'].toString().substring(0, 10)}', style: const TextStyle(fontSize: 10, color: Colors.grey)),
                      ],
                    ),
                    Text('${b['stock']} ${med['unit'] ?? 'Hộp'}', style: TextStyle(fontWeight: FontWeight.bold, color: isActive ? Colors.indigo : Colors.red)),
                  ],
                ),
              );
            }),
          ],
        ),
      ),
    );
  }

  Widget _buildTraceOriginCard() {
    final origin = _traceResult!['origin'];
    if (origin == null) return const SizedBox.shrink();
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      elevation: 2,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
              decoration: BoxDecoration(color: Colors.green.shade50, borderRadius: BorderRadius.circular(8)),
              child: const Text('Nguồn gốc nhập hàng', style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Colors.green)),
            ),
            const SizedBox(height: 12),
            _buildDetailRow('Nhà cung cấp', origin['supplierName'] ?? 'Không rõ'),
            _buildDetailRow('Ngày nhập kho', origin['importDate'].toString().substring(0, 10)),
            _buildDetailRow('Số lượng nhập', '${origin['importQty']}'),
            _buildDetailRow('Đơn giá nhập', '${origin['importPrice']} ₫'),
            _buildDetailRow('Thủ kho nhận', origin['receivedBy'] ?? '—'),
            const Divider(height: 20),
            Text('Mã phiếu nhập (GRN): ${origin['grnId'].toString().substring(18).toUpperCase()}', style: const TextStyle(fontSize: 10, fontFamily: 'monospace')),
            Text('Mã đơn hàng (PO): ${origin['poId'].toString().substring(18).toUpperCase()}', style: const TextStyle(fontSize: 10, fontFamily: 'monospace')),
          ],
        ),
      ),
    );
  }

  Widget _buildTraceTimeline() {
    final timeline = _traceResult!['timeline'] as List? ?? [];
    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: timeline.length,
      itemBuilder: (context, idx) {
        final item = timeline[idx];
        final isPositive = item['quantityChange'] > 0;
        IconData icon = Icons.remove_circle;
        Color color = Colors.blue;
        String title = item['type'];
        if (item['type'] == 'GRN_IMPORT') {
          icon = Icons.add_circle;
          color = Colors.green;
          title = 'Nhập kho hàng loạt';
        } else if (item['type'] == 'SALE_EXPORT') {
          icon = Icons.shopping_basket;
          color = Colors.indigo;
          title = 'Bán hàng cho khách';
        } else if (item['type'] == 'TRANSFER') {
          icon = Icons.swap_horiz;
          color = Colors.amber;
          title = 'Chuyển kho nội bộ';
        } else if (item['type'] == 'DISPOSE') {
          icon = Icons.delete_forever;
          color = Colors.red;
          title = 'Tiêu hủy thuốc';
        }
        return Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Column(
              children: [
                Icon(icon, color: color, size: 24),
                if (idx < timeline.length - 1)
                  Container(width: 2, height: 60, color: Colors.grey.shade300),
              ],
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Container(
                margin: const EdgeInsets.only(bottom: 12),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.grey.shade200)),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(title, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                        Text(
                          isPositive ? '+${item['quantityChange']}' : '${item['quantityChange']}',
                          style: TextStyle(fontWeight: FontWeight.bold, color: isPositive ? Colors.green : Colors.red),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(item['notes'] ?? '', style: TextStyle(color: Colors.grey.shade600, fontSize: 11)),
                    const SizedBox(height: 8),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text('Tồn: ${item['stockBefore']} -> ${item['stockAfter']}', style: const TextStyle(fontSize: 10, color: Colors.grey)),
                        Text('Bởi: ${item['performedBy']}', style: const TextStyle(fontSize: 10, color: Colors.grey)),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        );
      },
    );
  }

  Widget _buildAIForecastTab() {
    return RefreshIndicator(
      onRefresh: () => _runForecast(_forecastPeriod),
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Phân tích nhu cầu kỳ tới:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                DropdownButton<int>(
                  value: _forecastPeriod,
                  items: const [
                    DropdownMenuItem(value: 7, child: Text('7 ngày')),
                    DropdownMenuItem(value: 30, child: Text('30 ngày')),
                    DropdownMenuItem(value: 90, child: Text('90 ngày')),
                  ],
                  onChanged: (val) {
                    if (val != null) {
                      setState(() {
                        _forecastPeriod = val;
                      });
                      _runForecast(val);
                    }
                  },
                ),
              ],
            ),
            const SizedBox(height: 12),
            if (_isForecasting)
              const Center(
                child: Padding(
                  padding: EdgeInsets.symmetric(vertical: 60.0),
                  child: Column(
                    children: [
                      CircularProgressIndicator(color: Color(0xFF00838F)),
                      SizedBox(height: 12),
                      Text('AI đang chạy mô hình dự báo...', style: TextStyle(color: Colors.grey, fontWeight: FontWeight.bold)),
                    ],
                  ),
                ),
              )
            else if (_forecastError != null)
              Center(
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 40.0),
                  child: Text(_forecastError!, style: const TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
                ),
              )
            else if (_forecastResult != null) ...[
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(colors: [Color(0xFF311B92), Color(0xFF00838F)]),
                  borderRadius: BorderRadius.circular(16),
                  boxShadow: [BoxShadow(color: Colors.deepPurple.withValues(alpha: 0.1), blurRadius: 10, offset: const Offset(0, 4))],
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Row(
                      children: [
                        Icon(Icons.auto_awesome, color: Colors.yellow, size: 18),
                        SizedBox(width: 8),
                        Text('TÓM TẮT DỰ BÁO AI (INSIGHTS)', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 11, letterSpacing: 1.0)),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Text(
                      _forecastResult!['summary'] ?? '',
                      style: const TextStyle(color: Colors.white70, fontSize: 13, height: 1.4),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),
              const Text('Đề xuất kế hoạch nhập kho', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF1E293B))),
              const SizedBox(height: 12),
              _buildForecastRecommendations(),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildForecastRecommendations() {
    final recs = _forecastResult!['recommendations'] as List? ?? [];
    if (recs.isEmpty) {
      return const Center(child: Padding(padding: EdgeInsets.all(20), child: Text('Không có đề xuất bổ sung nào.')));
    }
    return ListView.builder(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: recs.length,
      itemBuilder: (context, idx) {
        final r = recs[idx];
        final urgency = r['urgency'] ?? 'LOW';
        Color color = Colors.blue;
        if (urgency == 'HIGH') {
          color = Colors.red;
        } else if (urgency == 'MEDIUM') {
          color = Colors.orange;
        }
        
        return Card(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          elevation: 2,
          margin: const EdgeInsets.only(bottom: 12),
          child: Padding(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Expanded(
                      child: Text(r['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF1E293B))),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(color: color.withValues(alpha: 0.1), borderRadius: BorderRadius.circular(8)),
                      child: Text(
                        urgency == 'HIGH' ? 'Khẩn cấp' : urgency == 'MEDIUM' ? 'Cần nhập' : 'Thường',
                        style: TextStyle(color: color, fontSize: 9, fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(r['category'] ?? '', style: TextStyle(color: Colors.grey.shade500, fontSize: 11)),
                const Divider(height: 20),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    _buildMiniStat('Tồn kho', '${r['currentStock']}'),
                    _buildMiniStat('Bán/ngày', '${r['averageDailySales']}'),
                    _buildMiniStat('Đang về', '${r['expectedIncoming']}'),
                    _buildMiniStat('Khuyến nghị', '${r['suggestedOrderQty']}', highlight: r['suggestedOrderQty'] > 0),
                  ],
                ),
                if (r['reason'] != null) ...[
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(color: Colors.grey.shade50, borderRadius: BorderRadius.circular(10)),
                    child: Text(
                      r['reason'],
                      style: TextStyle(fontSize: 11, color: Colors.grey.shade700, height: 1.4),
                    ),
                  ),
                ],
                if (r['suggestedOrderQty'] > 0) ...[
                  const SizedBox(height: 12),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      ElevatedButton.icon(
                        onPressed: () {
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(
                              content: Text('Đã gửi yêu cầu PR cho ${r['name']} (${r['suggestedOrderQty']} ${r['unit']}) lên Admin!', style: const TextStyle(fontWeight: FontWeight.bold)),
                              backgroundColor: const Color(0xFF00838F),
                              behavior: SnackBarBehavior.floating,
                            ),
                          );
                        },
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF00838F),
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                        ),
                        icon: const Icon(Icons.add_shopping_cart, size: 14),
                        label: const Text('Lập PR nhanh', style: TextStyle(fontSize: 11)),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildMiniStat(String label, String value, {bool highlight = false}) {
    return Column(
      children: [
        Text(label, style: const TextStyle(fontSize: 9, color: Colors.grey)),
        const SizedBox(height: 4),
        Text(
          value,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.bold,
            color: highlight ? const Color(0xFF00838F) : const Color(0xFF1E293B),
          ),
        ),
      ],
    );
  }
}
