import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/screens/warehouse_screen.dart';

void main() {
  testWidgets('WarehouseScreen progress and skip state test', (WidgetTester tester) async {
    await tester.pumpWidget(
      const MaterialApp(
        home: Scaffold(
          body: WarehouseScreen(),
        ),
      ),
    );

    // Let the async fallback complete
    await tester.pumpAndSettle();

    // Verify tabs are present
    expect(find.byType(TabBar), findsOneWidget);
    expect(find.text('Tồn Kho'), findsOneWidget);
    expect(find.text('Kiểm Nhận AI'), findsOneWidget);

    // Navigate to Kiểm Nhận AI tab
    await tester.tap(find.text('Kiểm Nhận AI'));
    await tester.pumpAndSettle();

    // Verify pending GRN card header is displayed
    expect(find.text('Phiếu Nhập Hàng Chờ Kiểm Nhận (GRN)'), findsOneWidget);
    expect(find.text('Phiếu: GRN-001'), findsOneWidget);
  });
}
