import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('app assets are bundled', (tester) async {
    for (final path in [
      'assets/images/MagicBoss.webp',
      'assets/images/cosmic_chart.png',
      'assets/games/single.gif',
      'assets/translations/en.json',
    ]) {
      expect((await rootBundle.load(path)).lengthInBytes, greaterThan(0));
    }
  });
}
