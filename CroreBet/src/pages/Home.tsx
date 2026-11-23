import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import StarEmbers from '../components/StarEmbers';

// Exact Interfaces from your backend
interface MarketResult { panna: string; digit: string; }
interface Market {
  id: string; name: string; slug: string;
  openTime: string | null; closeTime: string | null;
  openTime12: string; closeTime12: string;
  openBidLastTime: string | null; closeBidLastTime: string | null;
  openBidLastTime12: string; closeBidLastTime12: string;
  status: string; // <-- Uses the actual API status ('open' or 'closed')
  openResult: MarketResult | null; closeResult: MarketResult | null;
}
interface HomeData {
  date: string; markets: Market[]; rates: Record<string, string>;
  notices: any[]; sliders: any[];
  settings: {
    siteName: string; tagline: string; appDownloadUrl: string;
    stats: { players: number; games: number; dailyWinnings: string };
  };
}

const FAQS = [
  { q: 'What is Crore Bet?', a: 'Crore Bet is a Satta Matka gaming platform where you can play games and win jackpots.' },
  { q: 'Which games are available?', a: 'Popular games like Kalyan, Crore Bet, Milan, Time Bazar, Gama & Rajdhani.' },
  { q: 'What is minimum deposit and withdrawal?', a: 'We allow Rs 100 deposit and Rs 100 withdrawal.' },
  { q: 'Why choose Crore Bet?', a: 'Most trusted gaming provider worldwide with instant results and reliable payouts.' },
];

function AmbientGold() {
  return (
    <div className="fixed inset-0 z-[-2] overflow-hidden bg-[#f7efdf] pointer-events-none">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_12%,rgba(218,187,125,0.25),transparent_34%),linear-gradient(135deg,#fffaf1_0%,#f3e6cf_52%,#fffaf1_100%)]" />
    </div>
  );
}

