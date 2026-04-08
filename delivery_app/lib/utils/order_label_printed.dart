/// يتعامل مع قيم LabelPrinted القادمة من الـ API (bool / int / double / String).
bool isOrderLabelPrinted(Map<String, dynamic> o) {
  final v = o['LabelPrinted'] ?? o['labelprinted'];
  if (v == true) return true;
  if (v == false || v == null) return false;
  if (v is num) return v != 0;
  final s = v.toString().trim().toLowerCase();
  return s == '1' || s == 'true' || s == 'yes';
}
