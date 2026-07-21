import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import 'api_service.dart';

class SocketService {
  static final SocketService _instance = SocketService._internal();
  factory SocketService() => _instance;
  SocketService._internal();

  io.Socket? _socket;
  final StreamController<Map<String, dynamic>> _notificationStreamController =
      StreamController<Map<String, dynamic>>.broadcast();

  Stream<Map<String, dynamic>> get notificationStream =>
      _notificationStreamController.stream;

  bool get isConnected => _socket?.connected ?? false;

  void connect(String token) {
    if (_socket != null) {
      disconnect();
    }

    final String serverUrl = ApiService.baseUrl;
    debugPrint('🔌 Connecting to WebSocket server at $serverUrl...');

    // NestJS socket.io gateway structure
    _socket = io.io(
      serverUrl,
      io.OptionBuilder()
          .setTransports(['websocket']) // Use WebSocket transport
          .disableAutoConnect()         // Disable auto connection initially
          .setAuth({'token': token})    // Pass token in auth object
          .build(),
    );

    _socket!.connect();

    _socket!.onConnect((_) {
      debugPrint('📡 WebSocket connected successfully!');
    });

    _socket!.onDisconnect((_) {
      debugPrint('🛑 WebSocket disconnected');
    });

    _socket!.onConnectError((data) {
      debugPrint('❌ WebSocket connection error: $data');
    });

    // Register notification listeners
    _registerNotificationEvent('new_pr_notification');
    _registerNotificationEvent('pr_approved_notification');
    _registerNotificationEvent('pr_rejected_notification');
    _registerNotificationEvent('new_po_notification');
    _registerNotificationEvent('grn_completed_notification');
  }

  void _registerNotificationEvent(String eventName) {
    _socket?.on(eventName, (data) {
      debugPrint('🔔 WebSocket Event Received [$eventName]: $data');
      if (data is Map<String, dynamic>) {
        _notificationStreamController.add({
          'event': eventName,
          'data': data,
        });
      } else if (data is String) {
        try {
          // Handle stringified JSON just in case
          final parsed = Map<String, dynamic>.from(data as dynamic);
          _notificationStreamController.add({
            'event': eventName,
            'data': parsed,
          });
        } catch (_) {
          _notificationStreamController.add({
            'event': eventName,
            'data': {'message': data},
          });
        }
      } else {
        _notificationStreamController.add({
          'event': eventName,
          'data': {'message': data.toString()},
        });
      }
    });
  }

  void disconnect() {
    _socket?.disconnect();
    _socket = null;
    debugPrint('🔌 WebSocket connection cleared');
  }
}
