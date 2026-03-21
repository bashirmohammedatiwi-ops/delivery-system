import 'dart:convert';
import 'package:http/http.dart' as http;
import '../config/api_config.dart';

class ApiService {
  static final ApiService _instance = ApiService._();
  static ApiService get instance => _instance;

  ApiService._();

  String? _token;
  String get token => _token ?? '';

  void setToken(String? t) => _token = t;

  Future<dynamic> get(String path) async {
    final url = Uri.parse('${ApiConfig.baseUrl}$path');
    final headers = {'Content-Type': 'application/json'};
    if (_token != null && _token!.isNotEmpty) {
      headers['Authorization'] = 'Bearer $_token';
    }
    final res = await http.get(url, headers: headers);
    return _handleResponse(res);
  }

  Future<Map<String, dynamic>> post(String path, [Map<String, dynamic>? body]) async {
    final url = Uri.parse('${ApiConfig.baseUrl}$path');
    final headers = {'Content-Type': 'application/json'};
    if (_token != null && _token!.isNotEmpty) {
      headers['Authorization'] = 'Bearer $_token';
    }
    final res = await http.post(
      url,
      headers: headers,
      body: body != null ? jsonEncode(body) : null,
    );
    return _handleResponse(res);
  }

  Future<List<int>> postBytes(String path, [Map<String, dynamic>? body]) async {
    final url = Uri.parse('${ApiConfig.baseUrl}$path');
    final headers = {'Content-Type': 'application/json'};
    if (_token != null && _token!.isNotEmpty) {
      headers['Authorization'] = 'Bearer $_token';
    }
    final res = await http.post(
      url,
      headers: headers,
      body: body != null ? jsonEncode(body) : null,
    );
    if (res.statusCode >= 200 && res.statusCode < 300) {
      return res.bodyBytes;
    }
    try {
      final j = jsonDecode(res.body) as Map<String, dynamic>?;
      throw Exception(j?['error'] ?? res.body);
    } on Object catch (_) {
      throw Exception(res.body);
    }
  }

  Future<Map<String, dynamic>> put(String path, [Map<String, dynamic>? body]) async {
    final url = Uri.parse('${ApiConfig.baseUrl}$path');
    final headers = {'Content-Type': 'application/json'};
    if (_token != null && _token!.isNotEmpty) {
      headers['Authorization'] = 'Bearer $_token';
    }
    final res = await http.put(
      url,
      headers: headers,
      body: body != null ? jsonEncode(body) : null,
    );
    return _handleResponse(res);
  }

  dynamic _handleResponse(http.Response res) {
    final text = res.body;
    if (res.statusCode >= 200 && res.statusCode < 300) {
      if (text.isEmpty) return <String, dynamic>{};
      try {
        return jsonDecode(text);
      } on Object catch (_) {
        return {'_raw': text};
      }
    }
    try {
      final j = jsonDecode(text) as Map<String, dynamic>?;
      throw Exception(j?['error'] ?? text);
    } on Object catch (_) {
      throw Exception(text);
    }
  }
}
