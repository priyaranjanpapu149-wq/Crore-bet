import { useLocation } from 'react-router-dom';

const MAP: Record<string, string> = {
  '/users': 'All Users',
  '/deposits': 'Deposit Transactions',
  '/auto-result': 'Auto Result',
  '/oc-cutting': 'OC Cutting Group',
  '/reports/betting': 'Betting Report',
  '/games/providers': 'Game Providers',
  '/games/rates': 'Game Rates',
  '/games/result': 'Game Result',
  '/games/result-old': 'Game Result Old',
  '/reports/prediction': 'Winner Prediction',
  '/reports/profit-loss': 'Profit / Loss',
  '/reports/winners': 'Winning Details',
  '/reports/bet-filter': 'Bet Filter',
  '/reports/sell': 'Customer Sell Report',
  '/bids': 'Bid History',
  '/reports/withdraw': 'Withdraw Report',
  '/wallet/upi': 'UPI Verification',
  '/wallet/auto-add': 'Auto Add Points',
  '/wallet/transactions': 'Transactions Data',
  '/wallet/bonus': 'Deposit Bonus',
  '/wallet/withdrawals': 'Withdraw Points Request',
  '/wallet/add-points': 'Add Points (User Wallet)',
  '/wallet/bid-revert': 'Bid Revert',
  '/settings/password': 'Change Password',
  '/settings/main': 'Main Settings',
  '/settings/contact': 'Contact Us Details',
  '/settings/slider': 'Image Slider',
  '/settings/how-to-play': 'How To Play',
  '/settings/videos': 'Videos',
  '/notice': 'Notice Management',
  '/notice/send': 'Send Notification',
  '/numbers/single': 'Single Digit',
  '/numbers/jodi': 'Jodi Digit',
  '/numbers/single-pana': 'Single Pana',
  '/numbers/double-pana': 'Double Pana',
  '/numbers/triple-pana': 'Triple Pana',
  '/numbers/half-sangam': 'Half Sangam',
  '/numbers/full-sangam': 'Full Sangam',
  '/numbers/personal': 'Personal Games',
  '/starline/providers': 'Starline — Game Provider',
  '/starline/profit-loss': 'Starline — Profit Loss',
  '/starline/rates': 'Starline — Game Rates',
  '/starline/bids': 'Starline — Bid History',
  '/starline/upcoming': 'Starline — Upcoming Result',
  '/starline/result': 'Starline — Game Result',
  '/starline/sell': 'Starline — Sell Report',
  '/starline/winners': 'Starline — Winning Report',
  '/jackpot/providers': 'Jackpot — Game Provider',
  '/jackpot/rates': 'Jackpot — Game Rates',
  '/jackpot/bids': 'Jackpot — Bid History',
  '/jackpot/result': 'Jackpot — Game Result',
  '/jackpot/sell': 'Jackpot — Sell Report',
};

export default function Placeholder() {
  const { pathname } = useLocation();
  const title = MAP[pathname] || 'Page';
  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">{title}</h1>
      <div className="card text-slate-400">
        <p>This page is scaffolded. UI will be added in the next build phase.</p>
        <p className="text-xs mt-2">Path: <code className="text-brand-accent">{pathname}</code></p>
      </div>
    </div>
  );
}
