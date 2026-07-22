import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../widgets/notification_badge.dart';

class BranchScreen extends StatefulWidget {
  const BranchScreen({super.key});

  @override
  State<BranchScreen> createState() => _BranchScreenState();
}

class _BranchScreenState extends State<BranchScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  final List<Map<String, dynamic>> _staffs = [];
  final List<Map<String, dynamic>> _allLowStockAlerts = [];
  final List<Map<String, dynamic>> _lowStockAlerts = [];
  int _totalLowStockCount = 0;
  int _visibleLowStockLimit = 20;
  String _lowStockSearch = '';
  String _lowStockFilter = 'ALL';

  bool _isLoading = false;
  String _branchName = 'CƠ SỞ CHI NHÁNH BÁN LẺ';
  String _branchRevenue = '0 ₫';
  int _transactionCount = 0;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadBranchData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadBranchData() async {
    if (!mounted) return;
    setState(() => _isLoading = true);
    try {
      final employees = await ApiService.getEmployees();
      final lowStock = await ApiService.getLowStockReport();
      final branches = await ApiService.getBranches();
      final summary = await ApiService.getDashboardSummary();

      if (!mounted) return;

      setState(() {
        _staffs.clear();
        for (var emp in employees) {
          _staffs.add({
            'name': emp['fullName'] ?? emp['name'] ?? emp['username'] ?? 'Dược sĩ',
            'status': emp['status'] == 'BANNED' ? 'OFF' : 'ON_DUTY',
            'sales': '${emp['sales'] ?? '0'} ₫',
            'time': emp['shift'] ?? 'Ca trực hôm nay',
          });
        }

        _allLowStockAlerts.clear();
        _lowStockAlerts.clear();
        _totalLowStockCount = lowStock.length;
        for (var item in lowStock) {
          _allLowStockAlerts.add({
            'name': item['name'] ?? item['medicineName'] ?? 'Thuốc cảnh báo',
            'stock': item['stock'] ?? item['quantity'] ?? 0,
            'unit': item['unit'] ?? 'Hộp',
            'supplier': item['manufacturer'] ?? item['supplier'] ?? 'Nhà cung cấp Dược',
          });
        }
        _applyLowStockFilters(updateState: false);

        if (branches.isNotEmpty) {
          final firstBranch = branches.first;
          _branchName = (firstBranch['name'] ?? firstBranch['branchName'] ?? 'CƠ SỞ CHI NHÁNH BÁN LẺ').toString().toUpperCase();
        }

        final revData = summary?['data']?['revenue'] ?? summary?['revenue'];
        if (revData != null) {
          final netRev = revData['netRevenue'] ?? revData['totalRevenue'];
          final orders = revData['totalOrders'];
          if (netRev != null) {
            _branchRevenue = '$netRev ₫';
          }
          if (orders != null && orders is num) {
            _transactionCount = orders.toInt();
          }
        }
        _isLoading = false;
      });
    } catch (e) {
      debugPrint("Error loading branch data: $e");
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _applyLowStockFilters({bool updateState = true}) {
    final query = _lowStockSearch.trim().toLowerCase();
    final filtered = _allLowStockAlerts.where((item) {
      final stock = item['stock'] is num ? (item['stock'] as num).toInt() : int.tryParse(item['stock'].toString()) ?? 0;
      final matchesStatus = _lowStockFilter == 'ALL' ||
          (_lowStockFilter == 'OUT' && stock == 0) ||
          (_lowStockFilter == 'LOW' && stock > 0);
      final text = '${item['name']} ${item['supplier']} ${item['unit']}'.toLowerCase();
      return matchesStatus && (query.isEmpty || text.contains(query));
    }).take(_visibleLowStockLimit).toList();

    void assign() {
      _lowStockAlerts
        ..clear()
        ..addAll(filtered);
    }

    if (updateState && mounted) {
      setState(assign);
    } else {
      assign();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Quản Lý Cơ Sở', style: TextStyle(fontWeight: FontWeight.w900, color: Colors.white, fontSize: 18)),
            Text('CHI NHÁNH BÁN LẺ VÀ NHÂN SỰ CA TRỰC', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.white70, letterSpacing: 1.0)),
          ],
        ),
        flexibleSpace: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Color(0xFF2E7D32), Color(0xFF4CAF50)],
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
          indicatorColor: Colors.white,
          indicatorWeight: 3,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white60,
          labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
          tabs: const [
            Tab(icon: Icon(Icons.badge, size: 18), text: 'Ca Trực & Doanh Thu'),
            Tab(icon: Icon(Icons.warning_amber, size: 18), text: 'Cảnh Báo Thiếu Thuốc'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          // Tab 1: Revenue Card & Staff Roster
          SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (_isLoading) ...[
                  const LinearProgressIndicator(color: Color(0xFF2E7D32)),
                  const SizedBox(height: 12),
                ],
                // Branch Info Header (Premium Card design)
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    gradient: const LinearGradient(
                      colors: [Color(0xFF2E7D32), Color(0xFF81C784)],
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                    ),
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: [
                      BoxShadow(
                        color: const Color(0xFF2E7D32).withValues(alpha: 0.25),
                        blurRadius: 15,
                        offset: const Offset(0, 8),
                      )
                    ]
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(_branchName, style: const TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 1.0)),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(color: Colors.white.withValues(alpha: 0.2), borderRadius: BorderRadius.circular(8)),
                            child: const Text('ONLINE', style: TextStyle(color: Colors.white, fontSize: 9, fontWeight: FontWeight.bold)),
                          )
                        ],
                      ),
                      const SizedBox(height: 8),
                      const Text('Doanh Thu Hôm Nay', style: TextStyle(color: Colors.white, fontSize: 18, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 12),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Text(_branchRevenue, style: const TextStyle(color: Colors.white, fontSize: 26, fontWeight: FontWeight.w900)),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(12)),
                            child: Text(
                              '$_transactionCount hóa đơn',
                              style: const TextStyle(color: Color(0xFF2E7D32), fontSize: 12, fontWeight: FontWeight.bold),
                            ),
                          ),
                        ],
                      )
                    ],
                  ),
                ),
                const SizedBox(height: 24),

                // Staff roster / duty lists
                const Text(
                  'Nhân Sự Đang Trong Ca',
                  style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF1E293B)),
                ),
                const SizedBox(height: 12),
                Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    boxShadow: [
                      BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 10, offset: const Offset(0, 4))
                    ],
                    border: Border.all(color: Colors.grey.shade100),
                  ),
                  child: _staffs.isEmpty
                      ? const Padding(
                          padding: EdgeInsets.all(20),
                          child: Text('Chưa có nhân sự ca trực', textAlign: TextAlign.center, style: TextStyle(color: Colors.grey, fontWeight: FontWeight.bold)),
                        )
                      : ListView.separated(
                          shrinkWrap: true,
                          physics: const NeverScrollableScrollPhysics(),
                          itemCount: _staffs.length,
                          separatorBuilder: (context, index) => const Divider(height: 1, color: Color(0xFFF1F5F9)),
                          itemBuilder: (context, index) {
                            final staff = _staffs[index];
                            final isOnDuty = staff['status'] == 'ON_DUTY';
                            
                            return ListTile(
                              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                              leading: CircleAvatar(
                                backgroundColor: (isOnDuty ? const Color(0xFF2E7D32) : Colors.grey).withValues(alpha: 0.1),
                                child: Icon(Icons.person, color: isOnDuty ? const Color(0xFF2E7D32) : Colors.grey),
                              ),
                              title: Text(
                                staff['name']!,
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF1E293B)),
                              ),
                              subtitle: Text('${staff['time']} \nDoanh số: ${staff['sales']}', style: const TextStyle(fontSize: 12, height: 1.3)),
                              trailing: Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                decoration: BoxDecoration(
                                  color: isOnDuty ? Colors.green.shade50 : Colors.grey.shade100,
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  isOnDuty ? 'Đang trực' : 'Vắng mặt',
                                  style: TextStyle(
                                    color: isOnDuty ? Colors.green.shade700 : Colors.grey.shade600,
                                    fontWeight: FontWeight.bold,
                                    fontSize: 11,
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

          // Tab 2: Local low stock warnings
          SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                if (_isLoading) ...[
                  const LinearProgressIndicator(color: Color(0xFF2E7D32)),
                  const SizedBox(height: 12),
                ],
                Row(
                  children: [
                    const Expanded(
                      child: Text(
                        'Cảnh Báo Thiếu Thuốc Tại Cơ Sở',
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF1E293B)),
                      ),
                    ),
                    const SizedBox(width: 8),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(color: Colors.green.shade50, borderRadius: BorderRadius.circular(999)),
                      child: Text(
                        '$_totalLowStockCount mục',
                        style: const TextStyle(fontSize: 11, color: Color(0xFF2E7D32), fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                TextField(
                  onChanged: (value) {
                    _lowStockSearch = value;
                    _visibleLowStockLimit = 20;
                    _applyLowStockFilters();
                  },
                  decoration: InputDecoration(
                    hintText: 'Tìm thuốc, nhà cung cấp...',
                    isDense: true,
                    prefixIcon: const Icon(Icons.search, color: Color(0xFF2E7D32)),
                    filled: true,
                    fillColor: Colors.white,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: BorderSide(color: Colors.grey.shade200),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(14),
                      borderSide: BorderSide(color: Colors.grey.shade200),
                    ),
                  ),
                ),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    ChoiceChip(
                      label: const Text('Tất cả'),
                      selected: _lowStockFilter == 'ALL',
                      onSelected: (_) {
                        _lowStockFilter = 'ALL';
                        _visibleLowStockLimit = 20;
                        _applyLowStockFilters();
                      },
                    ),
                    ChoiceChip(
                      label: const Text('Hết hàng'),
                      selected: _lowStockFilter == 'OUT',
                      selectedColor: Colors.red.shade50,
                      onSelected: (_) {
                        _lowStockFilter = 'OUT';
                        _visibleLowStockLimit = 20;
                        _applyLowStockFilters();
                      },
                    ),
                    ChoiceChip(
                      label: const Text('Cận kho'),
                      selected: _lowStockFilter == 'LOW',
                      selectedColor: Colors.amber.shade50,
                      onSelected: (_) {
                        _lowStockFilter = 'LOW';
                        _visibleLowStockLimit = 20;
                        _applyLowStockFilters();
                      },
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                Text(
                  'Đang hiển thị ${_lowStockAlerts.length} mục phù hợp. Dữ liệu lớn được render theo trang để mobile nhẹ hơn.',
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.grey.shade600),
                ),
                const SizedBox(height: 12),
                _lowStockAlerts.isEmpty
                    ? Container(
                        padding: const EdgeInsets.all(20),
                        alignment: Alignment.center,
                        decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: Colors.grey.shade200)),
                        child: const Text('Tồn kho chi nhánh ổn định', style: TextStyle(color: Colors.grey, fontWeight: FontWeight.bold)),
                      )
                    : ListView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: _lowStockAlerts.length,
                        itemBuilder: (context, index) {
                          final alert = _lowStockAlerts[index];
                          final isOut = alert['stock'] == 0;

                          return Card(
                            color: Colors.white,
                            margin: const EdgeInsets.only(bottom: 12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20), side: BorderSide(color: Colors.grey.shade100)),
                            elevation: 1,
                            child: Padding(
                              padding: const EdgeInsets.all(16.0),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    children: [
                                      Expanded(
                                        child: Text(
                                          alert['name']!,
                                          maxLines: 2,
                                          overflow: TextOverflow.ellipsis,
                                          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF1E293B)),
                                        ),
                                      ),
                                      const SizedBox(width: 8),
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                        decoration: BoxDecoration(
                                          color: isOut ? Colors.red.shade50 : Colors.amber.shade50,
                                          borderRadius: BorderRadius.circular(8),
                                        ),
                                        child: Text(
                                          isOut ? 'Hết hàng' : 'Cận kho',
                                          style: TextStyle(
                                            color: isOut ? Colors.red.shade700 : Colors.amber.shade900,
                                            fontSize: 9,
                                            fontWeight: FontWeight.bold,
                                          ),
                                        ),
                                      )
                                    ],
                                  ),
                                  const SizedBox(height: 8),
                                  Text('Tồn kho hiện tại: ${alert['stock']} ${alert['unit']}', style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
                                  Text('Nhà cung cấp: ${alert['supplier']}', style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
                                  const SizedBox(height: 12),
                                  Row(
                                    children: [
                                      const Spacer(),
                                      Flexible(
                                        flex: 0,
                                        child: ElevatedButton.icon(
                                          onPressed: () async {
                                          ScaffoldMessenger.of(context).showSnackBar(
                                            const SnackBar(
                                              content: Text('Đang gửi yêu cầu nhập hàng PR lên Ban Quản Lý...', style: TextStyle(fontWeight: FontWeight.bold)),
                                              backgroundColor: Color(0xFF2E7D32),
                                              behavior: SnackBarBehavior.floating,
                                            ),
                                          );

                                          await ApiService.createPurchaseRequisition({
                                            'branchName': _branchName,
                                            'reason': 'Cấp bách: Thuốc ${alert['name']} đã hết/sắp hết kho',
                                            'items': [
                                              {'medicineName': alert['name'], 'qty': 100}
                                            ]
                                          });

                                          if (context.mounted) {
                                            ScaffoldMessenger.of(context).showSnackBar(
                                              SnackBar(
                                                content: Text('Đã gửi thành công phiếu yêu cầu cấp hàng ${alert['name']}', style: const TextStyle(fontWeight: FontWeight.bold)),
                                                backgroundColor: Colors.green,
                                                behavior: SnackBarBehavior.floating,
                                              ),
                                            );
                                          }
                                          },
                                          style: ElevatedButton.styleFrom(
                                            backgroundColor: const Color(0xFF2E7D32),
                                            foregroundColor: Colors.white,
                                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                          ),
                                          icon: const Icon(Icons.send, size: 14),
                                          label: const Text(
                                            'Gửi yêu cầu cấp hàng',
                                            maxLines: 1,
                                            overflow: TextOverflow.ellipsis,
                                            style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
                                          ),
                                        ),
                                      )
                                    ],
                                  )
                                ],
                              ),
                            ),
                          );
                        },
                      ),
                if (_lowStockAlerts.length < _allLowStockAlerts.where((item) {
                  final stock = item['stock'] is num ? (item['stock'] as num).toInt() : int.tryParse(item['stock'].toString()) ?? 0;
                  final matchesStatus = _lowStockFilter == 'ALL' ||
                      (_lowStockFilter == 'OUT' && stock == 0) ||
                      (_lowStockFilter == 'LOW' && stock > 0);
                  final text = '${item['name']} ${item['supplier']} ${item['unit']}'.toLowerCase();
                  final query = _lowStockSearch.trim().toLowerCase();
                  return matchesStatus && (query.isEmpty || text.contains(query));
                }).length) ...[
                  const SizedBox(height: 8),
                  OutlinedButton.icon(
                    onPressed: () {
                      _visibleLowStockLimit += 20;
                      _applyLowStockFilters();
                    },
                    icon: const Icon(Icons.expand_more),
                    label: const Text('Tải thêm 20 mục'),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}
