import 'dart:async';
import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../services/socket_service.dart';
import '../screens/notification_list_screen.dart';

class NotificationBadge extends StatefulWidget {
  final Color iconColor;
  const NotificationBadge({super.key, this.iconColor = const Color(0xFF1E293B)});

  @override
  State<NotificationBadge> createState() => _NotificationBadgeState();
}

class _NotificationBadgeState extends State<NotificationBadge> {
  int _unreadCount = 0;
  StreamSubscription? _socketSubscription;

  @override
  void initState() {
    super.initState();
    _fetchUnreadCount();
    _subscribeToNotifications();
  }

  @override
  void dispose() {
    _socketSubscription?.cancel();
    super.dispose();
  }

  // Fetch current unread count from server
  Future<void> _fetchUnreadCount() async {
    try {
      final count = await ApiService.getUnreadCount();
      if (mounted) {
        setState(() {
          _unreadCount = count;
        });
      }
    } catch (e) {
      debugPrint('Failed to get unread count: $e');
    }
  }

  // Subscribe to real-time notification socket stream to increment badge
  void _subscribeToNotifications() {
    _socketSubscription = SocketService().notificationStream.listen((_) {
      if (mounted) {
        setState(() {
          _unreadCount++;
        });
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      alignment: Alignment.center,
      children: [
        IconButton(
          icon: Icon(
            Icons.notifications_outlined,
            color: widget.iconColor,
            size: 26,
          ),
          onPressed: () async {
            // Navigate to notification screen and wait for pop
            await Navigator.of(context).push(
              MaterialPageRoute(
                builder: (context) => const NotificationListScreen(),
              ),
            );
            // Refresh unread count when returning to screen
            _fetchUnreadCount();
          },
        ),
        if (_unreadCount > 0)
          Positioned(
            right: 8,
            top: 8,
            child: Container(
              padding: const EdgeInsets.all(2),
              decoration: BoxDecoration(
                color: const Color(0xFFEF4444), // Crimson Red
                shape: BoxShape.circle,
                border: Border.all(color: Colors.white, width: 1.5),
              ),
              constraints: const BoxConstraints(
                minWidth: 16,
                minHeight: 16,
              ),
              child: Center(
                child: Text(
                  _unreadCount > 99 ? '99+' : '$_unreadCount',
                  style: const TextStyle(
                    color: Colors.white,
                    fontSize: 8,
                    fontWeight: FontWeight.bold,
                  ),
                  textAlign: TextAlign.center,
                ),
              ),
            ),
          ),
      ],
    );
  }
}
