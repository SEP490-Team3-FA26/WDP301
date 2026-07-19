import 'package:flutter/material.dart';
import '../services/api_service.dart';

class AdminScreen extends StatefulWidget {
  const AdminScreen({super.key});

  @override
  State<AdminScreen> createState() => _AdminScreenState();
}

class _AdminScreenState extends State<AdminScreen> {
  final List<Map<String, dynamic>> _services = [
    {
      'name': 'auth-service',
      'status': 'ACTIVE',
      'port': '4001',
      'load': '1.2%',
    },
    {
      'name': 'user-service',
      'status': 'ACTIVE',
      'port': '4002',
      'load': '0.8%',
    },
    {
      'name': 'inventory-service',
      'status': 'ACTIVE',
      'port': '4003',
      'load': '2.4%',
    },
    {
      'name': 'supplier-service',
      'status': 'ACTIVE',
      'port': '4004',
      'load': '0.3%',
    },
    {'name': 'ai-service', 'status': 'ACTIVE', 'port': '8000', 'load': '12.6%'},
  ];

  final List<Map<String, String>> _recentRegistrations = [
    {
      'name': 'Trần Văn Hoàng',
      'email': 'hoangtv@ABC pharmacy.com',
      'role': 'Dược sĩ',
      'date': '12/06/2026',
    },
    {
      'name': 'Lê Thị Mai',
      'email': 'mailt@ABC pharmacy.com',
      'role': 'Thủ kho',
      'date': '11/06/2026',
    },
    {
      'name': 'Nguyễn Hoàng Nam',
      'email': 'namnh@ABC pharmacy.com',
      'role': 'Quản lý cơ sở',
      'date': '10/06/2026',
    },
  ];

  @override
  void initState() {
    super.initState();
    _checkHealth();
  }

  Future<void> _checkHealth() async {
    try {
      final healthList = await ApiService.getServiceHealth();
      if (mounted) {
        setState(() {
          for (int i = 0; i < _services.length && i < healthList.length; i++) {
            _services[i]['status'] = healthList[i]['status'];
          }
        });
      }
    } catch (e) {
      debugPrint("Error checking health: $e");
    }
  }

