import 'package:flutter_test/flutter_test.dart';
import 'package:crorebet_app/screens/referral/share_now_screen.dart';

void main() {
  test('share branding updates the old link while preserving referral codes', () {
    expect(cbShareBranding('Join Magic Boss with AB12: https://magicbossapp.com/register?ref=AB12'),
      'Join CB with AB12: https://crorebet.com/register?ref=AB12');
    expect(cbShareBranding('Join Crorebet and play'), 'Join CB and play');
    expect(cbShareBranding('https://crorebetapp.com/'), 'https://crorebetapp.com/');
    expect(cbReferralLink('CB12345678'), 'https://crorebet.com/register?ref=CB12345678');
  });
}
