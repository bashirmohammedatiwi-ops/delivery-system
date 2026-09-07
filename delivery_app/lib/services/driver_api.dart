import 'dart:convert';
import 'api_service.dart';
import '../utils/json_helpers.dart';
import '../utils/driver_order_utils.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:intl/intl.dart';

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

  /// Server business day (Iraq timezone + dayStartHour from settings).
  static Future<String> getToday() async {
    try {
      final res = await ApiService.instance.get('/api/driver/today');
      final today = pickStr(asMap(res)['today']);
      if (today.length >= 10) return today.substring(0, 10);
    } catch (_) {}
    return DateFormat('yyyy-MM-dd').format(DateTime.now());
  }

  static String addDays(String date, int delta) {
    final dt = DateTime.tryParse('$date 12:00:00') ?? DateTime.now();
    return DateFormat('yyyy-MM-dd').format(dt.add(Duration(days: delta)));
  }

  static Future<List<dynamic>> getOrders() async {
    final res = await ApiService.instance.get('/api/driver/orders');
    return pickMapList(res);
  }

  static Future<Map<String, dynamic>> receiveOrder(String shipmentNumber) async {
    return ApiService.instance.post(
      '/api/driver/receive-order',
      {'shipmentNumber': shipmentNumber},
    );
  }

  static Future<List<dynamic>> getPendingOrders(String dateFrom, String dateTo) async {
    final res = await ApiService.instance.get(
      '/api/driver/pending-orders?dateFrom=${Uri.encodeComponent(dateFrom)}&dateTo=${Uri.encodeComponent(dateTo)}',
    );
    return pickMapList(res);
  }

  static Future<List<dynamic>> getPendingOrdersList(String date, String area) async {
    final res = await ApiService.instance.get(
      '/api/driver/pending-orders-list?date=${Uri.encodeComponent(date)}&area=${Uri.encodeComponent(area)}',
    );
    return pickMapList(res);
  }

  static Future<Map<String, dynamic>> getStats(String date) async {
    final res = await ApiService.instance.get('/api/driver/stats?date=${Uri.encodeComponent(date)}');
    return asMap(res);
  }

  static Future<List<dynamic>> getDeliveredOrders(String date) async {
    final res = await ApiService.instance.get('/api/driver/delivered-orders?date=${Uri.encodeComponent(date)}');
    return pickMapList(res);
  }

  static Future<List<dynamic>> getReturnedOrders(String date) async {
    final res = await ApiService.instance.get('/api/driver/returned-orders?date=${Uri.encodeComponent(date)}');
    return pickMapList(res);
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

  static Future<List<dynamic>> getDeferredOrders() async {
    try {
      final res = await ApiService.instance.get('/api/driver/deferred-orders');
      return pickMapList(res);
    } catch (_) {
      final all = await getOrders();
      return deferredOrdersFrom(all);
    }
  }

  static Future<void> deferOrder(int orderId, String reason) async {
    await ApiService.instance.post(
      '/api/driver/orders/$orderId/defer',
      {'reason': reason},
    );
  }

  static Future<void> resumeDeferredOrder(int orderId) async {
    await ApiService.instance.post('/api/driver/orders/$orderId/resume-defer');
  }
}
