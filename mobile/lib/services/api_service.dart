import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

class ApiService {
  // Configurable base URL: dynamically falls back to localhost on Web
  static const String baseUrl = kIsWeb ? 'http://localhost:4000' : 'http://10.0.2.2:4000';
  static const String fallbackUrl = 'http://localhost:4000';

  // Hardcoded initial fallback list if DB/network is offline
  static final List<Map<String, dynamic>> localMockMedicines = [
    {
      'id': 'MED-001',
      'name': 'Amoxicillin 500mg',
      'price': 85000,
      'unit': 'Hộp',
      'active': 'Amoxicillin',
      'category': 'Kháng sinh / Antibiotics',
      'stock': 25,
      'isRx': true,
      'batches': [
        {'batchNo': 'Lô A1', 'expDate': '12/12/2026', 'stock': 15, 'status': 'ACTIVE'},
        {'batchNo': 'Lô A2', 'expDate': '10/05/2027', 'stock': 10, 'status': 'ACTIVE'},
      ]
    },
    {
      'id': 'MED-002',
      'name': 'Panadol Extra',
      'price': 45000,
      'unit': 'Hộp',
      'active': 'Paracetamol + Caffeine',
      'category': 'Giảm đau / Giảm sốt',
      'stock': 100,
      'isRx': false,
      'batches': [
        {'batchNo': 'Lô B1', 'expDate': '25/08/2026', 'stock': 100, 'status': 'ACTIVE'}
      ]
    },
    {
      'id': 'MED-003',
      'name': 'Decolgen Forte',
      'price': 38000,
      'unit': 'Vỉ',
      'active': 'Acetaminophen + Phenylephrine',
      'category': 'Hô hấp / Cough & Cold',
      'stock': 50,
      'isRx': false,
      'batches': [
        {'batchNo': 'Lô C1', 'expDate': '11/11/2026', 'stock': 50, 'status': 'ACTIVE'}
      ]
    },
    {
      'id': 'MED-004',
      'name': 'Cefuroxim 500mg',
      'price': 120000,
      'unit': 'Hộp',
      'active': 'Cefuroxim',
      'category': 'Kháng sinh / Antibiotics',
      'stock': 12,
      'isRx': true,
      'batches': [
        {'batchNo': 'Lô D1', 'expDate': '20/09/2026', 'stock': 12, 'status': 'ACTIVE'}
      ]
    },
    {
      'id': 'MED-005',
      'name': 'Strepsils Cool',
      'price': 32000,
      'unit': 'Hộp',
      'active': 'Dichlorobenzyl Alcohol',
      'category': 'Hô hấp / Cough & Cold',
      'stock': 40,
      'isRx': false,
      'batches': [
        {'batchNo': 'Lô E1', 'expDate': '01/01/2027', 'stock': 40, 'status': 'ACTIVE'}
      ]
    },
    {
      'id': 'MED-006',
      'name': 'Efferalgan 500mg',
      'price': 52000,
      'unit': 'Hộp',
      'active': 'Paracetamol',
      'category': 'Giảm đau / Giảm sốt',
      'stock': 75,
      'isRx': false,
      'batches': [
        {'batchNo': 'Lô F1', 'expDate': '15/10/2026', 'stock': 75, 'status': 'ACTIVE'}
      ]
    },
  ];

