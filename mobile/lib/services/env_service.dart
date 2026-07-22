import 'package:flutter/services.dart';

class EnvService {
  static final Map<String, String> _env = {};
  static bool _initialized = false;

  static Future<void> init() async {
    if (_initialized) return;
    try {
      final content = await rootBundle.loadString('.env');
      for (final line in content.split('\n')) {
        final trimmed = line.trim();
        if (trimmed.isEmpty || trimmed.startsWith('#')) continue;
        final parts = trimmed.split('=');
        if (parts.length >= 2) {
          final key = parts[0].trim();
          final val = parts.sublist(1).join('=').trim();
          _env[key] = val;
        }
      }
    } catch (_) {
      // .env file missing or not included in assets
    }
    _initialized = true;
  }

  static String? get(String key) => _env[key];
}
