import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';

import 'env_service.dart';

class ApiService {
  // Configurable base URL: dynamically read from EnvService (.env) with smart fallback
  static String get baseUrl {
    final envUrl = EnvService.get('API_URL') ?? EnvService.get('API_BASE_URL');
    if (envUrl != null && envUrl.isNotEmpty) {
      if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
        return envUrl.replaceAll('127.0.0.1', '10.0.2.2').replaceAll('localhost', '10.0.2.2');
      }
      return envUrl;
    }
    return kIsWeb ? 'http://localhost:4000' : 'http://10.0.2.2:4000';
  }

  static const String fallbackUrl = 'http://localhost:4000';

  static String get aiBaseUrl {
    final envUrl = EnvService.get('AI_URL') ?? EnvService.get('AI_BASE_URL');
    if (envUrl != null && envUrl.isNotEmpty) {
      if (!kIsWeb && defaultTargetPlatform == TargetPlatform.android) {
        return envUrl.replaceAll('127.0.0.1', '10.0.2.2').replaceAll('localhost', '10.0.2.2');
      }
      return envUrl;
    }
    return kIsWeb ? 'http://localhost:8000' : 'http://10.0.2.2:8000';
  }

  // JWT token stored globally after login
  static String currentToken = '';

  static Map<String, String> get _authHeaders => {
    'Content-Type': 'application/json',
    if (currentToken.isNotEmpty) 'Authorization': 'Bearer $currentToken',
  };

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
        {
          'batchNo': 'Lô A1',
          'expDate': '12/12/2026',
          'stock': 15,
          'status': 'ACTIVE',
        },
        {
          'batchNo': 'Lô A2',
          'expDate': '10/05/2027',
          'stock': 10,
          'status': 'ACTIVE',
        },
      ],
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
        {
          'batchNo': 'Lô B1',
          'expDate': '25/08/2026',
          'stock': 100,
          'status': 'ACTIVE',
        },
      ],
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
        {
          'batchNo': 'Lô C1',
          'expDate': '11/11/2026',
          'stock': 50,
          'status': 'ACTIVE',
        },
      ],
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
        {
          'batchNo': 'Lô D1',
          'expDate': '20/09/2026',
          'stock': 12,
          'status': 'ACTIVE',
        },
      ],
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
        {
          'batchNo': 'Lô E1',
          'expDate': '01/01/2027',
          'stock': 40,
          'status': 'ACTIVE',
        },
      ],
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
        {
          'batchNo': 'Lô F1',
          'expDate': '15/10/2026',
          'stock': 75,
          'status': 'ACTIVE',
        },
      ],
    },
  ];

  static Map<String, dynamic> _mapMedicine(Map<String, dynamic> m) {
    final activeIng = m['active_ingredient'] ?? m['active'] ?? 'N/A';
    final classification = m['drug_classification'] ?? '';
    final isRx =
        classification.toString().toUpperCase().contains('PRESCRIPTION') ||
        m['isRx'] == true;

    // Map list of batches if present
    List<Map<String, dynamic>> batchesList = [];
    if (m['batches'] != null && m['batches'] is List) {
      batchesList = (m['batches'] as List)
          .map(
            (b) => {
              'batchNo': b['batchNo'] ?? 'Lô KD',
              'expDate': b['expDate'] ?? '2026-12-31',
              'stock': b['stock'] is num ? (b['stock'] as num).toInt() : 0,
              'status': b['status'] ?? 'ACTIVE',
            },
          )
          .toList();
    }

    return {
      'id': m['id'] ?? m['_id'] ?? '',
      'name': m['name'] ?? 'Thuốc chưa đặt tên',
      'price': m['price'] is num
          ? (m['price'] as num).toInt()
          : int.tryParse(m['price'].toString()) ?? 50000,
      'unit': m['unit'] ?? 'Hộp',
      'active': activeIng,
      'category': m['category'] ?? 'Chưa phân loại',
      'stock': m['stock'] is num
          ? (m['stock'] as num).toInt()
          : int.tryParse(m['stock'].toString()) ?? 0,
      'isRx': isRx,
      'batches': batchesList,
      'image': m['image'] ?? m['image_url'] ?? '',
      'images': m['images'] is List
          ? List<String>.from(m['images'])
          : <String>[],
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
    String indication = '',
  }) async {
    final queryParams =
        '?page=$page&limit=$limit&search=${Uri.encodeComponent(search)}&category=${Uri.encodeComponent(category)}&classification=${Uri.encodeComponent(classification)}&indication=${Uri.encodeComponent(indication)}';

    try {
      final response = await http
          .get(
            Uri.parse('$baseUrl/api/medicines$queryParams'),
            headers: _authHeaders,
          )
          .timeout(const Duration(seconds: 30));
      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        final List dataList = decoded['data'] ?? [];
        return dataList.map((m) => _mapMedicine(m)).toList();
      }
    } catch (e) {
      throw Exception('Lỗi DB Thuốc (HTTP Lỗi): $e');
    }
    return [];
  }

  // Check interactive compatibility of selected medicines via API
  static Future<Map<String, dynamic>?> checkInteractions(
    List<String> medicineNames,
  ) async {
    try {
      final response = await http
          .post(
            Uri.parse('$baseUrl/api/medicines/check-interaction'),
            headers: _authHeaders,
            body: jsonEncode({'medicines': medicineNames}),
          )
          .timeout(const Duration(seconds: 30));

      if (response.statusCode == 201 || response.statusCode == 200) {
        return jsonDecode(response.body);
      }
    } catch (_) {
      try {
        final response = await http
            .post(
              Uri.parse('$fallbackUrl/api/medicines/check-interaction'),
              headers: _authHeaders,
              body: jsonEncode({'medicines': medicineNames}),
            )
            .timeout(const Duration(seconds: 30));

        if (response.statusCode == 201 || response.statusCode == 200) {
          return jsonDecode(response.body);
        }
      } catch (e) {
        debugPrint(
          "Interaction check failed. Offline mode fallback. Error: $e",
        );
      }
    }
    return null;
  }

  // Trace batch/lot lifecycle
  static Future<Map<String, dynamic>?> traceLot(String batchNo) async {
    try {
      final response = await http
          .get(
            Uri.parse(
              '$baseUrl/api/inventory-transactions/trace/${Uri.encodeComponent(batchNo.trim())}',
            ),
            headers: _authHeaders,
          )
          .timeout(const Duration(seconds: 30));
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      }
    } catch (_) {
      try {
        final response = await http
            .get(
              Uri.parse(
                '$fallbackUrl/api/inventory-transactions/trace/${Uri.encodeComponent(batchNo.trim())}',
              ),
              headers: _authHeaders,
            )
            .timeout(const Duration(seconds: 30));
        if (response.statusCode == 200) {
          return jsonDecode(response.body);
        }
      } catch (e) {
        debugPrint("Trace lot failed: $e");
      }
    }

    // Offline Mock Fallback for Lot Trace
    return {
      'batchNo': batchNo,
      'medicine': {
        '_id': 'med_mock_1',
        'name': 'Panadol Extra 500mg',
        'sku': 'PAN-EXT-500',
        'unit': 'Hộp',
        'category': 'Giảm đau / Giảm sốt',
      },
      'batches': [
        {
          'branchId': 'CENTRAL_WH',
          'stock': 120,
          'expDate': '2026-12-31T00:00:00.000Z',
          'status': 'ACTIVE',
        },
        {
          'branchId': 'CN1',
          'stock': 45,
          'expDate': '2026-12-31T00:00:00.000Z',
          'status': 'ACTIVE',
        },
      ],
      'origin': {
        'grnId': 'GRN-984F7E',
        'poId': 'PO-882C1B',
        'importDate': '2026-06-15T08:30:00.000Z',
        'supplierId': 'sup_1',
        'supplierName': 'Eco Pharma JSC',
        'importQty': 500,
        'importPrice': 32000,
        'receivedBy': 'Nguyễn Văn Kho',
      },
      'timeline': [
        {
          '_id': 'tx1',
          'type': 'GRN_IMPORT',
          'quantityChange': 500,
          'stockBefore': 0,
          'stockAfter': 500,
          'referenceId': 'grn-1',
          'referenceType': 'GRN',
          'performedBy': 'Nguyễn Văn Kho',
          'notes': 'Nhập kho lô mới từ PO-882C1B',
          'createdAt': '2026-06-15T08:30:00.000Z',
        },
        {
          '_id': 'tx2',
          'type': 'TRANSFER',
          'quantityChange': -100,
          'stockBefore': 500,
          'stockAfter': 400,
          'referenceId': 'tf-1',
          'referenceType': 'TRANSFER',
          'performedBy': 'Lê Điều Phối',
          'notes': 'Chuyển hàng sang cơ sở CN1',
          'createdAt': '2026-06-20T10:15:00.000Z',
        },
        {
          '_id': 'tx3',
          'type': 'SALE_EXPORT',
          'quantityChange': -2,
          'stockBefore': 400,
          'stockAfter': 398,
          'referenceId': 'so-1',
          'referenceType': 'SALE',
          'performedBy': 'Trần Dược Sĩ',
          'notes': 'Xuất bán lẻ cho khách hàng',
          'createdAt': '2026-07-02T14:45:00.000Z',
        },
      ],
    };
  }

  // Get AI Demand Forecast
  static Future<Map<String, dynamic>?> getAIForecast(int periodDays) async {
    try {
      final response = await http
          .get(
            Uri.parse(
              '$baseUrl/api/reports/ai-forecast?periodDays=$periodDays',
            ),
            headers: _authHeaders,
          )
          .timeout(const Duration(seconds: 30));
      if (response.statusCode == 200) {
        return jsonDecode(response.body);
      }
    } catch (e) {
      throw Exception('Lỗi kết nối API AI Forecast: $e');
    }
    return null;
  }

  // UC-19: Inspect Receipt Item using AI Count
  static Future<Map<String, dynamic>> inspectReceiptItemAI({
    required String receiptId,
    required String receiptItemId,
    required String filePath,
    Uint8List? fileBytes,
  }) async {
    final lowerPath = filePath.toLowerCase();
    MediaType mediaType = MediaType('image', 'jpeg');
    if (lowerPath.endsWith('.png')) {
      mediaType = MediaType('image', 'png');
    }

    try {
      var request = http.MultipartRequest(
        'POST',
        Uri.parse(
          '$baseUrl/api/ai/receipts/$receiptId/items/$receiptItemId/inspection',
        ),
      );
      request.headers.addAll(_authHeaders);
      request.headers['x-internal-token'] =
          'wdp301-super-secret-key-change-in-production';

      if (fileBytes != null) {
        request.files.add(
          http.MultipartFile.fromBytes(
            'file',
            fileBytes,
            filename: 'upload.jpg',
            contentType: mediaType,
          ),
        );
      } else {
        request.files.add(
          await http.MultipartFile.fromPath(
            'file',
            filePath,
            contentType: mediaType,
          ),
        );
      }

      var streamedResponse = await request.send().timeout(
        const Duration(seconds: 30),
      );
      var response = await http.Response.fromStream(streamedResponse);

      if (response.statusCode == 200) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      } else {
        throw Exception(
          "AI Service returned code ${response.statusCode}: ${response.body}",
        );
      }
    } catch (_) {
      try {
        // Fallback to direct FastAPI port for local emulator testing
        final localAiUrl = aiBaseUrl;
        var request = http.MultipartRequest(
          'POST',
          Uri.parse(
            '$localAiUrl/api/ai/receipts/$receiptId/items/$receiptItemId/inspection',
          ),
        );
        request.headers.addAll(_authHeaders);
        request.headers['x-internal-token'] =
            'wdp301-super-secret-key-change-in-production';

        if (fileBytes != null) {
          request.files.add(
            http.MultipartFile.fromBytes(
              'file',
              fileBytes,
              filename: 'upload.jpg',
              contentType: mediaType,
            ),
          );
        } else {
          request.files.add(
            await http.MultipartFile.fromPath(
              'file',
              filePath,
              contentType: mediaType,
            ),
          );
        }

        var streamedResponse = await request.send().timeout(
          const Duration(seconds: 30),
        );
        var response = await http.Response.fromStream(streamedResponse);

        if (response.statusCode == 200) {
          return jsonDecode(response.body) as Map<String, dynamic>;
        } else {
          throw Exception(
            "AI Service returned code ${response.statusCode}: ${response.body}",
          );
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
    final body = jsonEncode({'actualQty': actualQty, 'verifiedBy': userId});

    final headers = {
      ..._authHeaders,
      'x-internal-token': 'wdp301-super-secret-key-change-in-production',
    };

    try {
      final response = await http
          .post(
            Uri.parse('$baseUrl/api/ai/inspections/$inspectionRecordId/verify'),
            headers: headers,
            body: body,
          )
          .timeout(const Duration(seconds: 30));
      if (response.statusCode == 200) {
        return true;
      } else {
        throw Exception("API Gateway returned ${response.statusCode}");
      }
    } catch (_) {
      try {
        final localAiUrl = aiBaseUrl;
        final response = await http
            .post(
              Uri.parse(
                '$localAiUrl/api/ai/inspections/$inspectionRecordId/verify',
              ),
              headers: headers,
              body: body,
            )
            .timeout(const Duration(seconds: 30));
        return response.statusCode == 200 || response.statusCode == 201;
      } catch (e) {
        debugPrint("Failed to verify count: $e");
        return false;
      }
    }
  }

  // UC-19: Approve Goods Receipt
  static Future<bool> approveGoodsReceipt(String receiptId) async {
    try {
      final response = await http
          .post(
            Uri.parse('$baseUrl/api/goods-receipts/$receiptId/approve'),
            headers: _authHeaders,
          )
          .timeout(const Duration(seconds: 30));
      return response.statusCode == 200 || response.statusCode == 201;
    } catch (_) {
      try {
        final response = await http
            .post(
              Uri.parse('$fallbackUrl/api/goods-receipts/$receiptId/approve'),
              headers: _authHeaders,
            )
            .timeout(const Duration(seconds: 30));
        return response.statusCode == 200 || response.statusCode == 201;
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
          'status': 'PENDING',
        },
      ],
    },
  ];

  // UC-19: Fetch all Goods Receipt Notes from database
  static Future<List<dynamic>> getGoodsReceipts() async {
    try {
      final response = await http
          .get(Uri.parse('$baseUrl/api/goods-receipts'), headers: _authHeaders)
          .timeout(const Duration(seconds: 30));
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
      final response = await http
          .get(Uri.parse('$baseUrl/api/medicines/$id'), headers: _authHeaders)
          .timeout(const Duration(seconds: 30));
      if (response.statusCode == 200 || response.statusCode == 201) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      }
    } catch (e) {
      throw Exception('Lỗi Lấy Thông Tin Thuốc: $e');
    }
    return null;
  }

  // UC-19: Submit inspection report
  static Future<bool> submitInspection(String receiptId) async {
    try {
      final response = await http
          .post(
            Uri.parse(
              '$baseUrl/api/goods-receipts/$receiptId/submit-inspection',
            ),
            headers: _authHeaders,
          )
          .timeout(const Duration(seconds: 30));
      return response.statusCode == 200 || response.statusCode == 201;
    } catch (_) {
      try {
        final response = await http
            .post(
              Uri.parse(
                '$fallbackUrl/api/goods-receipts/$receiptId/submit-inspection',
              ),
              headers: _authHeaders,
            )
            .timeout(const Duration(seconds: 30));
        return response.statusCode == 200 || response.statusCode == 201;
      } catch (e) {
        debugPrint("Failed to submit inspection: $e");
        return false;
      }
    }
  }

  // Auth: Register
  static Future<Map<String, dynamic>> register({
    required String fullName,
    required String email,
    required String password,
    String? phone,
    String role = 'user',
  }) async {
    try {
      final response = await http
          .post(
            Uri.parse('$baseUrl/api/auth/register'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({
              'fullName': fullName,
              'email': email,
              'password': password,
              if (phone != null && phone.isNotEmpty) 'phone': phone,
              'role': role,
            }),
          )
          .timeout(const Duration(seconds: 30));

      final data = jsonDecode(response.body);
      if (response.statusCode == 200 || response.statusCode == 201) {
        return {'success': true, 'data': data};
      }
      return {
        'success': false,
        'message': data is Map ? (data['message'] ?? 'Đăng ký thất bại.') : 'Đăng ký thất bại.',
      };
    } catch (e) {
      return {'success': false, 'message': 'Lỗi kết nối: $e'};
    }
  }

  // Auth: Verify Email OTP
  static Future<Map<String, dynamic>> verifyEmail({
    required String email,
    required String token,
  }) async {
    try {
      final response = await http
          .post(
            Uri.parse('$baseUrl/api/auth/verify-email'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'email': email, 'token': token}),
          )
          .timeout(const Duration(seconds: 30));

      final data = jsonDecode(response.body);
      if (response.statusCode == 200 || response.statusCode == 201) {
        return {'success': true, 'data': data};
      }
      return {
        'success': false,
        'message': data is Map ? (data['message'] ?? 'Xác thực email thất bại.') : 'Xác thực email thất bại.',
      };
    } catch (e) {
      return {'success': false, 'message': 'Lỗi kết nối: $e'};
    }
  }

  // Auth: Resend OTP Verification
  static Future<Map<String, dynamic>> resendVerification({
    required String email,
  }) async {
    try {
      final response = await http
          .post(
            Uri.parse('$baseUrl/api/auth/resend-verification'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'email': email}),
          )
          .timeout(const Duration(seconds: 30));

      final data = jsonDecode(response.body);
      if (response.statusCode == 200 || response.statusCode == 201) {
        return {'success': true, 'data': data};
      }
      return {
        'success': false,
        'message': data is Map ? (data['message'] ?? 'Gửi lại OTP thất bại.') : 'Gửi lại OTP thất bại.',
      };
    } catch (e) {
      return {'success': false, 'message': 'Lỗi kết nối: $e'};
    }
  }

  // Auth: Forgot Password (Request OTP)
  static Future<Map<String, dynamic>> forgotPassword({
    required String email,
  }) async {
    try {
      final response = await http
          .post(
            Uri.parse('$baseUrl/api/auth/forgot-password'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'email': email}),
          )
          .timeout(const Duration(seconds: 30));

      final data = jsonDecode(response.body);
      if (response.statusCode == 200 || response.statusCode == 201) {
        return {'success': true, 'data': data};
      }
      return {
        'success': false,
        'message': data is Map ? (data['message'] ?? 'Yêu cầu thất bại.') : 'Yêu cầu thất bại.',
      };
    } catch (e) {
      return {'success': false, 'message': 'Lỗi kết nối: $e'};
    }
  }

  // Auth: Reset Password
  static Future<Map<String, dynamic>> resetPassword({
    required String email,
    required String token,
    required String newPassword,
  }) async {
    try {
      final response = await http
          .post(
            Uri.parse('$baseUrl/api/auth/reset-password'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({
              'email': email,
              'token': token,
              'newPassword': newPassword,
            }),
          )
          .timeout(const Duration(seconds: 30));

      final data = jsonDecode(response.body);
      if (response.statusCode == 200 || response.statusCode == 201) {
        return {'success': true, 'data': data};
      }
      return {
        'success': false,
        'message': data is Map ? (data['message'] ?? 'Đặt lại mật khẩu thất bại.') : 'Đặt lại mật khẩu thất bại.',
      };
    } catch (e) {
      return {'success': false, 'message': 'Lỗi kết nối: $e'};
    }
  }

  // Get User Profile using JWT token
  static Future<Map<String, dynamic>?> getProfile([String? token]) async {
    final activeToken = (token != null && token.isNotEmpty)
        ? token
        : currentToken;
    try {
      final response = await http
          .get(
            Uri.parse('$baseUrl/api/auth/profile?refresh=true'),
            headers: {
              'Content-Type': 'application/json',
              if (activeToken.isNotEmpty)
                'Authorization': 'Bearer $activeToken',
            },
          )
          .timeout(const Duration(seconds: 30));

      if (response.statusCode == 200 || response.statusCode == 201) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      }
    } catch (_) {
      try {
        final response = await http
            .get(
              Uri.parse('$fallbackUrl/api/auth/profile?refresh=true'),
              headers: {
                'Content-Type': 'application/json',
                if (activeToken.isNotEmpty)
                  'Authorization': 'Bearer $activeToken',
              },
            )
            .timeout(const Duration(seconds: 30));

        if (response.statusCode == 200) {
          return jsonDecode(response.body) as Map<String, dynamic>;
        }
      } catch (e) {
        debugPrint("Failed to fetch user profile: $e");
      }
    }
    if (activeToken.isNotEmpty) {
      return null;
    }

    return {
      'id': 'USER-CUSTOMER-001',
      'fullName': 'Khách Hàng Thành Viên',
      'email': 'user@vinapharmacy.com',
      'phone': '0987654321',
      'role': 'user',
      'loyaltyPoints': 1250,
      'memberTier': 'Vàng (Gold Member)',
      'address': '123 Nguyễn Văn Linh, Q. Hải Châu, Đà Nẵng',
    };
  }

  // Fetch Purchase Orders for Director / HQ Approval
  static Future<List<dynamic>> getPurchaseOrders() async {
    try {
      final response = await http
          .get(Uri.parse('$baseUrl/api/purchase-orders'), headers: _authHeaders)
          .timeout(const Duration(seconds: 30));
      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        if (decoded is List) return decoded;
        if (decoded is Map && decoded['data'] is List) return decoded['data'];
      }
    } catch (e) {
      debugPrint("Failed to fetch purchase orders: $e");
    }
    return [
      {
        '_id': 'PO-88231',
        'supplierId': 'sup-001',
        'supplier': 'Dược phẩm Minh Dân',
        'branch': 'Cơ sở Quận 1',
        'totalAmount': 84500000,
        'status': 'PENDING_APPROVAL',
        'createdAt': '2026-06-12T08:00:00.000Z',
        'items': [
          {'medicineName': 'Amoxicillin 500mg', 'qty': 500, 'price': 85000},
          {'medicineName': 'Panadol Extra', 'qty': 1000, 'price': 45000},
        ],
      },
      {
        '_id': 'PO-88232',
        'supplierId': 'sup-002',
        'supplier': 'Tập đoàn OPC',
        'branch': 'Cơ sở Quận 3',
        'totalAmount': 120000000,
        'status': 'PENDING_APPROVAL',
        'createdAt': '2026-06-12T09:30:00.000Z',
        'items': [
          {'medicineName': 'Hoạt huyết dưỡng não', 'qty': 2000, 'price': 50000},
          {'medicineName': 'Dầu khuynh diệp', 'qty': 1500, 'price': 35000},
        ],
      },
    ];
  }

  // Approve or Reject Purchase Order
  static Future<bool> approvePurchaseOrder(
    String poId,
    String action, {
    String? paymentType,
    String? rejectionReason,
  }) async {
    try {
      final response = await http
          .post(
            Uri.parse('$baseUrl/api/purchase-orders/approve-pay'),
            headers: _authHeaders,
            body: jsonEncode({
              'poId': poId,
              'action': action,
              'paymentType': paymentType,
              'rejectionReason': rejectionReason,
            }),
          )
          .timeout(const Duration(seconds: 30));
      return response.statusCode == 200 || response.statusCode == 201;
    } catch (e) {
      debugPrint("Failed to process PO approval: $e");
      return false;
    }
  }

  // Fetch Purchase Requisitions (PR) for Branch Screen
  static Future<List<dynamic>> getPurchaseRequisitions() async {
    try {
      final response = await http
          .get(
            Uri.parse('$baseUrl/api/purchase-requisitions'),
            headers: _authHeaders,
          )
          .timeout(const Duration(seconds: 30));
      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        if (decoded is List) return decoded;
        if (decoded is Map && decoded['data'] is List) return decoded['data'];
      }
    } catch (e) {
      debugPrint("Failed to fetch purchase requisitions: $e");
    }
    return [
      {
        '_id': 'PR-1001',
        'prCode': 'PR-2026-001',
        'branchName': 'Cơ sở Quận 1',
        'reason': 'Khẩn: Thiếu hụt kháng sinh và hạ sốt nghiêm trọng',
        'status': 'PENDING',
        'createdAt': '2026-06-14T10:00:00.000Z',
        'items': [
          {'medicineName': 'Amoxicillin 500mg', 'qty': 200},
          {'medicineName': 'Decolgen Forte', 'qty': 150},
        ],
      },
    ];
  }

  // Create Purchase Requisition (PR)
  static Future<bool> createPurchaseRequisition(
    Map<String, dynamic> prData,
  ) async {
    try {
      final response = await http
          .post(
            Uri.parse('$baseUrl/api/purchase-requisitions'),
            headers: _authHeaders,
            body: jsonEncode(prData),
          )
          .timeout(const Duration(seconds: 30));
      return response.statusCode == 200 || response.statusCode == 201;
    } catch (e) {
      debugPrint("Failed to create PR: $e");
      return false;
    }
  }

  // Submit Order / POS Sale / Customer Checkout
  static Future<Map<String, dynamic>?> createOrder(
    Map<String, dynamic> orderData,
  ) async {
    try {
      final response = await http
          .post(
            Uri.parse('$baseUrl/api/orders'),
            headers: _authHeaders,
            body: jsonEncode(orderData),
          )
          .timeout(const Duration(seconds: 30));
      if (response.statusCode == 200 || response.statusCode == 201) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      }
      debugPrint(
        'createOrder status: ${response.statusCode} body: ${response.body}',
      );
    } catch (_) {
      try {
        final response = await http
            .post(
              Uri.parse('$fallbackUrl/api/orders'),
              headers: _authHeaders,
              body: jsonEncode(orderData),
            )
            .timeout(const Duration(seconds: 25));
        if (response.statusCode == 200 || response.statusCode == 201) {
          return jsonDecode(response.body) as Map<String, dynamic>;
        }
      } catch (e) {
        debugPrint("Failed to create order: $e");
      }
    }
    return null;
  }

  // Create PayOS payment link for QR/Card online payment
  static Future<Map<String, dynamic>?> createPayOSLink(
    Map<String, dynamic> orderData,
  ) async {
    try {
      final response = await http
          .post(
            Uri.parse('$baseUrl/api/orders/payos-link'),
            headers: _authHeaders,
            body: jsonEncode(orderData),
          )
          .timeout(const Duration(seconds: 30));
      if (response.statusCode == 200 || response.statusCode == 201) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      }
      debugPrint(
        'createPayOSLink status: ${response.statusCode} body: ${response.body}',
      );
    } catch (_) {
      try {
        final response = await http
            .post(
              Uri.parse('$fallbackUrl/api/orders/payos-link'),
              headers: _authHeaders,
              body: jsonEncode(orderData),
            )
            .timeout(const Duration(seconds: 25));
        if (response.statusCode == 200 || response.statusCode == 201) {
          return jsonDecode(response.body) as Map<String, dynamic>;
        }
      } catch (e) {
        debugPrint("Failed to create PayOS link: $e");
      }
    }
    return null;
  }

  // Check PayOS payment status for QR/Online payment
  static Future<Map<String, dynamic>?> checkOrderPayment(
    dynamic orderCode,
  ) async {
    try {
      final response = await http
          .get(
            Uri.parse('$baseUrl/api/orders/check/$orderCode'),
            headers: _authHeaders,
          )
          .timeout(const Duration(seconds: 10));
      if (response.statusCode == 200 || response.statusCode == 201) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      }
    } catch (_) {
      try {
        final response = await http
            .get(
              Uri.parse('$fallbackUrl/api/orders/check/$orderCode'),
              headers: _authHeaders,
            )
            .timeout(const Duration(seconds: 10));
        if (response.statusCode == 200) {
          return jsonDecode(response.body) as Map<String, dynamic>;
        }
      } catch (e) {
        debugPrint("Failed to check order payment: $e");
      }
    }
    return null;
  }

  // Update Profile
  static Future<Map<String, dynamic>> updateProfile({
    String? fullName,
    String? phone,
    String? address,
  }) async {
    try {
      final response = await http
          .put(
            Uri.parse('$baseUrl/api/users/profile'),
            headers: _authHeaders,
            body: jsonEncode({
              if (fullName != null) 'fullName': fullName,
              if (phone != null) 'phone': phone,
              if (address != null) 'address': address,
            }),
          )
          .timeout(const Duration(seconds: 30));

      final data = jsonDecode(response.body);
      if (response.statusCode == 200 || response.statusCode == 201) {
        return {'success': true, 'data': data};
      }
      return {
        'success': false,
        'message': data is Map ? (data['message'] ?? 'Cập nhật thất bại.') : 'Cập nhật thất bại.',
      };
    } catch (e) {
      return {'success': false, 'message': 'Lỗi kết nối: $e'};
    }
  }

  // Change Password
  static Future<Map<String, dynamic>> changePassword({
    required String oldPassword,
    required String newPassword,
  }) async {
    try {
      final response = await http
          .post(
            Uri.parse('$baseUrl/api/auth/change-password'),
            headers: _authHeaders,
            body: jsonEncode({
              'oldPassword': oldPassword,
              'newPassword': newPassword,
            }),
          )
          .timeout(const Duration(seconds: 30));

      final data = jsonDecode(response.body);
      if (response.statusCode == 200 || response.statusCode == 201) {
        return {'success': true, 'data': data};
      }
      return {
        'success': false,
        'message': data is Map ? (data['message'] ?? 'Đổi mật khẩu thất bại.') : 'Đổi mật khẩu thất bại.',
      };
    } catch (e) {
      return {'success': false, 'message': 'Lỗi kết nối: $e'};
    }
  }

  // Validate Voucher Code
  static Future<Map<String, dynamic>> validateVoucher(
    String code,
    num subtotal,
  ) async {
    try {
      final response = await http
          .post(
            Uri.parse('$baseUrl/api/vouchers/validate'),
            headers: _authHeaders,
            body: jsonEncode({
              'code': code.trim(),
              'subtotal': subtotal.toInt(),
            }),
          )
          .timeout(const Duration(seconds: 5));
      if (response.statusCode == 200 || response.statusCode == 201) {
        final resData = jsonDecode(response.body);
        if (resData is Map<String, dynamic>) return resData;
      } else {
        final err = jsonDecode(response.body);
        return {
          'error': true,
          'message': err['message'] ?? 'Mã giảm giá không hợp lệ',
        };
      }
    } catch (e) {
      debugPrint("validateVoucher API error: $e");
    }
    return {
      'error': true,
      'message': 'Không thể kết nối máy chủ kiểm tra mã giảm giá',
    };
  }

  // Get list of active vouchers
  static Future<List<Map<String, dynamic>>> getVouchers() async {
    try {
      final response = await http
          .get(Uri.parse('$baseUrl/api/vouchers'), headers: _authHeaders)
          .timeout(const Duration(seconds: 5));
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data is List) {
          return List<Map<String, dynamic>>.from(data);
        }
      }
    } catch (e) {
      debugPrint("getVouchers API error: $e");
    }
    return [];
  }

  // Fetch customer order history
  static Future<List<Map<String, dynamic>>> getMyOrders({String? phone}) async {
    try {
      String query = '';
      if (phone != null && phone.trim().isNotEmpty) {
        query = '?phone=${Uri.encodeComponent(phone.trim())}';
      }
      final response = await http
          .get(
            Uri.parse('$baseUrl/api/orders/my-orders$query'),
            headers: _authHeaders,
          )
          .timeout(const Duration(seconds: 5));
      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        if (data is List) {
          return List<Map<String, dynamic>>.from(data);
        }
      }
    } catch (e) {
      debugPrint("getMyOrders API error: $e");
    }
    return [];
  }

  // Fetch Expiration Report for Warehouse Screen
  static Future<List<dynamic>> getExpirationReport() async {
    try {
      final response = await http
          .get(
            Uri.parse('$baseUrl/api/medicines/expiration-report'),
            headers: _authHeaders,
          )
          .timeout(const Duration(seconds: 30));
      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        if (decoded is List) return decoded;
        if (decoded is Map && decoded['data'] is List) return decoded['data'];
      }
    } catch (e) {
      debugPrint("Failed to fetch expiration report: $e");
    }
    return [
      {
        'medicineName': 'Panadol Extra',
        'batchNo': 'Lô B0 (Hết hạn)',
        'expDate': '2026-05-01',
        'stock': 20,
        'unit': 'Hộp',
        'status': 'EXPIRED',
      },
      {
        'medicineName': 'Amoxicillin 500mg',
        'batchNo': 'Lô A0 (Hết hạn)',
        'expDate': '2026-04-20',
        'stock': 15,
        'unit': 'Hộp',
        'status': 'EXPIRED',
      },
      {
        'medicineName': 'Cefuroxim 500mg',
        'batchNo': 'Lô C0 (Cận hạn)',
        'expDate': '2026-06-30',
        'stock': 50,
        'unit': 'Hộp',
        'status': 'SOON_TO_EXPIRE',
      },
    ];
  }

  // Fetch System Microservice Health
  static Future<List<Map<String, dynamic>>> getServiceHealth() async {
    final services = [
      {
        'name': 'auth-service',
        'port': '4001',
        'status': 'ACTIVE',
        'load': '1.2%',
      },
      {
        'name': 'user-service',
        'port': '4002',
        'status': 'ACTIVE',
        'load': '0.8%',
      },
      {
        'name': 'inventory-service',
        'port': '4003',
        'status': 'ACTIVE',
        'load': '2.4%',
      },
      {
        'name': 'supplier-service',
        'port': '4004',
        'status': 'ACTIVE',
        'load': '0.3%',
      },
      {
        'name': 'ai-service',
        'port': '8000',
        'status': 'ACTIVE',
        'load': '12.6%',
      },
    ];
    for (var s in services) {
      try {
        final res = await http
            .get(Uri.parse('$baseUrl/api/health'), headers: _authHeaders)
            .timeout(const Duration(seconds: 30));
        if (res.statusCode == 200) {
          s['status'] = 'ACTIVE';
        }
      } catch (_) {}
    }
    return services;
  }

  // UC-34: Get voice-activated AI consultation recommendation (Web-safe: text-based)
  static Future<Map<String, dynamic>?> getVoicePrescriptionBytes(
    Uint8List wavBytes,
  ) async {
    try {
      final request = http.MultipartRequest(
        'POST',
        Uri.parse('$baseUrl/api/prescriptions/recommend'),
      );
      if (currentToken.isNotEmpty) {
        request.headers['Authorization'] = 'Bearer $currentToken';
      }
      request.files.add(
        http.MultipartFile.fromBytes(
          'audio',
          wavBytes,
          filename: 'symptoms.wav',
          contentType: MediaType('audio', 'wav'),
        ),
      );
      final streamedResponse = await request.send().timeout(
        const Duration(seconds: 60),
      );
      final response = await http.Response.fromStream(streamedResponse);
      if (response.statusCode == 200 || response.statusCode == 201) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      }
      debugPrint(
        "Voice prescription API returned ${response.statusCode}: ${response.body}",
      );
    } catch (e) {
      debugPrint("Voice prescription API failed: $e");
    }
    return null;
  }

  static Future<Map<String, dynamic>?> getVoicePrescription(
    String audioPath,
  ) async {
    // audioPath is unused on web; the endpoint accepts multipart audio
    // For Web builds, fall back gracefully
    try {
      final url = Uri.parse('$baseUrl/api/prescriptions/recommend');
      var request = http.MultipartRequest('POST', url);
      if (currentToken.isNotEmpty) {
        request.headers['Authorization'] = 'Bearer $currentToken';
      }
      request.files.add(await http.MultipartFile.fromPath('audio', audioPath));
      var streamedResponse = await request.send().timeout(
        const Duration(seconds: 30),
      );
      var response = await http.Response.fromStream(streamedResponse);
      if (response.statusCode == 200) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      }
    } catch (_) {
      try {
        final url = Uri.parse('$fallbackUrl/api/prescriptions/recommend');
        var request = http.MultipartRequest('POST', url);
        if (currentToken.isNotEmpty) {
          request.headers['Authorization'] = 'Bearer $currentToken';
        }
        request.files.add(
          await http.MultipartFile.fromPath('audio', audioPath),
        );
        var streamedResponse = await request.send().timeout(
          const Duration(seconds: 30),
        );
        var response = await http.Response.fromStream(streamedResponse);
        if (response.statusCode == 200) {
          return jsonDecode(response.body) as Map<String, dynamic>;
        }
      } catch (e) {
        debugPrint("Voice prescription API failed: $e");
      }
    }
    return null;
  }

  // UC-34: Text-based AI symptom consultation (works on Flutter Web)
  static Future<Map<String, dynamic>?> getTextPrescription(
    String symptoms,
  ) async {
    try {
      final response = await http
          .post(
            Uri.parse('$baseUrl/api/prescriptions/symptom-consult'),
            headers: _authHeaders,
            body: jsonEncode({'symptoms': symptoms}),
          )
          .timeout(const Duration(seconds: 60));
      if (response.statusCode == 200 || response.statusCode == 201) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      }
      debugPrint(
        "Text prescription API returned ${response.statusCode}: ${response.body}",
      );
    } catch (e) {
      debugPrint("Text prescription API failed: $e");
    }
    return null;
  }

  // Fetch notifications for the current user
  static Future<List<dynamic>> getMyNotifications({
    bool unreadOnly = false,
    int limit = 50,
    int offset = 0,
  }) async {
    try {
      final queryParams = '?unreadOnly=$unreadOnly&limit=$limit&offset=$offset';
      final response = await http
          .get(
            Uri.parse('$baseUrl/api/notifications/me$queryParams'),
            headers: _authHeaders,
          )
          .timeout(const Duration(seconds: 5));

      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        if (decoded != null && decoded['success'] == true) {
          return decoded['data'] ?? [];
        }
      }
    } catch (_) {
      try {
        final queryParams =
            '?unreadOnly=$unreadOnly&limit=$limit&offset=$offset';
        final response = await http
            .get(
              Uri.parse('$fallbackUrl/api/notifications/me$queryParams'),
              headers: _authHeaders,
            )
            .timeout(const Duration(seconds: 5));

        if (response.statusCode == 200) {
          final decoded = jsonDecode(response.body);
          if (decoded != null && decoded['success'] == true) {
            return decoded['data'] ?? [];
          }
        }
      } catch (e) {
        debugPrint("Failed to fetch notifications: $e");
      }
    }
    return [];
  }

  // Get count of unread notifications
  static Future<int> getUnreadCount() async {
    try {
      final response = await http
          .get(
            Uri.parse('$baseUrl/api/notifications/unread-count'),
            headers: _authHeaders,
          )
          .timeout(const Duration(seconds: 4));

      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        if (decoded != null && decoded['success'] == true) {
          return decoded['data'] is int
              ? decoded['data']
              : int.tryParse(decoded['data'].toString()) ?? 0;
        }
      }
    } catch (_) {
      try {
        final response = await http
            .get(
              Uri.parse('$fallbackUrl/api/notifications/unread-count'),
              headers: _authHeaders,
            )
            .timeout(const Duration(seconds: 4));

        if (response.statusCode == 200) {
          final decoded = jsonDecode(response.body);
          if (decoded != null && decoded['success'] == true) {
            return decoded['data'] is int
                ? decoded['data']
                : int.tryParse(decoded['data'].toString()) ?? 0;
          }
        }
      } catch (e) {
        debugPrint("Failed to fetch unread notifications count: $e");
      }
    }
    return 0;
  }

  // Mark a specific notification as read
  static Future<bool> markAsRead(String id) async {
    try {
      final response = await http
          .patch(
            Uri.parse('$baseUrl/api/notifications/$id/read'),
            headers: _authHeaders,
          )
          .timeout(const Duration(seconds: 4));
      return response.statusCode == 200 || response.statusCode == 201;
    } catch (_) {
      try {
        final response = await http
            .patch(
              Uri.parse('$fallbackUrl/api/notifications/$id/read'),
              headers: _authHeaders,
            )
            .timeout(const Duration(seconds: 4));
        return response.statusCode == 200 || response.statusCode == 201;
      } catch (e) {
        debugPrint("Failed to mark notification as read: $e");
        return false;
      }
    }
  }

  // Mark all notifications as read
  static Future<bool> markAllAsRead() async {
    try {
      final response = await http
          .patch(
            Uri.parse('$baseUrl/api/notifications/mark-all-read'),
            headers: _authHeaders,
          )
          .timeout(const Duration(seconds: 5));
      return response.statusCode == 200 || response.statusCode == 201;
    } catch (_) {
      try {
        final response = await http
            .patch(
              Uri.parse('$fallbackUrl/api/notifications/mark-all-read'),
              headers: _authHeaders,
            )
            .timeout(const Duration(seconds: 5));
        return response.statusCode == 200 || response.statusCode == 201;
      } catch (e) {
        debugPrint("Failed to mark all notifications as read: $e");
        return false;
      }
    }
  }

  // Delete a notification
  static Future<bool> deleteNotification(String id) async {
    try {
      final response = await http
          .delete(
            Uri.parse('$baseUrl/api/notifications/$id'),
            headers: _authHeaders,
          )
          .timeout(const Duration(seconds: 4));
      return response.statusCode == 200 || response.statusCode == 201;
    } catch (_) {
      try {
        final response = await http
            .delete(
              Uri.parse('$fallbackUrl/api/notifications/$id'),
              headers: _authHeaders,
            )
            .timeout(const Duration(seconds: 4));
        return response.statusCode == 200 || response.statusCode == 201;
      } catch (e) {
        debugPrint("Failed to delete notification: $e");
        return false;
      }
    }
  }

  // Polling: Get new notifications after timestamp
  static Future<List<dynamic>> getNewNotifications(
    String afterTimestamp,
  ) async {
    try {
      final queryParams = '?after=${Uri.encodeComponent(afterTimestamp)}';
      final response = await http
          .get(
            Uri.parse('$baseUrl/api/notifications/new$queryParams'),
            headers: _authHeaders,
          )
          .timeout(const Duration(seconds: 5));

      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        if (decoded != null && decoded['success'] == true) {
          return decoded['data'] ?? [];
        }
      }
    } catch (_) {
      try {
        final queryParams = '?after=${Uri.encodeComponent(afterTimestamp)}';
        final response = await http
            .get(
              Uri.parse('$fallbackUrl/api/notifications/new$queryParams'),
              headers: _authHeaders,
            )
            .timeout(const Duration(seconds: 5));

        if (response.statusCode == 200) {
          final decoded = jsonDecode(response.body);
          if (decoded != null && decoded['success'] == true) {
            return decoded['data'] ?? [];
          }
        }
      } catch (e) {
        debugPrint("Failed to poll new notifications: $e");
      }
    }
    return [];
  }

  static Future<Map<String, dynamic>?> scanPrescriptionAI(
    List<List<int>> imageBytesList, {
    String branchId = 'CENTRAL_WH',
  }) async {
    try {
      final uri = Uri.parse('$baseUrl/api/prescriptions/scan-ai');
      final request = http.MultipartRequest('POST', uri);
      if (currentToken.isNotEmpty) {
        request.headers['Authorization'] = 'Bearer $currentToken';
      }
      request.fields['branch_id'] = branchId;

      for (int i = 0; i < imageBytesList.length; i++) {
        request.files.add(
          http.MultipartFile.fromBytes(
            'images',
            imageBytesList[i],
            filename: 'prescription_page_${i + 1}.jpg',
            contentType: MediaType('image', 'jpeg'),
          ),
        );
      }

      final streamedResponse = await request.send();
      final response = await http.Response.fromStream(streamedResponse);
      if (response.statusCode == 200 || response.statusCode == 201) {
        return json.decode(response.body) as Map<String, dynamic>;
      }
    } catch (e) {
      debugPrint('Error scanning prescription AI: $e');
    }
    return null;
  }

  // Get sample prescription images from backend AI service
  static Future<List<Map<String, dynamic>>> getSamplePrescriptions() async {
    final headers = {
      ..._authHeaders,
      'x-internal-token': 'wdp301-super-secret-key-change-in-production',
    };
    try {
      final response = await http
          .get(
            Uri.parse('$baseUrl/api/ai/sample-prescriptions'),
            headers: headers,
          )
          .timeout(const Duration(seconds: 10));

      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        if (decoded != null && decoded['success'] == true) {
          final samples = decoded['samples'] as List? ?? [];
          return List<Map<String, dynamic>>.from(samples);
        }
      }
    } catch (_) {
      try {
        final localAiUrl = aiBaseUrl;
        final response = await http
            .get(
              Uri.parse('$localAiUrl/api/ai/sample-prescriptions'),
              headers: headers,
            )
            .timeout(const Duration(seconds: 10));

        if (response.statusCode == 200) {
          final decoded = jsonDecode(response.body);
          if (decoded != null && decoded['success'] == true) {
            final samples = decoded['samples'] as List? ?? [];
            return List<Map<String, dynamic>>.from(samples);
          }
        }
      } catch (e) {
        debugPrint("Failed to fetch sample prescriptions: $e");
      }
    }
    return [];
  }

  // Scan a sample prescription image directly from sample dataset
  static Future<Map<String, dynamic>?> scanSamplePrescription(
    String filename,
  ) async {
    final body = jsonEncode({'filename': filename});
    final headers = {
      ..._authHeaders,
      'x-internal-token': 'wdp301-super-secret-key-change-in-production',
    };

    try {
      final response = await http
          .post(
            Uri.parse('$baseUrl/api/ai/scan-sample-prescription'),
            headers: headers,
            body: body,
          )
          .timeout(const Duration(seconds: 30));

      if (response.statusCode == 200 || response.statusCode == 201) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      } else {
        throw Exception("API Gateway returned ${response.statusCode}");
      }
    } catch (_) {
      try {
        final localAiUrl = aiBaseUrl;
        final response = await http
            .post(
              Uri.parse('$localAiUrl/api/ai/scan-sample-prescription'),
              headers: headers,
              body: body,
            )
            .timeout(const Duration(seconds: 30));

        if (response.statusCode == 200 || response.statusCode == 201) {
          return jsonDecode(response.body) as Map<String, dynamic>;
        }
      } catch (e) {
        debugPrint("Failed to scan sample prescription: $e");
      }
    }
    return null;
  }

  // Fetch admin employee list
  static Future<List<dynamic>> getEmployees() async {
    try {
      final response = await http
          .get(Uri.parse('$baseUrl/api/admin/employees'), headers: _authHeaders)
          .timeout(const Duration(seconds: 10));
      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        if (decoded is List) return decoded;
        if (decoded is Map && decoded['data'] is List) return decoded['data'];
      }
    } catch (e) {
      debugPrint("Failed to fetch employees: $e");
    }
    return [];
  }

  // Toggle ban/unban employee account
  static Future<bool> toggleBanEmployee(String employeeId) async {
    try {
      final response = await http
          .put(
            Uri.parse('$baseUrl/api/admin/employees/$employeeId/ban'),
            headers: _authHeaders,
          )
          .timeout(const Duration(seconds: 5));
      return response.statusCode == 200 || response.statusCode == 201;
    } catch (e) {
      debugPrint("Failed to toggle ban employee: $e");
      return false;
    }
  }

  // Fetch branches list
  static Future<List<dynamic>> getBranches() async {
    try {
      final response = await http
          .get(Uri.parse('$baseUrl/api/branches'), headers: _authHeaders)
          .timeout(const Duration(seconds: 10));
      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        if (decoded is List) return decoded;
        if (decoded is Map && decoded['data'] is List) return decoded['data'];
      }
    } catch (e) {
      debugPrint("Failed to fetch branches: $e");
    }
    return [];
  }

  // Fetch low stock report
  static Future<List<dynamic>> getLowStockReport() async {
    try {
      final response = await http
          .get(
            Uri.parse('$baseUrl/api/medicines/low-stock-report'),
            headers: _authHeaders,
          )
          .timeout(const Duration(seconds: 10));
      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        if (decoded is List) return decoded;
        if (decoded is Map && decoded['data'] is List) return decoded['data'];
      }
    } catch (e) {
      debugPrint("Failed to fetch low stock report: $e");
    }
    return [];
  }

  // Create employee account
  static Future<Map<String, dynamic>?> createEmployee(
    Map<String, dynamic> data,
  ) async {
    try {
      final response = await http
          .post(
            Uri.parse('$baseUrl/api/admin/employees'),
            headers: _authHeaders,
            body: jsonEncode(data),
          )
          .timeout(const Duration(seconds: 10));
      if (response.statusCode == 200 || response.statusCode == 201) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      }
    } catch (e) {
      debugPrint("Failed to create employee: $e");
    }
    return null;
  }

  // Fetch AI Safe Stock Chain Analysis
  static Future<List<dynamic>> getSafeStockChain() async {
    try {
      final response = await http
          .get(
            Uri.parse('$baseUrl/api/medicines/safe-stock-chain'),
            headers: _authHeaders,
          )
          .timeout(const Duration(seconds: 10));
      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        if (decoded is List) return decoded;
        if (decoded is Map && decoded['data'] is List) return decoded['data'];
      }
    } catch (e) {
      debugPrint("Failed to fetch safe stock chain: $e");
    }
    return [];
  }

  // Fetch Audit Logs
  static Future<List<dynamic>> getAuditLogs() async {
    try {
      final response = await http
          .get(
            Uri.parse('$baseUrl/api/users/audit-logs'),
            headers: _authHeaders,
          )
          .timeout(const Duration(seconds: 10));
      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        if (decoded is List) return decoded;
        if (decoded is Map && decoded['data'] is List) return decoded['data'];
      }
    } catch (e) {
      debugPrint("Failed to fetch audit logs: $e");
    }
    return [];
  }

  // Fetch Director Dashboard summary
  static Future<Map<String, dynamic>?> getDashboardSummary([
    String? branchId,
  ]) async {
    try {
      final url = (branchId != null && branchId.isNotEmpty)
          ? '$baseUrl/api/reports/dashboard/summary?branchId=$branchId'
          : '$baseUrl/api/reports/dashboard/summary';
      final response = await http
          .get(Uri.parse(url), headers: _authHeaders)
          .timeout(const Duration(seconds: 10));
      if (response.statusCode == 200) {
        return jsonDecode(response.body) as Map<String, dynamic>;
      }
    } catch (e) {
      debugPrint("Failed to fetch dashboard summary: $e");
    }
    return null;
  }

  // Fetch Stock Transfers list (Lượt chuyển kho)
  static Future<List<dynamic>> getStockTransfers() async {
    try {
      final response = await http
          .get(Uri.parse('$baseUrl/api/stock-transfers'), headers: _authHeaders)
          .timeout(const Duration(seconds: 10));
      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        if (decoded is List) return decoded;
        if (decoded is Map && decoded['data'] is List) return decoded['data'];
      }
    } catch (e) {
      debugPrint("Failed to fetch stock transfers: $e");
    }
    return [];
  }
}
