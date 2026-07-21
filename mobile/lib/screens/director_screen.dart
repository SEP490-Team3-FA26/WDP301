import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../widgets/notification_bell.dart';

class DirectorScreen extends StatefulWidget {
  const DirectorScreen({super.key});

  @override
  State<DirectorScreen> createState() => _DirectorScreenState();
}

class _DirectorScreenState extends State<DirectorScreen> {
  bool _isLoading = false;
  final List<Map<String, dynamic>> _poPendingApprovals = [];

  final List<Map<String, dynamic>> _branchPerformances = [
    {'name': 'Cơ sở Quận 1', 'revenue': '420,000,000 ₫', 'transactions': '1,450', 'growth': '+12.4%'},
    {'name': 'Cơ sở Quận 3', 'revenue': '310,000,000 ₫', 'transactions': '980', 'growth': '+4.2%'},
    {'name': 'Cơ sở Quận 10', 'revenue': '285,000,000 ₫', 'transactions': '850', 'growth': '-2.1%'},
    {'name': 'Cơ sở Quận 7', 'revenue': '190,000,000 ₫', 'transactions': '520', 'growth': '+8.6%'},
  ];

  @override
  void initState() {
    super.initState();
    _loadPurchaseOrders();
  }

  Future<void> _loadPurchaseOrders() async {
    setState(() {
      _isLoading = true;
    });
    try {
      final poList = await ApiService.getPurchaseOrders();
      if (mounted) {
        setState(() {
          _poPendingApprovals.clear();
          for (var po in poList) {
            final itemsList = po['items'] as List? ?? [];
            final itemsSummary = itemsList.map((i) => "${i['medicineName'] ?? i['name']} (x${i['qty'] ?? i['quantity'] ?? 1})").join(", ");
            _poPendingApprovals.add({
              'id': po['_id'] != null ? 'PO-${po['_id'].toString().substring(po['_id'].toString().length - 5).toUpperCase()}' : po['id'] ?? 'PO-001',
              'rawId': po['_id'] ?? po['id'],
              'branch': po['branch'] ?? 'Cơ sở Tổng',
              'supplier': po['supplier'] ?? 'Nhà cung cấp Dược',
              'amount': '${(po['totalAmount'] ?? 50000000).toString()} ₫',
              'date': po['createdAt'] != null ? po['createdAt'].toString().substring(0, 10) : '12/06/2026',
              'items': itemsSummary.isNotEmpty ? itemsSummary : 'Các loại thuốc kháng sinh và thiết bị y tế',
            });
          }
        });
      }
    } catch (e) {
      debugPrint("Error loading POs: $e");
    } finally {
      if (mounted) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _approvePO(int index, String poId) async {
    final rawId = _poPendingApprovals[index]['rawId'] ?? poId;
    await ApiService.approvePurchaseOrder(rawId, "APPROVE", paymentType: "PAID");
    if (mounted) {
      setState(() {
        _poPendingApprovals.removeAt(index);
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Đã PHÊ DUYỆT thành công đơn nhập hàng $poId', style: const TextStyle(fontWeight: FontWeight.bold)),
          backgroundColor: Colors.green,
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  Future<void> _rejectPO(int index, String poId) async {
    final rawId = _poPendingApprovals[index]['rawId'] ?? poId;
    await ApiService.approvePurchaseOrder(rawId, "REJECT", rejectionReason: "Từ chối bởi Giám Đốc trên di động");
    if (mounted) {
      setState(() {
        _poPendingApprovals.removeAt(index);
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Đã TỪ CHỐI đơn nhập hàng $poId', style: const TextStyle(fontWeight: FontWeight.bold)),
          backgroundColor: Colors.red,
          behavior: SnackBarBehavior.floating,
        ),
      );
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
            Text('Báo cáo Giám Đốc', style: TextStyle(fontWeight: FontWeight.w900, color: Colors.white, fontSize: 18)),
            Text('ĐƠN HÀNG CHỜ PHÊ DUYỆT & DOANH THU CHI NHÁNH', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.white70, letterSpacing: 1.0)),
          ],
        ),
        flexibleSpace: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
        ),
        elevation: 4,
        iconTheme: const IconThemeData(color: Colors.white),
        actions: const [
          NotificationBell(),
        ],
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Chart Card (Premium executive design)
              Card(
                color: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24), side: BorderSide(color: Colors.grey.shade100)),
                elevation: 3,
                child: Padding(
                  padding: const EdgeInsets.all(18.0),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: const [
                              Text(
                                'Doanh Thu Toàn Hệ Thống',
                                style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Colors.grey),
                              ),
                              SizedBox(height: 2),
                              Text(
                                'Tháng 6, 2026',
                                style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: Color(0xFF0F172A)),
                              ),
                            ],
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                            decoration: BoxDecoration(color: Colors.green.shade50, borderRadius: BorderRadius.circular(10)),
                            child: const Text(
                              '1.205 tỷ ₫',
                              style: TextStyle(fontWeight: FontWeight.w900, fontSize: 15, color: Colors.green),
                            ),
                          )
                        ],
                      ),
                      const SizedBox(height: 18),
                      // Custom Revenue chart painter
                      SizedBox(
                        height: 150,
                        width: double.infinity,
                        child: CustomPaint(
                          painter: RevenueChartPainter(),
                        ),
                      ),
                      const SizedBox(height: 16),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceAround,
                        children: [
                          _buildLegend('Q.1', Colors.blue),
                          _buildLegend('Q.3', Colors.green),
                          _buildLegend('Q.10', Colors.orange),
                          _buildLegend('Q.7', Colors.purple),
                        ],
                      )
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 24),

              // PO Pending approval list
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(
                    'Duyệt Đơn Nhập Hàng (${_poPendingApprovals.length})',
                    style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                  ),
                  const Icon(Icons.pending_actions, color: Colors.amber),
                ],
              ),
              const SizedBox(height: 12),
              _poPendingApprovals.isEmpty
                  ? Card(
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                      child: const Padding(
                        padding: EdgeInsets.all(28.0),
                        child: Center(
                          child: Text(
                            'Không có đơn PO nào đang chờ duyệt.',
                            style: TextStyle(color: Colors.grey, fontWeight: FontWeight.bold),
                          ),
                        ),
                      ),
                    )
                  : ListView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: _poPendingApprovals.length,
                      itemBuilder: (context, index) {
                        final po = _poPendingApprovals[index];
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
                                      'Mã đơn: ${po['id']}',
                                      style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                                    ),
                                    Text(
                                      po['amount']!,
                                      style: const TextStyle(fontWeight: FontWeight.w900, color: Colors.green, fontSize: 15),
                                    )
                                  ],
                                ),
                                const SizedBox(height: 8),
                                Text('Chi nhánh: ${po['branch']}', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13)),
                                Text('Nhà cung cấp: ${po['supplier']}', style: const TextStyle(fontSize: 13, color: Colors.black54)),
                                const SizedBox(height: 8),
                                Container(
                                  width: double.infinity,
                                  padding: const EdgeInsets.all(10),
                                  decoration: BoxDecoration(color: Colors.grey.shade50, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.grey.shade100)),
                                  child: Text(
                                    po['items']!,
                                    style: TextStyle(color: Colors.grey.shade700, fontSize: 11, height: 1.3),
                                  ),
                                ),
                                const SizedBox(height: 12),
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.end,
                                  children: [
                                    TextButton(
                                      onPressed: () => _rejectPO(index, po['id']!),
                                      child: const Text('Từ chối', style: TextStyle(color: Colors.red, fontWeight: FontWeight.bold)),
                                    ),
                                    const SizedBox(width: 8),
                                    ElevatedButton(
                                      onPressed: () => _approvePO(index, po['id']!),
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: const Color(0xFF0F172A),
                                        foregroundColor: Colors.white,
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                      ),
                                      child: const Text('Phê duyệt', style: TextStyle(fontWeight: FontWeight.bold)),
                                    )
                                  ],
                                )
                              ],
                            ),
                          ),
                        );
                      },
                    ),
              const SizedBox(height: 24),

              // Pharmacy branches list
              const Text(
                'Hiệu Suất Từng Chi Nhánh',
                style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
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
                  itemCount: _branchPerformances.length,
                  separatorBuilder: (context, index) => const Divider(height: 1, color: Color(0xFFF1F5F9)),
                  itemBuilder: (context, index) {
                    final branch = _branchPerformances[index];
                    final isUp = branch['growth']!.startsWith('+');
                    
                    return ListTile(
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      title: Text(
                        branch['name']!,
                        style: const TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                      ),
                      subtitle: Text('Tổng giao dịch: ${branch['transactions']}', style: const TextStyle(fontSize: 12)),
                      trailing: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        crossAxisAlignment: CrossAxisAlignment.end,
                        children: [
                          Text(
                            branch['revenue']!,
                            style: const TextStyle(fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
                          ),
                          const SizedBox(height: 2),
                          Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                isUp ? Icons.trending_up : Icons.trending_down,
                                size: 12,
                                color: isUp ? Colors.green : Colors.red,
                              ),
                              const SizedBox(width: 4),
                              Text(
                                branch['growth']!,
                                style: TextStyle(
                                  color: isUp ? Colors.green : Colors.red,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 11,
                                ),
                              )
                            ],
                          )
                        ],
                      ),
                    );
                  },
                ),
              )
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLegend(String label, Color color) {
    return Row(
      children: [
        Container(width: 10, height: 10, decoration: BoxDecoration(color: color, shape: BoxShape.circle)),
        const SizedBox(width: 6),
        Text(label, style: const TextStyle(fontSize: 11, color: Colors.grey, fontWeight: FontWeight.bold)),
      ],
    );
  }
}

