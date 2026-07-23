import 'dart:async';
import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../services/socket_service.dart';

class NotificationListScreen extends StatefulWidget {
  const NotificationListScreen({super.key});

  @override
  State<NotificationListScreen> createState() => _NotificationListScreenState();
}

class _NotificationListScreenState extends State<NotificationListScreen> {
  List<dynamic> _notifications = [];
  bool _isLoading = false;
  StreamSubscription? _socketSubscription;

  @override
  void initState() {
    super.initState();
    _loadNotifications();
    _subscribeToSocket();
  }

  @override
  void dispose() {
    _socketSubscription?.cancel();
    super.dispose();
  }

  // Load notification history from API
  Future<void> _loadNotifications() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final data = await ApiService.getMyNotifications(limit: 50);
      setState(() {
        _notifications = List<dynamic>.from(data);
      });
    } catch (e) {
      debugPrint('Error loading notifications: $e');
    } finally {
      setState(() {
        _isLoading = false;
      });
    }
  }

  // Listen to incoming real-time notifications via socket
  void _subscribeToSocket() {
    _socketSubscription = SocketService().notificationStream.listen((newNotif) {
      if (mounted) {
        setState(() {
          // Prevent duplicates by checking if ID already exists
          final newId = newNotif['_id'] ?? newNotif['id'];
          final exists = _notifications.any((n) => (n['_id'] ?? n['id']) == newId);
          
          if (!exists) {
            // Unread by default for newly received notifications
            newNotif['read'] = false;
            _notifications.insert(0, newNotif);
            
            // Show a transient SnackBar
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(newNotif['message'] ?? 'Bạn có thông báo mới!'),
                backgroundColor: const Color(0xFF1E293B),
                duration: const Duration(seconds: 3),
                action: SnackBarAction(
                  label: 'Xem',
                  textColor: Colors.cyan,
                  onPressed: () {
                    // Already on NotificationListScreen, just scroll to top
                  },
                ),
              ),
            );
          }
        });
      }
    });
  }

  // Mark all notifications as read
  Future<void> _markAllAsRead() async {
    final success = await ApiService.markAllAsRead();
    if (success && mounted) {
      setState(() {
        for (var notif in _notifications) {
          notif['read'] = true;
        }
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Đã đánh dấu tất cả thông báo là đã đọc'),
          backgroundColor: Color(0xFF2E7D32),
        ),
      );
    }
  }

  // Mark single notification as read
  Future<void> _markAsRead(dynamic notif, int index) async {
    if (notif['read'] == true) return;

    final id = notif['_id'] ?? notif['id'];
    if (id == null) return;

    final success = await ApiService.markAsRead(id);
    if (success && mounted) {
      setState(() {
        _notifications[index]['read'] = true;
      });
    }
  }

  // Delete a notification
  Future<void> _deleteNotification(String id, int index) async {
    final success = await ApiService.deleteNotification(id);
    if (success && mounted) {
      setState(() {
        _notifications.removeAt(index);
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Đã xoá thông báo thành công'),
          backgroundColor: Color(0xFF374151),
        ),
      );
    }
  }

  // Helper colors and icons for each notification type
  Map<String, dynamic> _getTypeTheme(String type) {
    switch (type) {
      case 'NEW_PR':
        return {
          'color': const Color(0xFF10B981), // Green
          'icon': Icons.assignment_turned_in_outlined,
          'title': 'Yêu cầu Nhập hàng mới',
        };
      case 'PR_APPROVED':
        return {
          'color': const Color(0xFF3B82F6), // Blue
          'icon': Icons.check_circle_outline,
          'title': 'Phê duyệt Yêu cầu',
        };
      case 'PR_REJECTED':
        return {
          'color': const Color(0xFFEF4444), // Red
          'icon': Icons.highlight_off,
          'title': 'Từ chối Yêu cầu',
        };
      case 'NEW_PO':
        return {
          'color': const Color(0xFFF59E0B), // Orange
          'icon': Icons.shopping_bag_outlined,
          'title': 'Đơn mua hàng mới (PO)',
        };
      case 'GRN_COMPLETED':
        return {
          'color': const Color(0xFF8B5CF6), // Purple
          'icon': Icons.inventory_2_outlined,
          'title': 'Hoàn thành Nhập kho',
        };
      default:
        return {
          'color': const Color(0xFF6B7280), // Grey
          'icon': Icons.notifications_none_outlined,
          'title': 'Thông báo hệ thống',
        };
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text(
          'Thông báo',
          style: TextStyle(fontWeight: FontWeight.bold, color: Color(0xFF1E293B)),
        ),
        backgroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
        iconTheme: const IconThemeData(color: Color(0xFF1E293B)),
        actions: [
          if (_notifications.any((n) => !(n['read'] ?? false)))
            IconButton(
              icon: const Icon(Icons.done_all, color: Color(0xFF0F766E)),
              tooltip: 'Đọc tất cả',
              onPressed: _markAllAsRead,
            ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadNotifications,
        color: const Color(0xFF0F766E),
        child: _isLoading && _notifications.isEmpty
            ? const Center(child: CircularProgressIndicator(color: Color(0xFF0F766E)))
            : _notifications.isEmpty
                ? ListView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    children: [
                      SizedBox(height: MediaQuery.of(context).size.height * 0.25),
                      Center(
                        child: Column(
                          children: [
                            Icon(Icons.notifications_off_outlined,
                                size: 80, color: Colors.grey.shade300),
                            const SizedBox(height: 16),
                            Text(
                              'Không có thông báo nào',
                              style: TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: Colors.grey.shade400,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  )
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    itemCount: _notifications.length,
                    itemBuilder: (context, index) {
                      final notif = _notifications[index];
                      final id = notif['_id'] ?? notif['id'] ?? '';
                      final type = notif['type'] ?? 'INFO';
                      final isRead = notif['read'] ?? false;
                      final message = notif['message'] ?? '';
                      final timestamp = notif['timestamp'] ?? notif['createdAt'] ?? '';
                      
                      final theme = _getTypeTheme(type);
                      final Color typeColor = theme['color'];
                      final IconData typeIcon = theme['icon'];
                      final String typeTitle = theme['title'];

                      String timeString = 'Vừa xong';
                      try {
                        if (timestamp.isNotEmpty) {
                          final parsedDate = DateTime.parse(timestamp).toLocal();
                          final diff = DateTime.now().difference(parsedDate);
                          if (diff.inMinutes < 1) {
                            timeString = 'Vừa xong';
                          } else if (diff.inHours < 1) {
                            timeString = '${diff.inMinutes} phút trước';
                          } else if (diff.inDays < 1) {
                            timeString = '${diff.inHours} giờ trước';
                          } else {
                            timeString = '${parsedDate.day}/${parsedDate.month}/${parsedDate.year}';
                          }
                        }
                      } catch (_) {}

                      return Dismissible(
                        key: Key(id),
                        direction: DismissDirection.endToStart,
                        background: Container(
                          alignment: Alignment.centerRight,
                          padding: const EdgeInsets.only(right: 20),
                          margin: const EdgeInsets.only(bottom: 12),
                          decoration: BoxDecoration(
                            color: Colors.red.shade100,
                            borderRadius: BorderRadius.circular(16),
                          ),
                          child: Icon(Icons.delete_outline, color: Colors.red.shade700),
                        ),
                        onDismissed: (direction) {
                          _deleteNotification(id, index);
                        },
                        child: InkWell(
                          onTap: () => _markAsRead(notif, index),
                          borderRadius: BorderRadius.circular(16),
                          child: Container(
                            margin: const EdgeInsets.only(bottom: 12),
                            padding: const EdgeInsets.all(16),
                            decoration: BoxDecoration(
                              color: isRead ? Colors.white : const Color(0xFFF0FDFA), // Light cyan backdrop for unread
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(
                                color: isRead ? Colors.grey.shade200 : const Color(0xFFCCFBF1),
                                width: 1,
                              ),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.02),
                                  blurRadius: 10,
                                  offset: const Offset(0, 4),
                                ),
                              ],
                            ),
                            child: Row(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // Icon Circle badge
                                Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(
                                    color: typeColor.withValues(alpha: 0.1),
                                    shape: BoxShape.circle,
                                  ),
                                  child: Icon(typeIcon, color: typeColor, size: 22),
                                ),
                                const SizedBox(width: 16),
                                // Text Contents
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Text(
                                            typeTitle,
                                            style: TextStyle(
                                              fontSize: 13,
                                              fontWeight: FontWeight.bold,
                                              color: isRead ? const Color(0xFF475569) : const Color(0xFF0F766E),
                                            ),
                                          ),
                                          Text(
                                            timeString,
                                            style: TextStyle(
                                              fontSize: 10,
                                              color: Colors.grey.shade400,
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 6),
                                      Text(
                                        message,
                                        style: TextStyle(
                                          fontSize: 13,
                                          height: 1.4,
                                          fontWeight: isRead ? FontWeight.normal : FontWeight.w600,
                                          color: isRead ? const Color(0xFF64748B) : const Color(0xFF1E293B),
                                        ),
                                      ),
                                      // Render meta tags if available
                                      if (notif['prCode'] != null || notif['supplierName'] != null) ...[
                                        const SizedBox(height: 10),
                                        Wrap(
                                          spacing: 6,
                                          children: [
                                            if (notif['prCode'] != null)
                                              _buildBadge(
                                                'PR: ${notif['prCode']}',
                                                const Color(0xFF0F766E),
                                              ),
                                            if (notif['supplierName'] != null)
                                              _buildBadge(
                                                notif['supplierName'],
                                                const Color(0xFFB45309),
                                              ),
                                            if (notif['itemsCount'] != null)
                                              _buildBadge(
                                                '${notif['itemsCount']} loại thuốc',
                                                const Color(0xFF6D28D9),
                                              ),
                                          ],
                                        ),
                                      ],
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ),
                      );
                    },
                  ),
      ),
    );
  }

  Widget _buildBadge(String label, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.08),
        borderRadius: BorderRadius.circular(6),
        border: Border.all(color: color.withValues(alpha: 0.2), width: 0.8),
      ),
      child: Text(
        label,
        style: TextStyle(
          fontSize: 10,
          fontWeight: FontWeight.bold,
          color: color,
        ),
      ),
    );
  }
}
