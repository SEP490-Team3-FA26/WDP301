import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';

class EnvService {
  static final Map<String, String> _env = {};
  static bool _initialized = false;

  static Future<void> init() async {
    if (_initialized) return;
    try {
      final content = await rootBundle.loadString('.env');
      for (final rawLine in content.split('\n')) {
        final line = rawLine.trim();
        if (line.isEmpty || line.startsWith('#')) continue;
        final parts = line.split('=');
        if (parts.length >= 2) {
          final key = parts[0].trim();
          var val = parts.sublist(1).join('=').trim();
          if ((val.startsWith('"') && val.endsWith('"')) ||
              (val.startsWith("'") && val.endsWith("'"))) {
            val = val.substring(1, val.length - 1);
          }
          _env[key] = val;
        }
      }
    } catch (e) {
      if (kDebugMode) {
        print('EnvService: .env file missing or not loaded: $e');
      }
    }
    _initialized = true;
  }

  static String? get(String key, [String? defaultValue]) => _env[key] ?? defaultValue;
}
