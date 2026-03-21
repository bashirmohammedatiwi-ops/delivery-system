import 'dart:convert';
import 'api_service.dart';
import 'package:shared_preferences/shared_preferences.dart';

class DriverApi {
  static const _tokenKey = 'driverToken';
  static const _driverKey = 'driverData';

  static Future<void> initToken() async {
    final prefs = await SharedPreferences.getInstance();
    ApiService.instance.setToken(prefs.getString(_tokenKey));
  }

  static Future<void> saveLogin(String token, Map<String, dynamic> driver) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, token);
    await prefs.setString(_driverKey, jsonEncode(driver));
    ApiService.instance.setToken(token);
  }

  static Future<Map<String, dynamic>?> getDriver() async {
    final prefs = await SharedPreferences.getInstance();
    final s = prefs.getString(_driverKey);
    if (s == null) return null;
    try {
      return jsonDecode(s) as Map<String, dynamic>;
    } catch (_) {
      return null;
    }
  }

  static Future<void> logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    await prefs.remove(_driverKey);
    ApiService.instance.setToken(null);
    try {
      await ApiService.instance.post('/api/auth/driver-logout');
    } catch (_) {}
  }

  static Future<Map<String, dynamic>> login(String username, String password) async {
    final data = await ApiService.instance.post(
      '/api/auth/driver-login',
      {'username': username, 'password': password},
    );
    return data;
  }

  static Future<List<dynamic>> getOrders() async {
    final res = await ApiService.instance.get('/api/driver/orders');
    if (res is List) return List<dynamic>.from(res);
    if (res is Map) return List<dynamic>.from((res['orders'] as List?) ?? []);
    return [];
  }

  static Future<Map<String, dynamic>> receiveOrder(String shipmentNumber) async {
    return ApiService.instance.post(
      '/api/driver/receive-order',
      {'shipmentNumber': shipmentNumber},
    );
  }

  static Future<List<dynamic>> getPendingOrders(String dateFrom, String dateTo) async {
    final res = await ApiService.instance.get(
      '/api/driver/pending-orders?dateFrom=$dateFrom&dateTo=$dateTo',
    );
    return res is List ? List<dynamic>.from(res) : <dynamic>[];
  }

  static Future<List<dynamic>> getPendingOrdersList(String date, String area) async {
    final res = await ApiService.instance.get(
      '/api/driver/pending-orders-list?date=${Uri.encodeComponent(date)}&area=${Uri.encodeComponent(area)}',
    );
    return res is List ? List<dynamic>.from(res) : <dynamic>[];
  }

  static Future<Map<String, dynamic>> getStats(String date) async {
    final res = await ApiService.instance.get('/api/driver/stats?date=$date');
    return res is Map<String, dynamic> ? res : <String, dynamic>{};
  }

  static Future<List<dynamic>> getDeliveredOrders(String date) async {
    final res = await ApiService.instance.get('/api/driver/delivered-orders?date=$date');
    return res is List ? List<dynamic>.from(res) : <dynamic>[];
  }

  static Future<List<dynamic>> getReturnedOrders(String date) async {
    final res = await ApiService.instance.get('/api/driver/returned-orders?date=$date');
    return res is List ? List<dynamic>.from(res) : <dynamic>[];
  }

  static Future<void> deliverOrder(int orderId) async {
    await ApiService.instance.post('/api/driver/orders/$orderId/deliver');
  }

  static Future<void> returnOrder(int orderId, String reason) async {
    await ApiService.instance.post(
      '/api/driver/orders/$orderId/return',
      {'returnReason': reason},
    );
  }
}
