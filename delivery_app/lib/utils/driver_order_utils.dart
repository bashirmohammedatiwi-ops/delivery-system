import 'json_helpers.dart';

bool isDeferredOrder(Map<String, dynamic> order) =>
    pickBool(order['IsDeferred'] ?? order['isdeferred']);

int orderIdOf(Map<String, dynamic> order) =>
    pickFieldInt(order, ['OrderID', 'orderid']);

List<Map<String, dynamic>> deferredOrdersFrom(List<dynamic> orders) {
  return orders
      .whereType<Map>()
      .map((e) => Map<String, dynamic>.from(e))
      .where(isDeferredOrder)
      .toList();
}
