import 'api_service.dart';
import 'package:shared_preferences/shared_preferences.dart';

class EmployeeApi {
  static const _tokenKey = 'appToken';

  static Future<void> initToken() async {
    final prefs = await SharedPreferences.getInstance();
    ApiService.instance.setToken(prefs.getString(_tokenKey));
  }

  static Future<void> saveLogin(String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);
    ApiService.instance.setToken(token);
  }

  static Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    ApiService.instance.setToken(null);
    try {
      await ApiService.instance.post('/api/auth/logout');
    } catch (_) {}
  }

  static Future<Map<String, dynamic>> login(String username, String password) async {
    return ApiService.instance.post(
      '/api/auth/login',
      {'username': username, 'password': password},
    );
  }

  static Future<Map<String, dynamic>> me() async {
    final res = await ApiService.instance.get('/api/auth/me');
    return res is Map<String, dynamic> ? res : <String, dynamic>{};
  }

  static Future<List<dynamic>> getOrders({String? search, String? status, String? dateFrom, String? dateTo, int? limit}) async {
    final q = <String, String>{};
    if (search != null && search.isNotEmpty) q['search'] = search;
    if (status != null) q['status'] = status;
    if (dateFrom != null) q['dateFrom'] = dateFrom;
    if (dateTo != null) q['dateTo'] = dateTo;
    if (limit != null) q['limit'] = limit.toString();
    final path = q.isEmpty ? '/api/orders' : '/api/orders?${Uri(queryParameters: q).query}';
    final res = await ApiService.instance.get(path);
    return res is List ? List<dynamic>.from(res) : <dynamic>[];
  }

  static Future<Map<String, dynamic>> getOrderById(int id) async {
    final res = await ApiService.instance.get('/api/orders/$id');
    return res is Map<String, dynamic> ? res : <String, dynamic>{};
  }

  static Future<Map<String, dynamic>> getCustomerStatsByPhone(String phoneDigits) async {
    final p = phoneDigits.trim();
    if (p.isEmpty) return <String, dynamic>{'deliveredCount': 0, 'returnedCount': 0};
    final res = await ApiService.instance.get('/api/customers/order-stats?phone=${Uri.encodeComponent(p)}');
    return res is Map<String, dynamic> ? res : <String, dynamic>{'deliveredCount': 0, 'returnedCount': 0};
  }

  static Future<Map<String, dynamic>> getSettingsDefaults() async {
    final res = await ApiService.instance.get('/api/settings/defaults');
    return res is Map<String, dynamic> ? res : <String, dynamic>{};
  }

  static Future<Map<String, dynamic>> verifyDriverPassword(String password) async {
    final res = await ApiService.instance.post('/api/drivers/verify-password', {'password': password});
    return res is Map<String, dynamic> ? res : <String, dynamic>{};
  }

  static Future<List<int>> getLabelPdf(Map<String, dynamic> order) async {
    return ApiService.instance.postBytes('/api/label/pdf', order);
  }

  static Future<void> markLabelPrinted(int orderId) async {
    await ApiService.instance.post('/api/orders/$orderId/mark-label-printed');
  }

  static Future<Map<String, dynamic>> createOrder(Map<String, dynamic> data) async {
    return ApiService.instance.post('/api/orders', data);
  }

  static Future<Map<String, dynamic>> updateOrder(int id, Map<String, dynamic> data) async {
    return ApiService.instance.put('/api/orders/$id', data);
  }

  static Future<List<dynamic>> getDrivers() async {
    final res = await ApiService.instance.get('/api/drivers?active=true');
    return res is List ? List<dynamic>.from(res) : <dynamic>[];
  }

  static Future<List<dynamic>> getRegions() async {
    final res = await ApiService.instance.get('/api/regions');
    return res is List ? List<dynamic>.from(res) : <dynamic>[];
  }

  static Future<Map<String, dynamic>> assignOrder(String shipmentNumber, int driverId) async {
    return ApiService.instance.post('/api/orders/assign', {
      'shipmentNumber': shipmentNumber,
      'driverId': driverId,
    });
  }
}
