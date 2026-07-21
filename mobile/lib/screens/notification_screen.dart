import 'dart:async';
import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../services/socket_service.dart';

class NotificationScreen extends StatefulWidget {
  const NotificationScreen({super.key});

  @override
  State<NotificationScreen> createState() => _NotificationScreenState();
}

class _NotificationScreenState extends State<NotificationScreen> {
  List<dynamic> _notifications = [];
  bool _isLoading = true;
  StreamSubscription? _socketSubscription;

  @override
  void initState() {
    super.initState();
    _loadNotifications();

    // Listen to real-time notification socket stream
    _socketSubscription = SocketService().notificationStream.listen((event) {
      final data = event['data'];
      final String eventName = event['event']?.toString() ?? '';
      
      // Map event names to notification types
      String mappedType = 'NEW_PR';
      if (eventName.contains('approved')) {
        mappedType = 'PR_APPROVED';
      } else if (eventName.contains('rejected')) {
        mappedType = 'PR_REJECTED';
      } else if (eventName.contains('new_po')) {
        mappedType = 'NEW_PO';
      } else if (eventName.contains('grn_completed')) {
        mappedType = 'GRN_COMPLETED';
      }

      if (mounted) {
        setState(() {
          _notifications.insert(0, {
            '_id': data['_id'] ?? data['id'] ?? 'socket-${DateTime.now().millisecondsSinceEpoch}',
            'type': mappedType,
            'message': data['message'] ?? 'Có thông báo mới từ hệ thống',
            'prId': data['prId'],
            'prCode': data['prCode'] ?? data['code'],
            'poId': data['poId'],
            'grnId': data['grnId'],
            'branchName': data['branchName'],
            'supplierName': data['supplierName'],
            'rejectionReason': data['rejectionReason'],
            'read': false,
            'createdAt': data['createdAt'] ?? data['timestamp'] ?? DateTime.now().toIso8601String(),
          });
        });
      }
    });
  }

  @override
  void dispose() {
    _socketSubscription?.cancel();
    super.dispose();
  }

  Future<void> _loadNotifications() async {
    setState(() {
      _isLoading = true;
    });

    final notifs = await ApiService.getMyNotifications();

    setState(() {
      _notifications = notifs;
      _isLoading = false;
    });
  }

  Future<void> _markAsRead(String id, int index) async {
    if (_notifications[index]['read'] == true) return;

    final success = await ApiService.markNotificationAsRead(id);
    if (success) {
      setState(() {
        _notifications[index]['read'] = true;
      });
    }
  }

