/// Safe parsing for API JSON (handles mixed types and key casing).
int pickInt(dynamic v, [int fallback = 0]) {
  if (v == null) return fallback;
  if (v is int) return v;
  if (v is num) return v.toInt();
  return int.tryParse('$v'.trim()) ?? fallback;
}

double pickDouble(dynamic v, [double fallback = 0]) {
  if (v == null) return fallback;
  if (v is double) return v;
  if (v is num) return v.toDouble();
  return double.tryParse('$v'.trim()) ?? fallback;
}

String pickStr(dynamic v, [String fallback = '']) {
  if (v == null) return fallback;
  final s = '$v'.trim();
  return s.isEmpty ? fallback : s;
}

String pickField(Map<dynamic, dynamic> map, List<String> keys, [String fallback = '']) {
  for (final key in keys) {
    for (final entry in map.entries) {
      if ('${entry.key}'.toLowerCase() == key.toLowerCase()) {
        final s = pickStr(entry.value, '');
        if (s.isNotEmpty) return s;
      }
    }
  }
  return fallback;
}

int pickFieldInt(Map<dynamic, dynamic> map, List<String> keys, [int fallback = 0]) {
  for (final key in keys) {
    for (final entry in map.entries) {
      if ('${entry.key}'.toLowerCase() == key.toLowerCase()) {
        return pickInt(entry.value, fallback);
      }
    }
  }
  return fallback;
}

bool pickBool(dynamic v) {
  if (v is bool) return v;
  if (v is num) return v != 0;
  final s = '$v'.trim().toLowerCase();
  return s == '1' || s == 'true' || s == 'yes';
}

List<Map<String, dynamic>> pickMapList(dynamic data) {
  if (data is List) {
    return data.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
  }
  if (data is Map) {
    for (final key in const ['orders', 'data', 'items', 'results', 'list']) {
      final inner = data[key];
      if (inner is List) {
        return inner.whereType<Map>().map((e) => Map<String, dynamic>.from(e)).toList();
      }
    }
  }
  return [];
}

Map<String, dynamic> asMap(dynamic data) {
  if (data is Map<String, dynamic>) return data;
  if (data is Map) return Map<String, dynamic>.from(data);
  return {};
}
