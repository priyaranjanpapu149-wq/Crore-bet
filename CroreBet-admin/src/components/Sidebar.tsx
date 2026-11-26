import { NavLink } from 'react-router-dom';
import { useState } from 'react';

interface Item {
  label: string;
  path?: string;
  icon?: string;
  children?: Item[];
}

const MENU: Item[] = [
  { label: 'Dashboard', path: '/', icon: 'dashboard' },
  { label: 'All Users', path: '/users', icon: 'users' },
  { label: 'Referrals', path: '/referrals', icon: 'gift' },
  { label: 'Support', path: '/support', icon: 'users' },
  { label: 'Deposit Transactions', path: '/deposits', icon: 'deposit' },
  { label: 'Auto Result', path: '/auto-result', icon: 'refresh' },
  { label: 'OC Cutting Group', path: '/oc-cutting', icon: 'scissors' },
  { label: 'Betting Report', path: '/reports/betting', icon: 'chart' },
  {
    label: 'Game Management',
    icon: 'game',
    children: [
      { label: 'Game Providers', path: '/games/providers' },
      { label: 'Game Rates', path: '/games/rates' },
      { label: 'Game Result', path: '/games/result' },
      { label: 'Game Result Old', path: '/games/result-old' },
    ],
  },
  {
    label: 'Report Management',
    icon: 'report',
    children: [
      { label: 'Winner Prediction', path: '/reports/prediction' },
      { label: 'Profit/Loss', path: '/reports/profit-loss' },
      { label: 'Winning Details', path: '/reports/winners' },
      { label: 'Bet Filter', path: '/reports/bet-filter' },
      { label: 'Customer Sell Report', path: '/reports/sell' },
      { label: 'Bid History', path: '/bids' },
      { label: 'Withdraw Report', path: '/reports/withdraw' },
    ],
  },
  {
    label: 'Wallet Management',
    icon: 'wallet',
    children: [
      { label: 'UPI Verification', path: '/wallet/upi' },
      { label: 'Auto Add Points', path: '/wallet/auto-add' },
      { label: 'Transactions Data', path: '/wallet/transactions' },
      { label: 'Deposit Bonus', path: '/wallet/bonus' },
      { label: 'Withdraw Points Request', path: '/wallet/withdrawals' },
      { label: 'Add Points (User Wallet)', path: '/wallet/add-points' },
      { label: 'Bid Revert', path: '/wallet/bid-revert' },
    ],
  },
  {
    label: 'Settings',
    icon: 'settings',
    children: [
      { label: 'Change Password', path: '/settings/password' },
      { label: 'Main Settings', path: '/settings/main' },
      { label: 'Contact Us Details', path: '/settings/contact' },
      { label: 'Image Slider', path: '/settings/slider' },
      { label: 'How To Play', path: '/settings/how-to-play' },
      { label: 'Videos', path: '/settings/videos' },
    ],
  },
  {
    label: 'Notice Management',
    icon: 'notice',
    children: [
      { label: 'Notice Management', path: '/notice' },
      { label: 'Send Notification', path: '/notice/send' },
    ],
  },
  {
    label: 'Games & Numbers',
    icon: 'dice',
    children: [
      { label: 'Single Digit', path: '/numbers/single' },
      { label: 'Jodi Digit', path: '/numbers/jodi' },
      { label: 'Single Pana', path: '/numbers/single-pana' },
      { label: 'Double Pana', path: '/numbers/double-pana' },
      { label: 'Triple Pana', path: '/numbers/triple-pana' },
      { label: 'Half Sangam', path: '/numbers/half-sangam' },
      { label: 'Full Sangam', path: '/numbers/full-sangam' },
      { label: 'Personal Games', path: '/numbers/personal' },
    ],
  },
  {
    label: 'Main Starline',
    icon: 'star',
    children: [
      { label: 'Game Provider', path: '/starline/providers' },
      { label: 'Profit Loss', path: '/starline/profit-loss' },
      { label: 'Game Rates', path: '/starline/rates' },
      { label: 'Bid History', path: '/starline/bids' },
      { label: 'Upcoming Result', path: '/starline/upcoming' },
      { label: 'Game Result', path: '/starline/result' },
      { label: 'Sell Report', path: '/starline/sell' },
      { label: 'Winning Report', path: '/starline/winners' },
    ],
  },
  {
    label: 'Main Jackpot',
    icon: 'jackpot',
    children: [
      { label: 'Game Provider', path: '/jackpot/providers' },
      { label: 'Game Rates', path: '/jackpot/rates' },
      { label: 'Bid History', path: '/jackpot/bids' },
      { label: 'Game Result', path: '/jackpot/result' },
      { label: 'Sell Report', path: '/jackpot/sell' },
    ],
  },
];

