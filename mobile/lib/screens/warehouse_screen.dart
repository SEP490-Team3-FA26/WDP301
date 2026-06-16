import 'dart:async';
import 'package:flutter/material.dart';
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

  // DB Pagination State
  final List<Map<String, dynamic>> _medicines = [];
  int _currentPage = 1;
  bool _isLoading = false;
  bool _hasMore = true;
  final ScrollController _scrollController = ScrollController();
  String _searchQuery = '';
  Timer? _debounceTimer;

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
    _tabController = TabController(length: 2, vsync: this);
    
    _scrollController.addListener(() {
      if (_scrollController.position.pixels >= _scrollController.position.maxScrollExtent - 200) {
        _loadMedicines();
      }
    });

    _loadMedicines(reset: true);
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
          tabs: const [
            Tab(text: 'Tồn Kho'),
            Tab(text: 'Báo Cáo Hết Hạn'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _buildInventoryTab(),
          _buildExpirationReportTab(),
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
}
