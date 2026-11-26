import 'package:flutter_test/flutter_test.dart';
import 'package:crorebet_app/utils/bid_cart.dart';

void main() {
  test('successful session batches are removed so they cannot be submitted twice', () {
    final cart = <Map<String, dynamic>>[
      {'session': 'open', 'digits': '1'},
      {'session': 'close', 'digits': '2'},
      {'session': 'open', 'digits': '3'},
    ];
    removePlacedBidGroups(cart, {'open'});
    expect(cart, [{'session': 'close', 'digits': '2'}]);
  });

  test('successful game and session group is removed without removing other games', () {
    final cart = <Map<String, dynamic>>[
      {'apiGameType': 'single_panna', 'session': 'close', 'digits': '123'},
      {'apiGameType': 'double_panna', 'session': 'close', 'digits': '122'},
    ];
    removePlacedBidGroups(cart, {'single_panna|close'}, byGameType: true);
    expect(cart, [{'apiGameType': 'double_panna', 'session': 'close', 'digits': '122'}]);
  });
}
