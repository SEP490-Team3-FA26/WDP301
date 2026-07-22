import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../widgets/notification_badge.dart';

class AdminScreen extends StatefulWidget {
  const AdminScreen({super.key});

  @override
  State<AdminScreen> createState() => _AdminScreenState();
}

class _AdminScreenState extends State<AdminScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;

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

  bool _isLoadingEmployees = false;
  List<Map<String, dynamic>> _employees = [];
  bool _isLoadingAuditLogs = false;
  List<Map<String, dynamic>> _auditLogs = [];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _checkHealth();
    _loadEmployees();
    _loadAuditLogs();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadAuditLogs() async {
    if (!mounted) return;
    setState(() => _isLoadingAuditLogs = true);
    try {
      final logs = await ApiService.getAuditLogs();
      if (mounted) {
        setState(() {
          _auditLogs = List<Map<String, dynamic>>.from(logs);
          _isLoadingAuditLogs = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoadingAuditLogs = false);
    }
  }

  Future<void> _loadEmployees() async {
    if (!mounted) return;
    setState(() => _isLoadingEmployees = true);
    try {
      final list = await ApiService.getEmployees();
      if (mounted) {
        setState(() {
          _employees = List<Map<String, dynamic>>.from(list);
          _isLoadingEmployees = false;
        });
      }
    } catch (e) {
      if (mounted) setState(() => _isLoadingEmployees = false);
    }
  }

  Future<void> _toggleBan(String id, int index) async {
    final success = await ApiService.toggleBanEmployee(id);
    if (success && mounted) {
      setState(() {
        final currentStatus = _employees[index]['status'] ?? 'ACTIVE';
        _employees[index]['status'] = currentStatus == 'ACTIVE' ? 'BANNED' : 'ACTIVE';
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Đã cập nhật trạng thái tài khoản thành công!'),
          backgroundColor: Colors.green,
        ),
      );
    }
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

  void _showCreateEmployeeModal() {
    final nameCtrl = TextEditingController();
    final emailCtrl = TextEditingController();
    final phoneCtrl = TextEditingController();
    String selectedRole = 'pharmacist';

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('Tạo Tài Khoản Nhân Viên', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(controller: nameCtrl, decoration: const InputDecoration(labelText: 'Họ và tên nhân viên')),
              TextField(controller: emailCtrl, decoration: const InputDecoration(labelText: 'Email đăng nhập')),
              TextField(controller: phoneCtrl, decoration: const InputDecoration(labelText: 'Số điện thoại')),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                initialValue: selectedRole,
                decoration: const InputDecoration(labelText: 'Chức vụ / Role'),
                items: const [
                  DropdownMenuItem(value: 'pharmacist', child: Text('Dược sĩ bán hàng')),
                  DropdownMenuItem(value: 'warehouse', child: Text('Quản lý kho')),
                  DropdownMenuItem(value: 'branch', child: Text('Quản lý chi nhánh')),
                  DropdownMenuItem(value: 'head_branch', child: Text('Giám đốc chi nhánh')),
                ],
                onChanged: (val) => selectedRole = val ?? 'pharmacist',
              ),
            ],
          ),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Hủy')),
          ElevatedButton(
            onPressed: () {
              if (nameCtrl.text.trim().isNotEmpty) {
                setState(() {
                  _employees.insert(0, {
                    'fullName': nameCtrl.text.trim(),
                    'email': emailCtrl.text.trim().isNotEmpty ? emailCtrl.text.trim() : 'staff@vinapharmacy.com',
                    'phone': phoneCtrl.text.trim().isNotEmpty ? phoneCtrl.text.trim() : '0909123456',
                    'role': selectedRole,
                    'status': 'ACTIVE',
                  });
                });
                Navigator.pop(context);
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text('Đã khởi tạo tài khoản cho ${nameCtrl.text.trim()} thành công!'), backgroundColor: Colors.green),
                );
              }
            },
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF1E1E2C), foregroundColor: Colors.white),
            child: const Text('Tạo tài khoản'),
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
          const NotificationBadge(iconColor: Colors.white),
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.white),
            onPressed: () {
              _checkHealth();
              _loadEmployees();
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
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.white,
          indicatorWeight: 3,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white60,
          labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
          tabs: const [
            Tab(icon: Icon(Icons.dns, size: 18), text: 'System Health'),
            Tab(icon: Icon(Icons.people, size: 18), text: 'Nhân Viên'),
            Tab(icon: Icon(Icons.history_toggle_off, size: 18), text: 'Audit Logs'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          // Tab 1: System Health
          SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                const Text(
                  'Sức Khỏe Hệ Thống',
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
                const Text(
                  'Danh Sách Microservices Backend',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF1E1E2C),
                  ),
                ),
                const SizedBox(height: 12),
                ..._services.map((s) => _buildServiceCard(s)),
              ],
            ),
          ),

          // Tab 2: Quản Lý Nhân Viên
          SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                ElevatedButton.icon(
                  onPressed: _showCreateEmployeeModal,
                  icon: const Icon(Icons.person_add, size: 18),
                  label: const Text('Thêm Nhân Viên Mới', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF1E1E2C),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                ),
                const SizedBox(height: 16),
                const Text(
                  'Danh Sách Tài Khoản Nhân Viên',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF1E1E2C),
                  ),
                ),
                const SizedBox(height: 12),
                _isLoadingEmployees
                    ? const Center(child: CircularProgressIndicator())
                    : ListView.builder(
                        shrinkWrap: true,
                        physics: const NeverScrollableScrollPhysics(),
                        itemCount: _employees.length,
                        itemBuilder: (context, index) {
                          final emp = _employees[index];
                          final isBanned = emp['status'] == 'BANNED';
                          final empId = emp['id'] ?? emp['_id'] ?? '';
                          final empName = emp['fullName'] ?? emp['name'] ?? emp['username'] ?? 'Nhân viên';
                          final empRole = (emp['role'] ?? 'Dược sĩ').toString().toUpperCase();
                          final empEmail = emp['email'] ?? 'staff@vinapharmacy.com';

                          return Card(
                            color: Colors.white,
                            margin: const EdgeInsets.only(bottom: 12),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(16),
                              side: BorderSide(color: Colors.grey.shade200),
                            ),
                            elevation: 1,
                            child: ListTile(
                              leading: CircleAvatar(
                                backgroundColor: isBanned ? Colors.red.shade50 : Colors.blue.shade50,
                                child: Icon(
                                  isBanned ? Icons.block : Icons.person,
                                  color: isBanned ? Colors.red : Colors.blue,
                                ),
                              ),
                              title: Text(empName, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                              subtitle: Text('$empEmail\nChức vụ: $empRole', maxLines: 2, overflow: TextOverflow.ellipsis, style: const TextStyle(fontSize: 12, height: 1.3)),
                              isThreeLine: true,
                              trailing: ElevatedButton(
                                onPressed: empId.isEmpty ? null : () => _toggleBan(empId, index),
                                style: ElevatedButton.styleFrom(
                                  backgroundColor: isBanned ? Colors.green : Colors.red.shade700,
                                  foregroundColor: Colors.white,
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                ),
                                child: FittedBox(
                                  fit: BoxFit.scaleDown,
                                  child: Text(
                                    isBanned ? 'Mở Khóa' : 'Khóa Acc',
                                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                                  ),
                                ),
                              ),
                            ),
                          );
                        },
                      ),
              ],
            ),
          ),

          // Tab 3: Nhật Ký Audit Logs
          SingleChildScrollView(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                OutlinedButton.icon(
                  onPressed: _showAuditLogsModal,
                  icon: const Icon(Icons.receipt_long, size: 18),
                  label: const Text('Xem Nhật Ký Chi Tiết (Full Modal)', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xFF1E1E2C),
                    side: const BorderSide(color: Color(0xFF1E1E2C)),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                  ),
                ),
                const SizedBox(height: 16),
                const Text(
                  'Nhật Ký Thao Tác Hệ Thống (Recent Audit Logs)',
                  style: TextStyle(
                    fontSize: 15,
                    fontWeight: FontWeight.bold,
                    color: Color(0xFF1E1E2C),
                  ),
                ),
                const SizedBox(height: 12),
                _isLoadingAuditLogs
                    ? const Center(child: CircularProgressIndicator())
                    : _auditLogs.isEmpty
                        ? Container(
                            padding: const EdgeInsets.all(20),
                            alignment: Alignment.center,
                            decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(16), border: Border.all(color: Colors.grey.shade200)),
                            child: const Text('Chưa có nhật ký audit log mới từ backend.', style: TextStyle(color: Colors.grey, fontWeight: FontWeight.bold)),
                          )
                        : ListView.builder(
                            shrinkWrap: true,
                            physics: const NeverScrollableScrollPhysics(),
                            itemCount: _auditLogs.length,
                            itemBuilder: (context, index) {
                              final log = _auditLogs[index];
                              final time = log['createdAt']?.toString().substring(11, 19) ?? 'N/A';
                              final action = log['action'] ?? '[LOG]';
                              final desc = log['description'] ?? log['details'] ?? 'Thao tác hệ thống';

                              return Card(
                                color: Colors.white,
                                margin: const EdgeInsets.only(bottom: 8),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12), side: BorderSide(color: Colors.grey.shade200)),
                                child: ListTile(
                                  leading: Text(time, style: const TextStyle(color: Colors.grey, fontSize: 11, fontWeight: FontWeight.bold)),
                                  title: Row(
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                        decoration: BoxDecoration(color: Colors.blue.shade50, borderRadius: BorderRadius.circular(6)),
                                        child: Text(action, style: const TextStyle(color: Colors.blue, fontWeight: FontWeight.bold, fontSize: 10)),
                                      ),
                                    ],
                                  ),
                                  subtitle: Padding(
                                    padding: const EdgeInsets.only(top: 4),
                                    child: Text(desc, style: const TextStyle(fontSize: 12, color: Color(0xFF1E1E2C))),
                                  ),
                                ),
                              );
                            },
                          ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _showAuditLogsModal() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
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
                        Icon(Icons.history_toggle_off, color: Color(0xFF1E1E2C), size: 20),
                        SizedBox(width: 8),
                        Text('Nhật ký Audit Logs Hệ thống', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                      ],
                    ),
                    IconButton(
                      icon: const Icon(Icons.refresh),
                      onPressed: _loadAuditLogs,
                    ),
                  ],
                ),
              ),
              const Divider(),
              Expanded(
                child: _isLoadingAuditLogs
                    ? const Center(child: CircularProgressIndicator())
                    : _auditLogs.isEmpty
                        ? const Center(child: Text('Chưa có dữ liệu nhật ký audit từ backend.'))
                        : ListView.builder(
                            padding: const EdgeInsets.all(16),
                            itemCount: _auditLogs.length,
                            itemBuilder: (context, index) {
                              final log = _auditLogs[index];
                              final time = log['createdAt']?.toString().substring(11, 19) ?? 'N/A';
                              final action = log['action'] ?? '[LOG]';
                              final desc = log['description'] ?? 'Thao tác';
                              final user = log['user'] ?? log['username'] ?? 'System';

                              return Card(
                                margin: const EdgeInsets.only(bottom: 8),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                child: ListTile(
                                  leading: const CircleAvatar(
                                    backgroundColor: Color(0xFFF1F5F9),
                                    child: Icon(Icons.security, size: 18, color: Color(0xFF1E1E2C)),
                                  ),
                                  title: Text(action, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                                  subtitle: Text('$desc\nThực hiện bởi: $user • Lúc: $time', style: const TextStyle(fontSize: 11)),
                                  isThreeLine: true,
                                ),
                              );
                            },
                          ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildServiceCard(Map<String, dynamic> svc) {
    final isActive = svc['status'] == 'ACTIVE';
    return Card(
      color: Colors.white,
      margin: const EdgeInsets.only(bottom: 8),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: ListTile(
        title: Text(svc['name'] ?? '', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
        subtitle: Text('Port: ${svc['port'] ?? ''}  •  Load: ${svc['load'] ?? ''}', style: const TextStyle(fontSize: 11)),
        trailing: Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(color: isActive ? Colors.green.shade50 : Colors.red.shade50, borderRadius: BorderRadius.circular(8)),
          child: Text(svc['status'] ?? 'ACTIVE', style: TextStyle(color: isActive ? Colors.green : Colors.red, fontWeight: FontWeight.bold, fontSize: 10)),
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
}