// Custom Painter to draw a clean and beautiful smooth curve area chart representing revenue
class RevenueChartPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paintLine = Paint()
      ..color = const Color(0xFF0F172A)
      ..strokeWidth = 3
      ..strokeCap = StrokeCap.round
      ..style = PaintingStyle.stroke;

    final paintFill = Paint()
      ..shader = LinearGradient(
        colors: [const Color(0xFF0F172A).withValues(alpha: 0.2), const Color(0xFF0F172A).withValues(alpha: 0.01)],
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
      ).createShader(Rect.fromLTWH(0, 0, size.width, size.height));

    final path = Path();
    
    final points = [
      Offset(0, size.height * 0.8),
      Offset(size.width * 0.15, size.height * 0.72),
      Offset(size.width * 0.3, size.height * 0.48),
      Offset(size.width * 0.45, size.height * 0.52),
      Offset(size.width * 0.6, size.height * 0.28),
      Offset(size.width * 0.75, size.height * 0.4),
      Offset(size.width * 0.9, size.height * 0.18),
      Offset(size.width, size.height * 0.08),
    ];

    path.moveTo(points[0].dx, points[0].dy);
    
    // Draw smooth bezier curves
    for (int i = 0; i < points.length - 1; i++) {
      final p1 = points[i];
      final p2 = points[i + 1];
      final controlPoint1 = Offset(p1.dx + (p2.dx - p1.dx) / 2, p1.dy);
      final controlPoint2 = Offset(p1.dx + (p2.dx - p1.dx) / 2, p2.dy);
      path.cubicTo(controlPoint1.dx, controlPoint1.dy, controlPoint2.dx, controlPoint2.dy, p2.dx, p2.dy);
    }

    final fillPath = Path.from(path)
      ..lineTo(size.width, size.height)
      ..lineTo(0, size.height)
      ..close();

    canvas.drawPath(fillPath, paintFill);
    canvas.drawPath(path, paintLine);

    // Draw dot at latest point
    final paintDot = Paint()..color = Colors.green..style = PaintingStyle.fill;
    final paintStroke = Paint()
      ..color = Colors.white
      ..strokeWidth = 2
      ..style = PaintingStyle.stroke;

    canvas.drawCircle(points.last, 6, paintDot);
    canvas.drawCircle(points.last, 6, paintStroke);
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}