  void _toggleService(int index) {
    setState(() {
      final current = _services[index]['status'];
      _services[index]['status'] = current == 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
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
            Text(
              'Admin Dashboard',
              style: TextStyle(
                fontWeight: FontWeight.w900,
                color: Colors.white,
                fontSize: 18,
              ),
            ),
            Text(
              'GIÁM SÁT MICROSERVICES & TÀI KHOẢN HỆ THỐNG',
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
              colors: [Color(0xFF1E1E2C), Color(0xFF2C2C3E)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
        ),
        elevation: 4,
        iconTheme: const IconThemeData(color: Colors.white),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.white),
            onPressed: () {
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text(
                    'Đang làm mới dữ liệu hệ thống...',
                    style: TextStyle(fontWeight: FontWeight.bold),
                  ),
                  backgroundColor: Color(0xFF2C2C3E),
                  behavior: SnackBarBehavior.floating,
                ),
              );
            },
          ),
        ],
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // System health header
              const Text(
                'Sức Khỏe Hệ Thống',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF1E1E2C),
                ),
              ),
              const SizedBox(height: 12),

              // Performance Cards Row
              Row(
                children: [
                  Expanded(
                    child: _buildMetricCard(
                      icon: Icons.speed,
                      title: 'API Gateway',
                      value: '234 req/s',
                      color: Colors.blue,
                      subtext: 'Trạng thái: Ổn định',
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _buildMetricCard(
                      icon: Icons.storage,
                      title: 'CPU Load',
                      value: '14.8%',
                      color: Colors.indigo,
                      subtext: 'Mạng: 12.3 MB/s',
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: _buildMetricCard(
                      icon: Icons.memory,
                      title: 'Dung lượng RAM',
                      value: '6.2 GB / 16 GB',
                      color: Colors.amber,
                      subtext: 'Còn lại: 61%',
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _buildMetricCard(
                      icon: Icons.people,
                      title: 'Active Sessions',
                      value: '145',
                      color: Colors.teal,
                      subtext: 'Hoạt động liên tục',
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // AI & Trace Actions
              const Text(
                'Công Cụ Quản Trị Cao Cấp',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF1E1E2C),
                ),
              ),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(
                    child: InkWell(
                      onTap: () => _showAIForecastSheet(context),
                      borderRadius: BorderRadius.circular(16),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: Colors.grey.shade200),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.02),
                              blurRadius: 6,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: const Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.auto_awesome, color: Colors.purple, size: 24),
                            SizedBox(height: 8),
                            Text('Dự báo nhu cầu AI', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                          ],
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: InkWell(
                      onTap: () => _showLotTrackingSheet(context),
                      borderRadius: BorderRadius.circular(16),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 16),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(color: Colors.grey.shade200),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.black.withValues(alpha: 0.02),
                              blurRadius: 6,
                              offset: const Offset(0, 2),
                            ),
                          ],
                        ),
                        child: const Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.history, color: Colors.indigo, size: 24),
                            SizedBox(height: 8),
                            Text('Truy xuất lô thuốc', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 24),

              // Microservices status list
              const Text(
                'Quản Lý Các Microservices',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF1E1E2C),
                ),
              ),
              const SizedBox(height: 12),
              Container(
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.03),
                      blurRadius: 10,
                      offset: const Offset(0, 4),
                    ),
                  ],
                  border: Border.all(color: Colors.grey.shade100),
                ),
                child: ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: _services.length,
                  separatorBuilder: (context, index) =>
                      const Divider(height: 1, color: Color(0xFFF1F5F9)),
                  itemBuilder: (context, index) {
                    final svc = _services[index];
                    final isActive = svc['status'] == 'ACTIVE';

                    return ListTile(
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 8,
                      ),
                      title: Text(
                        svc['name'],
                        style: const TextStyle(
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                          color: Color(0xFF1E1E2C),
                        ),
                      ),
                      subtitle: Text(
                        'Port: ${svc['port']}  •  CPU: ${svc['load']}',
                        style: const TextStyle(fontSize: 12),
                      ),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 8,
                              vertical: 4,
                            ),
                            decoration: BoxDecoration(
                              color: isActive
                                  ? Colors.green.shade50
                                  : Colors.red.shade50,
                              borderRadius: BorderRadius.circular(8),
                            ),
                            child: Text(
                              svc['status'],
                              style: TextStyle(
                                color: isActive ? Colors.green : Colors.red,
                                fontWeight: FontWeight.bold,
                                fontSize: 10,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          Switch(
                            value: isActive,
                            onChanged: (val) => _toggleService(index),
                            activeThumbColor: Colors.white,
                            activeTrackColor: Colors.green,
                            inactiveThumbColor: Colors.white,
                            inactiveTrackColor: Colors.grey.shade300,
                          ),
                        ],
                      ),
                    );
                  },
                ),
              ),
              const SizedBox(height: 24),

              // Registrations Pending Approval
              const Text(
                'Phê Duyệt Tài Khoản Đăng Ký',
                style: TextStyle(
                  fontSize: 15,
                  fontWeight: FontWeight.bold,
                  color: Color(0xFF1E1E2C),
                ),
              ),
              const SizedBox(height: 12),
              ListView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: _recentRegistrations.length,
                itemBuilder: (context, index) {
                  final reg = _recentRegistrations[index];
                  return Card(
                    color: Colors.white,
                    margin: const EdgeInsets.only(bottom: 12),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(20),
                      side: BorderSide(color: Colors.grey.shade100),
                    ),
                    elevation: 1,
                    child: Padding(
                      padding: const EdgeInsets.all(16.0),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(
                                reg['name']!,
                                style: const TextStyle(
                                  fontWeight: FontWeight.bold,
                                  fontSize: 15,
                                  color: Color(0xFF1E1E2C),
                                ),
                              ),
                              Text(
                                reg['date']!,
                                style: const TextStyle(
                                  color: Colors.grey,
                                  fontSize: 11,
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Text(
                            'Email: ${reg['email']}',
                            style: TextStyle(
                              color: Colors.grey.shade600,
                              fontSize: 13,
                            ),
                          ),
                          const SizedBox(height: 8),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Chip(
                                label: Text(
                                  reg['role']!,
                                  style: const TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                    color: Color(0xFF1E1E2C),
                                  ),
                                ),
                                backgroundColor: const Color(0xFFF1F5F9),
                                side: BorderSide.none,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(8),
                                ),
                              ),
                              Row(
                                children: [
                                  TextButton(
                                    onPressed: () {
                                      setState(() {
                                        _recentRegistrations.removeAt(index);
                                      });
                                      ScaffoldMessenger.of(
                                        context,
                                      ).showSnackBar(
                                        const SnackBar(
                                          content: Text(
                                            'Từ chối phê duyệt tài khoản.',
                                            style: TextStyle(
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                          backgroundColor: Colors.red,
                                          behavior: SnackBarBehavior.floating,
                                        ),
                                      );
                                    },
                                    child: const Text(
                                      'Từ chối',
                                      style: TextStyle(
                                        color: Colors.red,
                                        fontWeight: FontWeight.bold,
                                        fontSize: 12,
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  ElevatedButton(
                                    onPressed: () {
                                      setState(() {
                                        _recentRegistrations.removeAt(index);
                                      });
                                      ScaffoldMessenger.of(
                                        context,
                                      ).showSnackBar(
                                        const SnackBar(
                                          content: Text(
                                            'Phê duyệt tài khoản thành công!',
                                            style: TextStyle(
                                              fontWeight: FontWeight.bold,
                                            ),
                                          ),
                                          backgroundColor: Colors.green,
                                          behavior: SnackBarBehavior.floating,
                                        ),
                                      );
                                    },
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: const Color(0xFF1E1E2C),
                                      foregroundColor: Colors.white,
                                      shape: RoundedRectangleBorder(
                                        borderRadius: BorderRadius.circular(8),
                                      ),
                                    ),
                                    child: const Text(
                                      'Duyệt',
                                      style: TextStyle(
                                        fontWeight: FontWeight.bold,
                                        fontSize: 12,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ],
                      ),
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

  Widget _buildMetricCard({
    required IconData icon,
    required String title,
    required String value,
    required Color color,
    required String subtext,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.02),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
        border: Border.all(color: Colors.grey.shade100),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: color.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: Icon(icon, color: color, size: 20),
              ),
            ],
          ),
          const SizedBox(height: 14),
          Text(
            title,
            style: const TextStyle(
              fontSize: 10,
              color: Colors.grey,
              fontWeight: FontWeight.bold,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: Color(0xFF1E1E2C),
            ),
          ),
          const SizedBox(height: 4),
          Text(
            subtext,
            style: const TextStyle(
              fontSize: 10,
              color: Colors.green,
              fontWeight: FontWeight.bold,
            ),
          ),
        ],
      ),
    );
  }

  void _showAIForecastSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        int period = 30;
        bool loading = false;
        Map<String, dynamic>? result;
        String? error;

        return StatefulBuilder(
          builder: (context, setSheetState) {
            Future<void> fetchForecast() async {
              setSheetState(() {
                loading = true;
                result = null;
                error = null;
              });
              try {
                final res = await ApiService.getAIForecast(period);
                setSheetState(() {
                  result = res;
                });
              } catch (e) {
                setSheetState(() {
                  error = 'Không thể tải dự báo từ AI Service.';
                });
              } finally {
                setSheetState(() {
                  loading = false;
                });
              }
            }

            if (result == null && !loading && error == null) {
              fetchForecast();
            }

            return Container(
              height: MediaQuery.of(context).size.height * 0.85,
              decoration: const BoxDecoration(
                color: Color(0xFFF8FAFC),
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              ),
              child: Column(
                children: [
                  Container(
                    margin: const EdgeInsets.symmetric(vertical: 12),
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)),
                  ),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Row(
                          children: [
                            Icon(Icons.auto_awesome, color: Colors.purple, size: 20),
                            SizedBox(width: 8),
                            Text('Dự báo nhu cầu AI', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                          ],
                        ),
                        DropdownButton<int>(
                          value: period,
                          items: const [
                            DropdownMenuItem(value: 7, child: Text('7 ngày')),
                            DropdownMenuItem(value: 30, child: Text('30 ngày')),
                            DropdownMenuItem(value: 90, child: Text('90 ngày')),
                          ],
                          onChanged: (val) {
                            if (val != null) {
                              setSheetState(() {
                                period = val;
                              });
                              fetchForecast();
                            }
                          },
                        ),
                      ],
                    ),
                  ),
                  const Divider(),
                  Expanded(
                    child: loading
                        ? const Center(child: CircularProgressIndicator(color: Colors.purple))
                        : error != null
                            ? Center(child: Text(error!, style: const TextStyle(color: Colors.red)))
                            : result == null
                                ? const Center(child: Text('Đang phân tích...'))
                                : SingleChildScrollView(
                                    padding: const EdgeInsets.all(16),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.stretch,
                                      children: [
                                        Container(
                                          padding: const EdgeInsets.all(16),
                                          decoration: BoxDecoration(
                                            gradient: const LinearGradient(colors: [Color(0xFF311B92), Color(0xFF1E1E2C)]),
                                            borderRadius: BorderRadius.circular(16),
                                          ),
                                          child: Text(
                                            result!['summary'] ?? '',
                                            style: const TextStyle(color: Colors.white70, fontSize: 13, height: 1.4),
                                          ),
                                        ),
                                        const SizedBox(height: 20),
                                        const Text('Danh sách đề xuất nhập hàng', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                                        const SizedBox(height: 12),
                                        ...((result!['recommendations'] as List? ?? []).map((r) {
                                          final urgency = r['urgency'] ?? 'LOW';
                                          Color uColor = Colors.blue;
                                          if (urgency == 'HIGH') uColor = Colors.red;
                                          else if (urgency == 'MEDIUM') uColor = Colors.orange;

                                          return Card(
                                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                                            margin: const EdgeInsets.only(bottom: 12),
                                            child: Padding(
                                              padding: const EdgeInsets.all(16),
                                              child: Column(
                                                crossAxisAlignment: CrossAxisAlignment.start,
                                                children: [
                                                  Row(
                                                    mainAxisAlignment: MainAxisAlignment.between,
                                                    children: [
                                                      Text(r['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                                                      Container(
                                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                                        decoration: BoxDecoration(color: uColor.withOpacity(0.1), borderRadius: BorderRadius.circular(6)),
                                                        child: Text(urgency, style: TextStyle(color: uColor, fontSize: 8, fontWeight: FontWeight.bold)),
                                                      ),
                                                    ],
                                                  ),
                                                  const SizedBox(height: 4),
                                                  Text(r['category'] ?? '', style: const TextStyle(fontSize: 11, color: Colors.grey)),
                                                  const Divider(height: 16),
                                                  Row(
                                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                                    children: [
                                                      _buildMiniStatSheet(r, 'Tồn', '${r['currentStock']}'),
                                                      _buildMiniStatSheet(r, 'Bán/ngày', '${r['averageDailySales']}'),
                                                      _buildMiniStatSheet(r, 'Đề xuất', '${r['suggestedOrderQty']}', highlight: r['suggestedOrderQty'] > 0),
                                                    ],
                                                  ),
                                                  if (r['reason'] != null) ...[
                                                    const SizedBox(height: 10),
                                                    Text(r['reason'], style: TextStyle(fontSize: 11, color: Colors.grey.shade600, height: 1.4)),
                                                  ],
                                                ],
                                              ),
                                            ),
                                          );
                                        })),
                                      ],
                                    ),
                                  ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  void _showLotTrackingSheet(BuildContext context) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        final controller = TextEditingController();
        bool loading = false;
        Map<String, dynamic>? result;
        String? error;

        return StatefulBuilder(
          builder: (context, setSheetState) {
            Future<void> runTrace() async {
              if (controller.text.trim().isEmpty) return;
              setSheetState(() {
                loading = true;
                result = null;
                error = null;
              });
              try {
                final res = await ApiService.traceLot(controller.text.trim());
                setSheetState(() {
                  result = res;
                });
              } catch (e) {
                setSheetState(() {
                  error = 'Không thể truy xuất mã lô này.';
                });
              } finally {
                setSheetState(() {
                  loading = false;
                });
              }
            }

            return Container(
              height: MediaQuery.of(context).size.height * 0.85,
              decoration: const BoxDecoration(
                color: Color(0xFFF8FAFC),
                borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
              ),
              child: Column(
                children: [
                  Container(
                    margin: const EdgeInsets.symmetric(vertical: 12),
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)),
                  ),
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                    child: Row(
                      children: [
                        Icon(Icons.history, color: Colors.indigo, size: 20),
                        SizedBox(width: 8),
                        Text('Truy xuất nguồn gốc lô thuốc', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                      ],
                    ),
                  ),
                  const Divider(),
                  Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    child: Row(
                      children: [
                        Expanded(
                          child: TextField(
                            controller: controller,
                            decoration: InputDecoration(
                              hintText: 'Nhập mã lô (VD: INIT-BATCH)...',
                              filled: true,
                              fillColor: Colors.grey.shade100,
                              contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: BorderSide.none),
                            ),
                            onSubmitted: (_) => runTrace(),
                          ),
                        ),
                        const SizedBox(width: 8),
                        IconButton(
                          onPressed: runTrace,
                          icon: loading 
                            ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                            : const Icon(Icons.search, color: Colors.white),
                          style: IconButton.styleFrom(
                            backgroundColor: Colors.indigo,
                            padding: const EdgeInsets.all(12),
                            shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                        ),
                      ],
                    ),
                  ),
                  Expanded(
                    child: loading
                      ? const Center(child: CircularProgressIndicator(color: Colors.indigo))
                      : error != null
                        ? Center(child: Text(error!, style: const TextStyle(color: Colors.red)))
                        : result == null
                          ? const Center(child: Text('Nhập mã lô thuốc và ấn Tìm kiếm để truy xuất nguồn gốc.'))
                          : SingleChildScrollView(
                              padding: const EdgeInsets.all(16),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.stretch,
                                children: [
                                  Card(
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                                    child: Padding(
                                      padding: const EdgeInsets.all(16),
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(result!['medicine']?['name'] ?? 'Không rõ', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                                          const SizedBox(height: 8),
                                          _buildDetailRowSheet('Mã lô', result!['batchNo'] ?? ''),
                                          _buildDetailRowSheet('SKU', result!['medicine']?['sku'] ?? 'N/A'),
                                        ],
                                      ),
                                    ),
                                  ),
                                  const SizedBox(height: 12),
                                  if (result!['origin'] != null) ...[
                                    Card(
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                                      child: Padding(
                                        padding: const EdgeInsets.all(16),
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            const Text('Nguồn gốc nhập khẩu', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.green)),
                                            const SizedBox(height: 8),
                                            _buildDetailRowSheet('Nhà cung cấp', result!['origin']['supplierName'] ?? ''),
                                            _buildDetailRowSheet('Ngày nhập', result!['origin']['importDate']?.toString().substring(0, 10) ?? ''),
                                            _buildDetailRowSheet('SL nhập', '${result!['origin']['importQty'] ?? 0}'),
                                          ],
                                        ),
                                      ),
                                    ),
                                    const SizedBox(height: 12),
                                  ],
                                  const Text('Lịch sử biến động', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                                  const SizedBox(height: 12),
                                  ...((result!['timeline'] as List? ?? []).map((t) {
                                    return Card(
                                      margin: const EdgeInsets.only(bottom: 8),
                                      child: ListTile(
                                        leading: const Icon(Icons.info_outline, color: Colors.indigo),
                                        title: Text(t['notes'] ?? t['type']),
                                        subtitle: Text('Bởi: ${t['performedBy']} | Thay đổi: ${t['quantityChange']}'),
                                      ),
                                    );
                                  })),
                                ],
                              ),
                            ),
                  ),
                ],
              ),
            );
          },
        );
      },
    );
  }

  Widget _buildMiniStatSheet(Map<String, dynamic> r, String label, String value, {bool highlight = false}) {
    return Column(
      children: [
        Text(label, style: const TextStyle(fontSize: 9, color: Colors.grey)),
        const SizedBox(height: 2),
        Text(value, style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: highlight ? Colors.purple : Colors.black)),
      ],
    );
  }

  Widget _buildDetailRowSheet(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Colors.grey, fontSize: 12)),
          Text(value, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
        ],
      ),
    );
  }
}
