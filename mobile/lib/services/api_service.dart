import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';


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

  // UC-19: Inspect Receipt Item using AI Count
  static Future<Map<String, dynamic>> inspectReceiptItemAI({
    required String receiptId,
    required String receiptItemId,
    required String filePath,
  }) async {
    final lowerPath = filePath.toLowerCase();
    MediaType mediaType = MediaType('image', 'jpeg');
    if (lowerPath.endsWith('.png')) {
      mediaType = MediaType('image', 'png');
    }

    try {
      var request = http.MultipartRequest(
        'POST',
        Uri.parse('$baseUrl/api/ai/receipts/$receiptId/items/$receiptItemId/inspection'),
      );
      request.files.add(await http.MultipartFile.fromPath(
        'file',
        filePath,
        contentType: mediaType,
      ));
      
      var streamedResponse = await request.send().timeout(const Duration(seconds: 30));
      var response = await http.Response.fromStream(streamedResponse);
      
      if (response.statusCode == 200) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      } else {
        throw Exception("AI Service returned code ${response.statusCode}: ${response.body}");
      }
    } catch (_) {
      try {
        // Fallback to direct FastAPI port for local emulator testing
        final localAiUrl = baseUrl.contains('10.0.2.2') ? 'http://10.0.2.2:8000' : 'http://localhost:8000';
        var request = http.MultipartRequest(
          'POST',
          Uri.parse('$localAiUrl/api/ai/receipts/$receiptId/items/$receiptItemId/inspection'),
        );
        request.files.add(await http.MultipartFile.fromPath(
          'file',
          filePath,
          contentType: mediaType,
        ));
        
        var streamedResponse = await request.send().timeout(const Duration(seconds: 30));
        var response = await http.Response.fromStream(streamedResponse);
        
        if (response.statusCode == 200) {
          return jsonDecode(response.body) as Map<String, dynamic>;
        } else {
          throw Exception("AI Service returned code ${response.statusCode}: ${response.body}");
        }
      } catch (e) {
        debugPrint("AI GRN inspection failed: $e");
        rethrow;
      }
    }
  }

  // UC-19: Verify Actual Count and override AI Count
  static Future<bool> verifyReceiptItemCount({
    required String inspectionRecordId,
    required int actualQty,
    required String userId,
  }) async {
    final body = jsonEncode({
      'actualQty': actualQty,
      'verifiedBy': userId,
    });
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/ai/inspections/$inspectionRecordId/verify'),
        headers: {'Content-Type': 'application/json'},
        body: body,
      ).timeout(const Duration(seconds: 5));
      return response.statusCode == 200;
    } catch (_) {
      try {
        final localAiUrl = baseUrl.contains('10.0.2.2') ? 'http://10.0.2.2:8000' : 'http://localhost:8000';
        final response = await http.post(
          Uri.parse('$localAiUrl/api/ai/inspections/$inspectionRecordId/verify'),
          headers: {'Content-Type': 'application/json'},
          body: body,
        ).timeout(const Duration(seconds: 5));
        return response.statusCode == 200;
      } catch (e) {
        debugPrint("Failed to verify count: $e");
        return false;
      }
    }
  }

  // UC-19: Approve Goods Receipt
  static Future<bool> approveGoodsReceipt(String receiptId) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/goods-receipts/$receiptId/approve'),
        headers: {'Content-Type': 'application/json'},
      ).timeout(const Duration(seconds: 10));
      return response.statusCode == 200;
    } catch (_) {
      try {
        final response = await http.post(
          Uri.parse('$fallbackUrl/api/goods-receipts/$receiptId/approve'),
          headers: {'Content-Type': 'application/json'},
        ).timeout(const Duration(seconds: 10));
        return response.statusCode == 200;
      } catch (e) {
        debugPrint("Failed to approve GRN: $e");
        return false;
      }
    }
  }

  static final List<Map<String, dynamic>> localMockGoodsReceipts = [
    {
      '_id': 'GRN-001',
      'poId': 'PO-001',
      'supplier': 'ABC Pharma',
      'status': 'DRAFT',
      'items': [
        {
          '_id': 'ITEM-001',
          'medicineId': 'MED-001',
          'expectedQty': 10,
          'actualQty': 0,
          'unit': 'Hộp',
          'status': 'PENDING'
        }
      ]
    }
  ];

  // UC-19: Fetch all Goods Receipt Notes from database
  static Future<List<dynamic>> getGoodsReceipts() async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/api/goods-receipts'),
      ).timeout(const Duration(seconds: 5));
      if (response.statusCode == 200) {
        return jsonDecode(response.body) as List<dynamic>;
      }
    } catch (e) {
      debugPrint("Failed to fetch dynamic goods receipts: $e");
    }
    return localMockGoodsReceipts;
  }

  // UC-19: Fetch single medicine details by ID
  static Future<Map<String, dynamic>?> getMedicineById(String id) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/api/medicines/$id'),
      ).timeout(const Duration(seconds: 5));
      if (response.statusCode == 200) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      }
    } catch (e) {
      debugPrint("Failed to fetch medicine $id details: $e");
    }
    return null;
  }

  // UC-19: Submit inspection report
  static Future<bool> submitInspection(String receiptId) async {
    try {
      final response = await http.post(
        Uri.parse('$baseUrl/api/goods-receipts/$receiptId/submit-inspection'),
        headers: {'Content-Type': 'application/json'},
      ).timeout(const Duration(seconds: 10));
      return response.statusCode == 200;
    } catch (_) {
      try {
        final response = await http.post(
          Uri.parse('$fallbackUrl/api/goods-receipts/$receiptId/submit-inspection'),
          headers: {'Content-Type': 'application/json'},
        ).timeout(const Duration(seconds: 10));
        return response.statusCode == 200;
      } catch (e) {
        debugPrint("Failed to submit inspection: $e");
        return false;
      }
    }
  }

  // Get User Profile using JWT token
  static Future<Map<String, dynamic>?> getProfile(String token) async {
    try {
      final response = await http.get(
        Uri.parse('$baseUrl/api/auth/profile'),
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer $token',
        },
      ).timeout(const Duration(seconds: 5));

      if (response.statusCode == 200) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      }
    } catch (_) {
      try {
        final response = await http.get(
          Uri.parse('$fallbackUrl/api/auth/profile'),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer $token',
          },
        ).timeout(const Duration(seconds: 5));

        if (response.statusCode == 200) {
          return jsonDecode(response.body) as Map<String, dynamic>;
        }
      } catch (e) {
        debugPrint("Failed to fetch user profile: $e");
      }
    }
    return null;
  }
}