  Future<void> _markAllRead() async {
    showDialog(
      context: context,
      barrierDismissible: false,
      builder: (context) => const Center(child: CircularProgressIndicator(color: Colors.blue)),
    );

    final success = await ApiService.markAllNotificationsAsRead();
    
    if (!mounted) return;
    Navigator.pop(context); // Dismiss loading dialog

    if (success) {
      setState(() {
        for (var notif in _notifications) {
          notif['read'] = true;
        }
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Đã đánh dấu tất cả thông báo là đã đọc'),
          backgroundColor: Colors.green,
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Không thể cập nhật trạng thái thông báo'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _deleteNotification(String id, int index) async {
    final success = await ApiService.deleteNotification(id);
    if (success) {
      setState(() {
        _notifications.removeAt(index);
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('Đã xóa thông báo'),
            backgroundColor: Colors.black87,
          ),
        );
      }
    }
  }

  String _formatDateTime(String? isoString) {
    if (isoString == null || isoString.isEmpty) return '';
    try {
      final dateTime = DateTime.parse(isoString).toLocal();
      final now = DateTime.now();
      final difference = now.difference(dateTime);

      if (difference.inSeconds < 60) {
        return 'Vừa xong';
      } else if (difference.inMinutes < 60) {
        return '${difference.inMinutes} phút trước';
      } else if (difference.inHours < 24) {
        return '${difference.inHours} giờ trước';
      } else if (difference.inDays < 7) {
        return '${difference.inDays} ngày trước';
      } else {
        return '${dateTime.day.toString().padLeft(2, '0')}/${dateTime.month.toString().padLeft(2, '0')}/${dateTime.year} ${dateTime.hour.toString().padLeft(2, '0')}:${dateTime.minute.toString().padLeft(2, '0')}';
      }
    } catch (_) {
      return '';
    }
  }

  void _showNotificationDetail(Map<String, dynamic> notif, int index) {
    _markAsRead(notif['_id'] ?? '', index);

    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: [
            _getNotificationIcon(notif['type']),
            const SizedBox(width: 12),
            const Text(
              'Chi Tiết Thông Báo',
              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
            ),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              notif['message'] ?? '',
              style: const TextStyle(fontSize: 15, height: 1.4, color: Colors.black87),
            ),
            const SizedBox(height: 16),
            if (notif['prCode'] != null) ...[
              _buildDetailRow('Mã yêu cầu (PR):', notif['prCode']),
            ],
            if (notif['poId'] != null) ...[
              _buildDetailRow('Mã đơn hàng (PO):', notif['poId']),
            ],
            if (notif['grnId'] != null) ...[
              _buildDetailRow('Phiếu nhập kho (GRN):', notif['grnId']),
            ],
            if (notif['branchName'] != null) ...[
              _buildDetailRow('Cơ sở:', notif['branchName']),
            ],
            if (notif['supplierName'] != null) ...[
              _buildDetailRow('Nhà cung cấp:', notif['supplierName']),
            ],
            if (notif['rejectionReason'] != null) ...[
              const SizedBox(height: 8),
              const Text('Lý do từ chối:', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.red)),
              const SizedBox(height: 4),
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: Colors.red.shade50,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.red.shade100),
                ),
                child: Text(
                  notif['rejectionReason'],
                  style: TextStyle(color: Colors.red.shade900, fontSize: 13),
                ),
              ),
            ],
            const SizedBox(height: 12),
            Text(
              'Thời gian: ${_formatDateTime(notif['createdAt'])}',
              style: const TextStyle(fontSize: 12, color: Colors.black45, fontStyle: FontStyle.italic),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Đóng', style: TextStyle(fontWeight: FontWeight.bold)),
          ),
        ],
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 6.0),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('$label ', style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.black54, fontSize: 13)),
          Expanded(
            child: Text(value, style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.black87, fontSize: 13)),
          ),
        ],
      ),
    );
  }

  Icon _getNotificationIcon(String? type) {
    switch (type) {
      case 'NEW_PR':
        return const Icon(Icons.assignment_add, color: Colors.amber);
      case 'PR_APPROVED':
        return const Icon(Icons.check_circle_outline, color: Colors.green);
      case 'PR_REJECTED':
        return const Icon(Icons.cancel_outlined, color: Colors.red);
      case 'NEW_PO':
        return const Icon(Icons.shopping_bag_outlined, color: Colors.blue);
      case 'GRN_COMPLETED':
        return const Icon(Icons.inventory_2_outlined, color: Colors.teal);
      default:
        return const Icon(Icons.notifications_none, color: Colors.grey);
    }
  }

  Color _getNotificationColor(String? type) {
    switch (type) {
      case 'NEW_PR':
        return Colors.amber.shade50;
      case 'PR_APPROVED':
        return Colors.green.shade50;
      case 'PR_REJECTED':
        return Colors.red.shade50;
      case 'NEW_PO':
        return Colors.blue.shade50;
      case 'GRN_COMPLETED':
        return Colors.teal.shade50;
      default:
        return Colors.grey.shade50;
    }
  }

  @override
  Widget build(BuildContext context) {
    final unreadCount = _notifications.where((n) => n['read'] != true).length;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text(
          'Thông Báo',
          style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 18),
        ),
        flexibleSpace: Container(
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              colors: [Color(0xFF1A73E8), Color(0xFF1557B0)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
          ),
        ),
        iconTheme: const IconThemeData(color: Colors.white),
        actions: [
          if (unreadCount > 0)
            TextButton.icon(
              onPressed: _markAllRead,
              icon: const Icon(Icons.done_all, color: Colors.white, size: 20),
              label: const Text(
                'Đọc tất cả',
                style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
              ),
            ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF1A73E8)))
          : _notifications.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.notifications_off_outlined, size: 72, color: Colors.grey.shade400),
                      const SizedBox(height: 16),
                      Text(
                        'Không có thông báo nào',
                        style: TextStyle(color: Colors.grey.shade500, fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        'Mọi hoạt động phê duyệt sẽ xuất hiện tại đây.',
                        style: TextStyle(color: Colors.grey.shade400, fontSize: 13),
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadNotifications,
                  color: const Color(0xFF1A73E8),
                  child: ListView.builder(
                    padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 12),
                    itemCount: _notifications.length,
                    itemBuilder: (context, index) {
                      final notif = _notifications[index];
                      final isUnread = notif['read'] != true;

                      return Dismissible(
                        key: Key(notif['_id'] ?? 'notif-$index'),
                        direction: DismissDirection.endToStart,
                        background: Container(
                          alignment: Alignment.centerRight,
                          padding: const EdgeInsets.only(right: 20.0),
                          decoration: BoxDecoration(
                            color: Colors.red.shade700,
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: const Icon(Icons.delete_outline, color: Colors.white, size: 28),
                        ),
                        onDismissed: (direction) {
                          _deleteNotification(notif['_id'] ?? '', index);
                        },
                        child: Card(
                          elevation: isUnread ? 2 : 0.5,
                          shadowColor: isUnread ? Colors.blue.withValues(alpha: 0.2) : Colors.black12,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(16),
                            side: BorderSide(
                              color: isUnread ? Colors.blue.shade100 : Colors.grey.shade300,
                              width: isUnread ? 1.5 : 1,
                            ),
                          ),
                          color: isUnread ? Colors.white : Colors.grey.shade50,
                          margin: const EdgeInsets.only(bottom: 8),
                          child: InkWell(
                            borderRadius: BorderRadius.circular(16),
                            onTap: () => _showNotificationDetail(notif, index),
                            child: Padding(
                              padding: const EdgeInsets.all(16.0),
                              child: Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Container(
                                    padding: const EdgeInsets.all(10),
                                    decoration: BoxDecoration(
                                      color: _getNotificationColor(notif['type']),
                                      shape: BoxShape.circle,
                                    ),
                                    child: _getNotificationIcon(notif['type']),
                                  ),
                                  const SizedBox(width: 16),
                                  Expanded(
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Expanded(
                                              child: Text(
                                                notif['message'] ?? '',
                                                maxLines: 2,
                                                overflow: TextOverflow.ellipsis,
                                                style: TextStyle(
                                                  fontWeight: isUnread ? FontWeight.bold : FontWeight.normal,
                                                  fontSize: 14,
                                                  color: isUnread ? Colors.black87 : Colors.black54,
                                                ),
                                              ),
                                            ),
                                            if (isUnread)
                                              Container(
                                                width: 8,
                                                height: 8,
                                                margin: const EdgeInsets.only(left: 8, top: 4),
                                                decoration: const BoxDecoration(
                                                  color: Colors.blue,
                                                  shape: BoxShape.circle,
                                                ),
                                              ),
                                          ],
                                        ),
                                        const SizedBox(height: 8),
                                        Text(
                                          _formatDateTime(notif['createdAt']),
                                          style: TextStyle(
                                            fontSize: 11,
                                            color: isUnread ? Colors.blueGrey : Colors.black38,
                                            fontWeight: isUnread ? FontWeight.bold : FontWeight.normal,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      );
                    },
                  ),
                ),
    );
  }
}
