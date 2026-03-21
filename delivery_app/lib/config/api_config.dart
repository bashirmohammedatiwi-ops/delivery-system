/// إعدادات الاتصال بالسيرفر
class ApiConfig {
  static const String baseUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: 'https://demaalhayaadelivery.online',
  );
}