  static Map<String, dynamic> _mapMedicine(Map<String, dynamic> m) {
    final activeIng = m['active_ingredient'] ?? m['active'] ?? 'N/A';
    final classification = m['drug_classification'] ?? '';
    final isRx = classification.toString().toUpperCase().contains('PRESCRIPTION') || m['isRx'] == true;
    
    // Map list of batches if present
    List<Map<String, dynamic>> batchesList = [];
    if (m['batches'] != null && m['batches'] is List) {
      batchesList = (m['batches'] as List).map((b) => {
        'batchNo': b['batchNo'] ?? 'Lô KD',
        'expDate': b['expDate'] ?? '2026-12-31',
        'stock': b['stock'] is num ? (b['stock'] as num).toInt() : 0,
        'status': b['status'] ?? 'ACTIVE'
      }).toList();
    }

    return {
      'id': m['id'] ?? m['_id'] ?? '',
      'name': m['name'] ?? 'Thuốc chưa đặt tên',
      'price': m['price'] is num ? (m['price'] as num).toInt() : int.tryParse(m['price'].toString()) ?? 50000,
      'unit': m['unit'] ?? 'Hộp',
      'active': activeIng,
      'category': m['category'] ?? 'Chưa phân loại',
      'stock': m['stock'] is num ? (m['stock'] as num).toInt() : int.tryParse(m['stock'].toString()) ?? 0,
      'isRx': isRx,
      'batches': batchesList,
      'image': m['image'] ?? m['image_url'] ?? '',
      'images': m['images'] is List ? List<String>.from(m['images']) : <String>[],
      'cong_dung': m['cong_dung'] ?? m['indications'] ?? 'N/A',
      'cach_dung': m['cach_dung'] ?? m['default_dosage'] ?? 'N/A',
      'tac_dung_phu': m['tac_dung_phu'] ?? m['side_effects'] ?? 'N/A',
      'luu_y': m['luu_y'] ?? m['contraindications'] ?? 'N/A',
      'bao_quan': m['bao_quan'] ?? 'N/A',
      'manufacturer': m['manufacturer'] ?? 'N/A',
      'registration_number': m['registration_number'] ?? 'N/A',
      'dosage_form': m['dosage_form'] ?? 'N/A',
    };
  }

  // Fetch medicines from the DB gateway API with support for lazy loading query parameters
  static Future<List<Map<String, dynamic>>> getMedicines({
    int page = 1,
    int limit = 10,
    String search = '',
    String category = '',
    String classification = '',
  }) async {
    final queryParams = '?page=$page&limit=$limit&search=${Uri.encodeComponent(search)}&category=${Uri.encodeComponent(category)}&classification=${Uri.encodeComponent(classification)}';
    
    try {
      final response = await http.get(Uri.parse('$baseUrl/api/medicines$queryParams')).timeout(
        const Duration(seconds: 4),
      );
      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        final List dataList = decoded['data'] ?? [];
        return dataList.map((m) => _mapMedicine(m)).toList();
      }
    } catch (_) {
      try {
        final response = await http.get(Uri.parse('$fallbackUrl/api/medicines$queryParams')).timeout(
          const Duration(seconds: 4),
        );
        if (response.statusCode == 200) {
          final decoded = jsonDecode(response.body);
          final List dataList = decoded['data'] ?? [];
          return dataList.map((m) => _mapMedicine(m)).toList();
        }
      } catch (e) {
        // Fallback to local mock data if server is unreachable
        debugPrint("API service unreachable. Falling back to local offline mock. Error: $e");
      }
    }

    // Filter local data manually for search/category/classification to match DB behaviors offline
    return localMockMedicines.where((med) {
      final matchesSearch = search.isEmpty ||
          med['name'].toLowerCase().contains(search.toLowerCase()) ||
          med['active'].toLowerCase().contains(search.toLowerCase());
      final matchesCategory = category.isEmpty ||
          med['category'].toLowerCase().contains(category.toLowerCase());
      final matchesClassification = classification.isEmpty ||
          (classification == 'PRESCRIPTION_DRUG' && med['isRx'] == true) ||
          (classification == 'COMMON_SUPPLEMENT' && med['isRx'] == false);
      return matchesSearch && matchesCategory && matchesClassification;
    }).skip((page - 1) * limit).take(limit).toList();
  }

  // Check interactive compatibility of selected medicines via API
  static Future<Map<String, dynamic>?> checkInteractions(List<String> medicineNames) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/medicines/check-interaction'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'medicines': medicineNames}),
      ).timeout(const Duration(seconds: 5));

      if (response.statusCode == 201 || response.statusCode == 200) {
        return jsonDecode(response.body);
      }
    } catch (_) {
      try {
        final response = await http.post(
          Uri.parse('$fallbackUrl/api/medicines/check-interaction'),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({'medicines': medicineNames}),
        ).timeout(const Duration(seconds: 5));

        if (response.statusCode == 201 || response.statusCode == 200) {
          return jsonDecode(response.body);
        }
      } catch (e) {
        debugPrint("Interaction check failed. Offline mode fallback. Error: $e");
      }
    }
    return null;
  }
}