// ---------- Icon Component ----------
function Icon({ name, className = 'w-4 h-4' }: { name?: string; className?: string }) {
  const common = {
    className,
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    viewBox: '0 0 24 24',
  };

  switch (name) {
    case 'dashboard':
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="9" />
          <rect x="14" y="3" width="7" height="5" />
          <rect x="14" y="12" width="7" height="9" />
          <rect x="3" y="16" width="7" height="5" />
        </svg>
      );
    case 'users':
      return (
        <svg {...common}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'gift':
      return (
        <svg {...common}>
          <polyline points="20 12 20 22 4 22 4 12" />
          <rect x="2" y="7" width="20" height="5" />
          <line x1="12" y1="22" x2="12" y2="7" />
          <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
          <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
        </svg>
      );
    case 'deposit':
      return (
        <svg {...common}>
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      );
    case 'refresh':
      return (
        <svg {...common}>
          <polyline points="23 4 23 10 17 10" />
          <polyline points="1 20 1 14 7 14" />
          <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
        </svg>
      );
    case 'scissors':
      return (
        <svg {...common}>
          <circle cx="6" cy="6" r="3" />
          <circle cx="6" cy="18" r="3" />
          <line x1="20" y1="4" x2="8.12" y2="15.88" />
          <line x1="14.47" y1="14.48" x2="20" y2="20" />
          <line x1="8.12" y1="8.12" x2="12" y2="12" />
        </svg>
      );
    case 'chart':
      return (
        <svg {...common}>
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      );
    case 'game':
      return (
        <svg {...common}>
          <line x1="6" y1="12" x2="10" y2="12" />
          <line x1="8" y1="10" x2="8" y2="14" />
          <line x1="15" y1="13" x2="15.01" y2="13" />
          <line x1="18" y1="11" x2="18.01" y2="11" />
          <rect x="2" y="6" width="20" height="12" rx="2" />
        </svg>
      );
    case 'report':
      return (
        <svg {...common}>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="9" y1="13" x2="15" y2="13" />
          <line x1="9" y1="17" x2="15" y2="17" />
        </svg>
      );
    case 'wallet':
      return (
        <svg {...common}>
          <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
          <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
          <path d="M18 12a2 2 0 0 0 0 4h4v-4z" />
        </svg>
      );
    case 'settings':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      );
    case 'notice':
      return (
        <svg {...common}>
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      );
    case 'dice':
      return (
        <svg {...common}>
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8" cy="8" r="1" />
          <circle cx="16" cy="8" r="1" />
          <circle cx="12" cy="12" r="1" />
          <circle cx="8" cy="16" r="1" />
          <circle cx="16" cy="16" r="1" />
        </svg>
      );
    case 'star':
      return (
        <svg {...common}>
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      );
    case 'jackpot':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="6" />
          <circle cx="12" cy="12" r="2" />
        </svg>
      );
    default:
      return null;
  }
}

// ---------- MenuItem Component ----------
function MenuItem({
  item,
  onChildClick,
}: {
  item: Item;
  onChildClick?: () => void;
}) {
  const [open, setOpen] = useState(false);

  if (item.children) {
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className="w-full text-left px-3 py-2 hover:bg-slate-800/60 rounded text-sm font-medium flex items-center justify-between gap-2 transition-colors"
        >
          <span className="flex items-center gap-2.5 min-w-0">
            <span className="text-brand-accent flex-shrink-0">
              <Icon name={item.icon} />
            </span>
            <span className="truncate text-slate-200">{item.label}</span>
          </span>
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`text-slate-500 transition-transform ${
              open ? 'rotate-90' : ''
            }`}
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>
        {open && (
          <div className="ml-5 mt-0.5 border-l border-brand-border pl-1 space-y-0.5">
            {item.children.map((child) => (
              <NavLink
                key={child.path}
                to={child.path!}
                onClick={onChildClick}
                className={({ isActive }) =>
                  `block px-3 py-1.5 text-xs hover:bg-slate-800/60 rounded transition-colors ${
                    isActive
                      ? 'text-brand-accent bg-slate-800/80'
                      : 'text-slate-400 hover:text-slate-200'
                  }`
                }
              >
                {child.label}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <NavLink
      to={item.path!}
      onClick={onChildClick}
      className={({ isActive }) =>
        `flex items-center gap-2.5 px-3 py-2 text-sm rounded transition-colors ${
          isActive
            ? 'text-brand-accent bg-slate-800/80 font-medium'
            : 'text-slate-300 hover:bg-slate-800/60 hover:text-slate-100'
        }`
      }
    >
      <span className="flex-shrink-0">
        <Icon name={item.icon} />
      </span>
      <span className="truncate">{item.label}</span>
    </NavLink>
  );
}

// ---------- Sidebar ----------
interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function Sidebar({ open, onClose }: SidebarProps) {
  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-50 w-64
        bg-brand-card border-r border-brand-border
        flex flex-col
        transform transition-transform duration-300 ease-in-out
        ${open ? 'translate-x-0' : '-translate-x-full'}
      `}
      aria-hidden={!open}
    >
      {/* Header */}
      <div className="p-4 border-b border-brand-border flex items-center gap-2.5 flex-shrink-0">
        <div className="w-9 h-9 rounded-full bg-brand-accent flex items-center justify-center flex-shrink-0">
          <span className="text-brand-bg font-bold text-lg">C</span>
        </div>
        <div className="leading-tight">
          <h1 className="text-base font-bold text-brand-accent">Crorebet</h1>
          <p className="text-[10px] text-slate-500 tracking-widest uppercase">
            Admin Panel
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
        {MENU.map((item) => (
          <MenuItem key={item.label} item={item} onChildClick={onClose} />
        ))}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-brand-border text-center flex-shrink-0">
        <p className="text-[10px] text-slate-500">v1.0.0</p>
      </div>
    </aside>
  );
}
