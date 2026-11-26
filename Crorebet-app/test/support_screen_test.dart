import 'package:crorebet_app/screens/support/support_screen.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('support prompt and typed text remain visible with dark theme', (tester) async {
    await tester.pumpWidget(MaterialApp(theme: ThemeData.dark(), home: SupportScreen(loadQuestions: () async => [], loadMessages: () async => [])));
    await tester.pump();
    final prompt = tester.widget<Text>(find.text('Hello! How can I help you?'));
    expect(prompt.style?.color, const Color(0xFF063D30));
    expect(find.byType(TextField), findsNothing);
    await tester.tap(find.text('Other problem — contact support'));
    await tester.pump();
    final field = tester.widget<TextField>(find.byType(TextField));
    expect(field.style?.color, const Color(0xFF063D30));
    expect(field.decoration?.hintStyle?.color, const Color(0xFF596E63));
    await tester.enterText(find.byType(TextField), 'Hello support');
    expect(find.text('Hello support'), findsOneWidget);
    await tester.pumpWidget(const SizedBox.shrink());
  });

  testWidgets('users can read automatic answers and contact support', (tester) async {
    await tester.pumpWidget(MaterialApp(home: SupportScreen(
      loadQuestions: () async => [{'question': 'Where is my deposit?', 'answer': 'Please check your payment status.'}],
      loadMessages: () async => [],
    )));
    await tester.pump();
    expect(find.text('Where is my deposit?'), findsOneWidget);
    expect(find.text('Please check your payment status.'), findsNothing);
    expect(find.byType(TextField), findsNothing);
    await tester.tap(find.text('Where is my deposit?'));
    await tester.pumpAndSettle();
    expect(find.text('Where is my deposit?'), findsOneWidget);
    expect(tester.widget<Text>(find.text('Where is my deposit?')).style?.color, Colors.white);
    expect(find.text('Please check your payment status.'), findsOneWidget);
    expect(tester.getTopLeft(find.text('Where is my deposit?')).dy, lessThan(tester.getTopLeft(find.text('Please check your payment status.')).dy));
    await tester.tap(find.text('No, contact support'));
    await tester.pump();
    expect(find.text('Contact the support team'), findsOneWidget);
    expect(find.byType(TextField), findsOneWidget);
    expect(find.text('Where is my deposit?'), findsNothing);
    await tester.pumpWidget(const SizedBox.shrink());
  });
}
