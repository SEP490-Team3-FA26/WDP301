import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as socket_io;
import 'api_service.dart';

class SocketService {
  // Singleton Pattern
  static final SocketService _instance = SocketService._internal();
  factory SocketService() => _instance;
  SocketService._internal();

  socket_io.Socket? _socket;
  bool _isConnected = false;

  bool get isConnected => _isConnected;

  // StreamController to broadcast notifications
  final StreamController<Map<String, dynamic>> _notificationStreamController =
      StreamController<Map<String, dynamic>>.broadcast();

  Stream<Map<String, dynamic>> get notificationStream =>
      _notificationStreamController.stream;

  // Initialize and connect socket
  void initSocket(String token) {
    if (token.isEmpty) {
      debugPrint('⚠️ Cannot init Socket: Token is empty');
      return;
    }

    // Disconnect existing socket if any
    disconnect();

    debugPrint('🔌 Initializing Socket.IO connection to ${ApiService.baseUrl} ...');

    try {
      _socket = socket_io.io(
        ApiService.baseUrl,
        socket_io.OptionBuilder()
            .setTransports(['websocket']) // Use websocket transport only
            .enableAutoConnect()
            .enableReconnection()
            .setReconnectionDelay(5000)
            .setReconnectionAttempts(10)
            .setAuth({'token': token}) // Pass token inside auth payload
            .build(),
      );

      _setupListeners();
      _socket!.connect();
    } catch (e) {
      debugPrint('❌ Error during socket initialization: $e');
    }
  }

  // Setup connection & custom event listeners
  void _setupListeners() {
    if (_socket == null) return;

    _socket!.onConnect((_) {
      _isConnected = true;
      debugPrint('✅ Socket connected successfully to gateway');
    });

    _socket!.onDisconnect((_) {
      _isConnected = false;
      debugPrint('❌ Socket disconnected from gateway');
    });

    _socket!.onConnectError((data) {
      debugPrint('⚠️ Socket Connection Error: $data');
    });

    _socket!.onError((data) {
      debugPrint('⚠️ Socket Error: $data');
    });

    // Custom notification events from NestJS gateway
    _socket!.on('new_pr_notification', (data) => _handleIncomingNotification('NEW_PR', data));
    _socket!.on('pr_approved_notification', (data) => _handleIncomingNotification('PR_APPROVED', data));
    _socket!.on('pr_rejected_notification', (data) => _handleIncomingNotification('PR_REJECTED', data));
    _socket!.on('new_po_notification', (data) => _handleIncomingNotification('NEW_PO', data));
    _socket!.on('grn_completed_notification', (data) => _handleIncomingNotification('GRN_COMPLETED', data));
  }

  // Handle and transform notification events to emit to stream
  void _handleIncomingNotification(String type, dynamic data) {
    debugPrint('🔔 Received event [$type] from Socket: $data');
    try {
      if (data is Map<String, dynamic>) {
        final Map<String, dynamic> notification = Map<String, dynamic>.from(data);
        notification['type'] = type;
        notification['timestamp'] = notification['timestamp'] ?? notification['createdAt'] ?? DateTime.now().toIso8601String();
        _notificationStreamController.add(notification);
      } else if (data is String) {
        // Fallback if data is raw string message
        _notificationStreamController.add({
          'type': type,
          'message': data,
          'timestamp': DateTime.now().toIso8601String(),
        });
      }
    } catch (e) {
      debugPrint('❌ Error mapping incoming socket notification: $e');
    }
  }

  // Disconnect socket (call when logging out)
  void disconnect() {
    if (_socket != null) {
      debugPrint('🔌 Disconnecting socket...');
      _socket!.off('new_pr_notification');
      _socket!.off('pr_approved_notification');
      _socket!.off('pr_rejected_notification');
      _socket!.off('new_po_notification');
      _socket!.off('grn_completed_notification');
      _socket!.disconnect();
      _socket!.destroy();
      _socket = null;
    }
    _isConnected = false;
  }
}