export default function Home() {
  const [data, setData] = useState<HomeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [selected, setSelected] = useState<Market | null>(null);

  const load = async (showSpinner: boolean) => {
    if (showSpinner) setLoading(true);
    try {
      const { data } = await api.get('/home');
      setData(data.data);
    } catch (e: any) {
      console.error('HOME LOAD FAILED', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(true);
    const t = setInterval(() => load(false), 30000);
    return () => clearInterval(t);
  }, []);

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center relative z-10">
        <div className="w-20 h-20 border-4 border-yellow-500/30 border-t-yellow-400 rounded-full animate-spin shadow-[0_0_30px_rgba(250,204,21,0.5)]" />
        <p className="mt-6 text-yellow-100 font-black tracking-widest uppercase text-sm drop-shadow-md">Loading...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-20 text-yellow-100 font-bold z-10 relative">
        <div className="text-5xl mb-4">⚠️</div>
        Failed to load data
      </div>
    );
  }

  const rateRows = [
    { label: 'Single Digit', key: 'rate_single' },
    { label: 'Jodi Digits', key: 'rate_jodi' },
    { label: 'Red Brackets', key: 'rate_jodi' },
    { label: 'Single Pana', key: 'rate_singlepatti' },
    { label: 'Double Pana', key: 'rate_doublepatti' },
    { label: 'Triple Pana', key: 'rate_triplepatti' },
    { label: 'Half Sangam A', key: 'rate_halfsangam' },
    { label: 'Half Sangam B', key: 'rate_halfsangam' },
    { label: 'Full Sangam', key: 'rate_fullsangam' },
  ];

  const tagParts = (data.settings.tagline || 'Play Big. Win Big.').split('.');
  const tag1 = tagParts[0] || 'Play Big';
  const tag2 = (tagParts[1] || 'Win Big').trim();

  // SORT BY OPEN TIME (Ascending)
  const sortedMarkets = [...data.markets].sort((a, b) => {
    const getMinutes = (t: string | null) => {
      if (!t) return 9999;
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    return getMinutes(a.openTime) - getMinutes(b.openTime);
  });

  return (
    <div className="home-motion relative min-h-screen">
      <AmbientGold />
      <StarEmbers count={120} />

      {/* ===== HERO ===== */}
      <section className="home-hero relative overflow-hidden pt-12 md:pt-20 pb-16 z-10">
        <div aria-hidden="true" className="absolute pointer-events-none -right-1/4 top-1/3 w-[80%] h-64 rounded-[100%] border-t-2 border-teal-300/50 -rotate-12 shadow-[0_-12px_35px_rgba(20,184,166,0.18)]" />
        <div aria-hidden="true" className="absolute pointer-events-none -right-1/4 top-[48%] w-[75%] h-64 rounded-[100%] border-t border-yellow-400/60 -rotate-12" />
        <div className="relative max-w-7xl mx-auto px-4 grid md:grid-cols-2 gap-10 items-center">
          
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-yellow-400/40 bg-yellow-400/10 backdrop-blur-md shadow-[0_0_20px_rgba(250,204,21,0.12)]">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_#22c55e]" />
              <span className="text-xs tracking-[0.3em] uppercase text-emerald-900 font-black">Live Now</span>
            </div>

            <h1 className="font-kanit italic text-6xl md:text-8xl font-black leading-[0.95] tracking-tight text-emerald-950">
              <span className="block">{tag1}.</span>
              <span className="text-amber-800 block">{tag2}.</span>
            </h1>
            <div className="h-1 w-36 rounded-full bg-gradient-to-r from-teal-300 via-yellow-400 to-transparent" />

            <p className="text-emerald-950 text-lg md:text-xl max-w-lg leading-relaxed font-bold">
              Live games, charts and results in one place.
            </p>

               {/* Download buttons */}
            <div className="flex flex-wrap gap-3 items-center">
              <a
                href="https://magicbossapp.com/apk/magicbossapp.apk"
                download
                className="group relative transition-transform hover:scale-105 active:scale-95"
              >
                <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 to-amber-600 rounded-xl blur opacity-60 group-hover:opacity-100 transition" />
                <img
                  src="/playstore.jpg"
                  alt="Download for Android"
                  className="relative h-14 w-auto rounded-lg"
                />
              </a>

              <a
                href="https://web.magicbossapp.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="group relative transition-transform hover:scale-105 active:scale-95"
              >
                <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 to-amber-600 rounded-xl blur opacity-60 group-hover:opacity-100 transition" />
                <img
                  src="/ios.jpg"
                  alt="Install on iOS"
                  className="relative h-14 w-auto rounded-lg"
                />
              </a>
            </div>

            <div className="grid grid-cols-3 gap-4 pt-8">
              {[
                { value: `${data.settings.stats.players.toLocaleString()}+`, label: 'Players', icon: '👥' },
                { value: `${data.settings.stats.games}+`, label: 'Games', icon: '🎮' },
                { value: `${data.settings.stats.dailyWinnings}`, label: 'Daily Wins', icon: '💰' },
              ].map((s) => (
                <div key={s.label} className="home-stat text-center rounded-2xl py-4 bg-[#073a36]/80 backdrop-blur-md border border-teal-300/60 shadow-[inset_0_1px_12px_rgba(94,234,212,0.12),0_12px_28px_rgba(0,0,0,0.35)]">
                  <div className="text-2xl mb-1">{s.icon}</div>
                  <p className="font-kanit text-2xl md:text-3xl font-black text-white">{s.value}</p>
                  <p className="text-[10px] tracking-[0.2em] uppercase text-yellow-200/70 font-bold mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative flex h-[600px] md:h-[720px] items-center justify-center">
            <img
              src="/crore-bet-hero-cutout.png"
              alt="Crore Bet character and dice"
              className="hero-photo relative h-full max-w-full object-contain drop-shadow-[0_0_40px_rgba(250,204,21,0.35)]"
            />
          </div>
        </div>
      </section>

      {/* ===== iOS INSTALL GUIDE ===== */}
      <section className="relative max-w-7xl mx-auto px-4 pb-16 z-10">
        <div className="obsidian-card ticket-card">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 flex-shrink-0 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-[0_0_20px_rgba(250,204,21,0.4)]">
              <svg className="w-7 h-7 text-black" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2a2 2 0 00-2 2v1H8a2 2 0 00-2 2v9a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2V4a2 2 0 00-2-2zm0 15a2 2 0 110-4 2 2 0 010 4z" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-xs uppercase tracking-[0.25em] text-yellow-400 mb-1 font-bold">Welcome to Crore Bet</p>
              <h3 className="font-kanit text-2xl md:text-3xl font-black text-white mb-3">How to Install on iPhone</h3>
              <p className="text-gray-300 text-sm mb-6 max-w-2xl font-medium">
                Play your favorite games with instant results. Follow these steps to add Crore Bet to your iPhone home screen — it works like a native app.
              </p>

              <div className="grid md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                {[
                  { n: 1, text: <>Open <span className="text-yellow-400 font-bold">Safari</span> on your iPhone (not Chrome)</> },
                  { n: 2, text: <>Open the <span className="font-mono text-yellow-400">Crore Bet website</span></> },
                  { n: 3, text: <>Tap the <span className="text-yellow-400 font-bold">Share</span> button at the bottom</> },
                  { n: 4, text: <>Scroll down → tap <span className="text-yellow-400 font-bold">"Add to Home Screen"</span></> },
                  { n: 5, text: <>Name it <span className="text-yellow-400 font-bold">"Crore Bet"</span> → tap <span className="text-yellow-400 font-bold">Add</span></> },
                  { n: 6, text: <>The icon appears on your home screen.</> },
                ].map((step) => (
                  <div key={step.n} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-yellow-400 text-black text-xs font-black flex items-center justify-center shadow-sm mt-0.5">{step.n}</span>
                    <p className="text-gray-300 leading-relaxed font-medium">{step.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== GAME RATES ===== */}
      <section className="relative max-w-7xl mx-auto px-4 py-12 z-10">
        <SectionHeading title="Game Rates" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {rateRows.map((r, i) => (
            <div key={i} className="obsidian-card ticket-card rate-palette text-center group">
              <h3 className="font-kanit text-lg text-emerald-950 mb-2 uppercase tracking-wider">{r.label}</h3>
              <p className="text-xs font-bold text-amber-800 uppercase tracking-widest">1 Rs Ka</p>
              <p className="font-kanit text-3xl font-black text-emerald-950 mt-2">Rs {data.rates[r.key] || '--'}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== AVAILABLE GAMES ===== */}
      <section className="market-section relative mx-auto px-4 py-12 z-10">
        <SectionHeading title="Available Games" />
        {data.markets.length === 0 ? (
          <p className="text-center text-yellow-100 font-bold py-8">Markets will appear once admin adds them.</p>
        ) : (
          <MarketWheel markets={sortedMarkets} onView={setSelected} modalOpen={selected !== null} />
        )}
      </section>

      {/* ===== FAQ ===== */}
      <section className="relative max-w-7xl mx-auto px-4 py-16 z-10">
        <SectionHeading title="Frequently Asked Questions" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-start">
          {FAQS.map((f, i) => (
            <div key={f.q} className={`faq-card ${['faq-card-1', 'faq-card-2', 'faq-card-3', 'faq-card-4'][i]}`}>
              <button type="button" onClick={() => setOpenFaq(openFaq === i ? null : i)} aria-expanded={openFaq === i} aria-controls={`faq-answer-${i}`} className="faq-panel">
                <span className="faq-icon" aria-hidden="true">{['⌂', '♧', '₹', '★'][i]}</span>
                <span className="faq-question">{f.q}</span>
                <span className="faq-toggle" aria-hidden="true">{openFaq === i ? '−' : '+'}</span>
              </button>
              {openFaq === i && <div id={`faq-answer-${i}`} className="faq-answer">{f.a}</div>}
              <span className="faq-number" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
            </div>
          ))}
        </div>
      </section>

      {selected && <MarketModal market={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

// ============================================================
// Subcomponents 
// ============================================================
function SectionHeading({ title }: { title: string }) {
  return (
    <div className="text-center mb-12">
      <h2 className="font-kanit text-4xl md:text-5xl font-black text-white drop-shadow-md mb-4 uppercase">{title}</h2>
      <div className="h-1 w-24 mx-auto bg-gradient-to-r from-transparent via-yellow-400 to-transparent rounded-full" />
    </div>
  );
}

function MarketWheel({ markets, onView, modalOpen }: { markets: Market[]; onView: (market: Market) => void; modalOpen: boolean }) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(preference.matches);
    preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (paused || modalOpen || reducedMotion || markets.length < 2) return;
    const timer = window.setInterval(() => setIndex((current) => current + 1), 3000);
    return () => window.clearInterval(timer);
  }, [paused, modalOpen, reducedMotion, markets.length]);

  const visible = Array.from({ length: Math.min(5, markets.length) }, (_, offset) => markets[((index + offset) % markets.length + markets.length) % markets.length]);
  const latestNumber = ((index + visible.length - 1) % markets.length + markets.length) % markets.length + 1;

  return (
    <div>
      <div className="market-wheel">
        <div className="wheel-rotor" style={{ transform: `rotate(${index * 72}deg)` }}>
          <svg className="wheel-art" viewBox="0 0 1000 1000" aria-hidden="true">
            {['#009fa5', '#03c99b', '#ffc815', '#ff9700', '#f83360'].map((color, position) => (
              <path key={color} d="M500 500 L500 165 A335 335 0 0 1 819 396 Z" fill={color} transform={`rotate(${position * 72} 500 500)`} />
            ))}
            {['#009fa5', '#03c99b', '#ffc815', '#ff9700', '#f83360'].map((color, position) => (
              <g key={color} transform={`rotate(${position * 72} 500 500)`}>
                <path d="M532 41 A460 460 0 0 1 932 343 L679 435 A190 190 0 0 0 513 310 Z" fill="#fff" style={{ filter: 'drop-shadow(0px 7px 7px rgba(55, 61, 80, 0.14))' }} />
              </g>
            ))}
          </svg>
          {visible.map((market, position) => (
            <div className={`market-wheel-item ${['market-wheel-item-0', 'market-wheel-item-1', 'market-wheel-item-2', 'market-wheel-item-3', 'market-wheel-item-4'][position]} ${['wheel-slot-0', 'wheel-slot-1', 'wheel-slot-2', 'wheel-slot-3', 'wheel-slot-4'][((position + index) % 5 + 5) % 5]}`} key={position}>
              <div className="wheel-upright" style={{ transform: `rotate(${-index * 72}deg)` }}>
                <MarketCard market={market} number={((index + position) % markets.length + markets.length) % markets.length + 1} onView={() => onView(market)} />
              </div>
            </div>
          ))}
        </div>
        {visible.map((_, position) => (
          <span key={`${index}-${position}`} aria-hidden="true" className={`wheel-number ${['wheel-number-0', 'wheel-number-1', 'wheel-number-2', 'wheel-number-3', 'wheel-number-4'][((position + index) % 5 + 5) % 5]}`} style={{ color: ['#009fa5', '#03c99b', '#d6a000', '#f28a00', '#e82b55'][position] }}>
            {String(((index + position) % markets.length + markets.length) % markets.length + 1).padStart(2, '0')}
          </span>
        ))}
        <div className="wheel-center">CRORE<br />BET<span className="wheel-count">{latestNumber} / {markets.length}</span></div>
      </div>
      <div className="wheel-mobile-count">CRORE BET · {latestNumber} / {markets.length}</div>
      <div className="flex justify-center gap-4 mt-6">
        <button type="button" className="ribbon-button wheel-control" onClick={() => setIndex((current) => current - 1)} aria-label="Previous markets">← Previous</button>
        {!reducedMotion && <button type="button" className="ribbon-button wheel-control" onClick={() => setPaused((current) => !current)}>{paused ? '▶ Resume' : '❚❚ Pause'}</button>}
        <button type="button" className="ribbon-button wheel-control" onClick={() => setIndex((current) => current + 1)} aria-label="Next markets">Next →</button>
      </div>
    </div>
  );
}

function MarketCard({ market, number, onView }: { market: Market; number: number; onView: () => void }) {
  // Driven entirely by the backend API status ('open' or 'closed')
  const running = market.status === 'open';
  
  const openPanna = market.openResult?.panna || '***';
  const openDigit = market.openResult?.digit || '*';
  const closeDigit = market.closeResult?.digit || '*';
  const closePanna = market.closeResult?.panna || '***';

  return (
    <div className="ribbon-card">
      <div>
        <div className="ribbon-header">
          <span className="market-number" aria-label={`Market ${number}`}>{String(number).padStart(2, '0')}</span>
          
          <div className="flex items-center gap-3 min-w-0">
            <h3 className="font-serif text-2xl font-bold text-yellow-100 uppercase tracking-wide leading-tight break-words pr-2">
              {market.name}
            </h3>
            
            {/* Premium "i" info button */}
            <button 
              type="button" 
              onClick={onView} 
              className="flex-shrink-0 w-6 h-6 rounded-full border border-yellow-500/50 flex items-center justify-center text-yellow-400 hover:bg-yellow-400 hover:text-black transition-colors shadow-[0_0_10px_rgba(250,204,21,0.2)]" 
              title="View timing details"
            >
              <span className="font-mono text-sm font-bold italic leading-none pt-[1px]">i</span>
            </button>
          </div>

        </div>

        <div className="flex justify-center my-3">
          <span className={`${running ? 'status-running' : 'status-closed'} flex-shrink-0`}>
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            {running ? 'Running' : 'Closed'}
          </span>
        </div>

        <button type="button" onClick={onView} className="ribbon-result" aria-label={`View timing details for ${market.name}`}>
          <span className="font-serif text-2xl sm:text-3xl font-bold tracking-wide break-words">
            {openPanna}-{openDigit}{closeDigit}-{closePanna}
          </span>
        </button>
      </div>

      <div className="ribbon-actions">
        <Link to={`/charts/${encodeURIComponent(market.slug)}/jodi`} className="ribbon-button">Jodi Chart</Link>
        <Link to={`/charts/${encodeURIComponent(market.slug)}/pana`} className="ribbon-button">Pana Chart</Link>
      </div>
    </div>
  );
}

function MarketModal({ market, onClose }: { market: Market; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative bg-[#062c29] border-2 border-teal-400 rounded-3xl p-6 max-w-lg w-full shadow-[0_0_50px_rgba(20,184,166,0.2)]" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-start mb-6">
          <h2 className="font-kanit text-3xl font-black text-white uppercase tracking-wider">{market.name}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-2xl font-bold transition-colors">✕</button>
        </div>
        <div className="rounded-2xl overflow-hidden border border-white/10">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="bg-white/5 border-b border-white/10">
                <th className="px-5 py-4 font-bold text-gray-400 uppercase tracking-widest text-xs w-20"></th>
                <th className="px-5 py-4 font-bold text-yellow-400 uppercase tracking-widest text-xs">⏱ Result</th>
                <th className="px-5 py-4 font-bold text-yellow-400 uppercase tracking-widest text-xs">⏱ Last Bid</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              <tr className="hover:bg-white/5 transition-colors">
                <td className="px-5 py-4 font-black text-white uppercase tracking-wider">Open</td>
                <td className="px-5 py-4 text-gray-300 font-mono font-bold">{market.openTime12}</td>
                <td className="px-5 py-4 text-gray-300 font-mono font-bold">{market.openBidLastTime12}</td>
              </tr>
              <tr className="hover:bg-white/5 transition-colors">
                <td className="px-5 py-4 font-black text-white uppercase tracking-wider">Close</td>
                <td className="px-5 py-4 text-gray-300 font-mono font-bold">{market.closeTime12}</td>
                <td className="px-5 py-4 text-gray-300 font-mono font-bold">{market.closeBidLastTime12}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
