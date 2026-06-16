import 'package:flutter/material.dart';

class AdminScreen extends StatefulWidget {
  const AdminScreen({super.key});

  @override
  State<AdminScreen> createState() => _AdminScreenState();
}

class _AdminScreenState extends State<AdminScreen> {
  final List<Map<String, dynamic>> _services = [
    {'name': 'auth-service', 'status': 'ACTIVE', 'port': '4001', 'load': '1.2%'},
    {'name': 'user-service', 'status': 'ACTIVE', 'port': '4002', 'load': '0.8%'},
    {'name': 'inventory-service', 'status': 'ACTIVE', 'port': '4003', 'load': '2.4%'},
    {'name': 'supplier-service', 'status': 'ACTIVE', 'port': '4004', 'load': '0.3%'},
    {'name': 'ai-service', 'status': 'ACTIVE', 'port': '8000', 'load': '12.6%'},
  ];

  final List<Map<String, String>> _recentRegistrations = [
    {'name': 'Trần Văn Hoàng', 'email': 'hoangtv@vinapharmacy.com', 'role': 'Dược sĩ', 'date': '12/06/2026'},
    {'name': 'Lê Thị Mai', 'email': 'mailt@vinapharmacy.com', 'role': 'Thủ kho', 'date': '11/06/2026'},
    {'name': 'Nguyễn Hoàng Nam', 'email': 'namnh@vinapharmacy.com', 'role': 'Quản lý cơ sở', 'date': '10/06/2026'},
  ];

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
            Text('Admin Dashboard', style: TextStyle(fontWeight: FontWeight.w900, color: Colors.white, fontSize: 18)),
            Text('GIÁM SÁT MICROSERVICES & TÀI KHOẢN HỆ THỐNG', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.white70, letterSpacing: 1.0)),
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
                  content: Text('Đang làm mới dữ liệu hệ thống...', style: TextStyle(fontWeight: FontWeight.bold)),
                  backgroundColor: Color(0xFF2C2C3E),
                  behavior: SnackBarBehavior.floating,
                ),
              );
            },
          )
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
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF1E1E2C)),
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
              
              // Microservices status list
              const Text(
                'Quản Lý Các Microservices',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF1E1E2C)),
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
                child: ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: _services.length,
                  separatorBuilder: (context, index) => const Divider(height: 1, color: Color(0xFFF1F5F9)),
                  itemBuilder: (context, index) {
                    final svc = _services[index];
                    final isActive = svc['status'] == 'ACTIVE';
                    
                    return ListTile(
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      title: Text(
                        svc['name'],
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF1E1E2C)),
                      ),
                      subtitle: Text('Port: ${svc['port']}  •  CPU: ${svc['load']}', style: const TextStyle(fontSize: 12)),
                      trailing: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: isActive ? Colors.green.shade50 : Colors.red.shade50,
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
                          )
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
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF1E1E2C)),
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
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20), side: BorderSide(color: Colors.grey.shade100)),
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
                                style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15, color: Color(0xFF1E1E2C)),
                              ),
                              Text(
                                reg['date']!,
                                style: const TextStyle(color: Colors.grey, fontSize: 11),
                              )
                            ],
                          ),
                          const SizedBox(height: 6),
                          Text('Email: ${reg['email']}', style: TextStyle(color: Colors.grey.shade600, fontSize: 13)),
                          const SizedBox(height: 8),
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Chip(
                                label: Text(reg['role']!, style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF1E1E2C))),
                                backgroundColor: const Color(0xFFF1F5F9),
                                side: BorderSide.none,
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                              ),
                              Row(
                                children: [
                                  TextButton(
                                    onPressed: () {
                                      setState(() {
                                        _recentRegistrations.removeAt(index);
                                      });
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        const SnackBar(
                                          content: Text('Từ chối phê duyệt tài khoản.', style: TextStyle(fontWeight: FontWeight.bold)),
                                          backgroundColor: Colors.red,
                                          behavior: SnackBarBehavior.floating,
                                        ),
                                      );
                                    },
                                    child: const Text('Từ chối', style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold, fontSize: 12)),
                                  ),
                                  const SizedBox(width: 8),
                                  ElevatedButton(
                                    onPressed: () {
                                      setState(() {
                                        _recentRegistrations.removeAt(index);
                                      });
                                      ScaffoldMessenger.of(context).showSnackBar(
                                        const SnackBar(
                                          content: Text('Phê duyệt tài khoản thành công!', style: TextStyle(fontWeight: FontWeight.bold)),
                                          backgroundColor: Colors.green,
                                          behavior: SnackBarBehavior.floating,
                                        ),
                                      );
                                    },
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: const Color(0xFF1E1E2C),
                                      foregroundColor: Colors.white,
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                    ),
                                    child: const Text('Duyệt', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                                  )
                                ],
                              )
                            ],
                          )
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
          BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 10, offset: const Offset(0, 4))
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
            style: const TextStyle(fontSize: 10, color: Colors.grey, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF1E1E2C)),
          ),
          const SizedBox(height: 4),
          Text(
            subtext,
            style: const TextStyle(fontSize: 10, color: Colors.green, fontWeight: FontWeight.bold),
          ),
        ],
      ),
    );
  }
}
