/// ذاكرة مؤقتة لقائمة الطلبات — عرض فوري عند العودة للتبويب
class EmpOrdersCache {
  EmpOrdersCache._();

  static List<Map<String, dynamic>>? orders;
  static DateTime? fetchedAt;
  static const _maxAge = Duration(minutes: 3);

  static bool get isFresh =>
      orders != null && fetchedAt != null && DateTime.now().difference(fetchedAt!) < _maxAge;

  static void save(List<Map<String, dynamic>> data) {
    orders = List<Map<String, dynamic>>.from(data);
    fetchedAt = DateTime.now();
  }

  static void clear() {
    orders = null;
    fetchedAt = null;
  }
}
