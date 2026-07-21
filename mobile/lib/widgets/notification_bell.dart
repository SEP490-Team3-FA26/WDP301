import 'dart:async';
import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../services/socket_service.dart';
import '../screens/notification_screen.dart';

class NotificationBell extends StatefulWidget {
  final Color iconColor;
  const NotificationBell({super.key, this.iconColor = Colors.white});

  @override
  State<NotificationBell> createState() => _NotificationBellState();
}

class _NotificationBellState extends State<NotificationBell> {
  int _unreadCount = 0;
  Timer? _timer;
  StreamSubscription? _socketSubscription;

  @override
  void initState() {
    super.initState();
    _fetchUnreadCount();
    
    // Listen to real-time notification socket stream
    _socketSubscription = SocketService().notificationStream.listen((event) {
      _fetchUnreadCount();
    });

    // Poll unread count every 30 seconds as fallback
    _timer = Timer.periodic(const Duration(seconds: 30), (_) => _fetchUnreadCount());
  }

  @override
  void dispose() {
    _timer?.cancel();
    _socketSubscription?.cancel();
    super.dispose();
  }

  Future<void> _fetchUnreadCount() async {
    if (ApiService.currentToken.isEmpty) return;
    
    final count = await ApiService.getUnreadCount();
    if (mounted) {
      setState(() {
        _unreadCount = count;
      });
    }
  }

  void _openNotifications() {
    Navigator.push(
      context,
      MaterialPageRoute(builder: (context) => const NotificationScreen()),
    ).then((_) {
      // Refresh count when returning from notifications screen
      _fetchUnreadCount();
    });
  }

  @override
  Widget build(BuildContext context) {
    return IconButton(
      icon: _unreadCount > 0
          ? Badge(
              label: Text(
                '$_unreadCount',
                style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold),
              ),
              backgroundColor: Colors.red,
              child: Icon(Icons.notifications, color: widget.iconColor),
            )
          : Icon(Icons.notifications_none, color: widget.iconColor),
      onPressed: _openNotifications,
    );
  }
}
