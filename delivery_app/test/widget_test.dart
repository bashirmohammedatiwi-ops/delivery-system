import 'package:flutter_test/flutter_test.dart';
import 'package:delivery_app/main.dart';

void main() {
  testWidgets('Entry screen loads', (WidgetTester tester) async {
    await tester.pumpWidget(const DeliveryApp());
    expect(find.text('ديما الحياة'), findsOneWidget);
    expect(find.text('تطبيق السائق'), findsOneWidget);
    expect(find.text('تطبيق الموظف'), findsOneWidget);
  });
}
