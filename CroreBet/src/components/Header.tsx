import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Header() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  const nav = [
    { label: 'Home', to: '/' },
    { label: 'Charts', to: '/charts' },
    { label: 'Privacy', to: '/privacy' },
  ];

  return (
    <header className="sticky top-0 z-50 transition-all duration-300">
      {/* Premium Obsidian Backdrop */}
      <div className="absolute inset-0 bg-[#063d30] backdrop-blur-xl border-b border-yellow-500/30 shadow-[0_4px_24px_rgba(6,61,48,0.25)]" />
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-yellow-500 to-transparent shadow-[0_0_15px_rgba(250,204,21,0.8)]" />

      <div className="relative max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        
        {/* --- CRORE BET LOGO --- */}
        <Link to="/" className="flex items-center gap-3 flex-shrink-0 group">
          <div className="relative h-14 w-14 flex items-center justify-center transition-transform group-hover:scale-105">
            {/* Soft glow behind the PNG */}
            <div className="absolute inset-0 rounded-full bg-yellow-500/20 blur-md group-hover:bg-yellow-500/40 transition-colors" />
            <img 
              src="/crore-bet-hero-cutout.png" 
              alt="Crore Bet character" 
              className="relative h-full w-full object-contain drop-shadow-[0_0_10px_rgba(250,204,21,0.5)]" 
            />
          </div>
          <div>
            <h1 className="leading-none">
              <img src="/crore-bet-wordmark-v3.png" alt="Crore Bet" className="h-auto w-24 sm:w-28" />
            </h1>
            <p className="text-[10px] font-bold tracking-[0.3em] text-[#f5d88b] uppercase mt-1">
              Play · Win · Rise
            </p>
          </div>
        </Link>

        {/* --- Desktop Nav --- */}
        <nav className="hidden md:flex items-center gap-8">
          {nav.map((n) => {
            const active = pathname === n.to;
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`relative text-sm font-bold tracking-widest uppercase transition-all group ${
                  active ? 'text-[#ffdc7d]' : 'text-[#fff8eb] hover:text-[#ffdc7d]'
                }`}
              >
                <span className="relative z-10">{n.label}</span>
                <span
                  className={`absolute -bottom-2 left-0 right-0 h-[2px] rounded-full transition-all duration-300 ${
                    active ? 'bg-gradient-to-r from-yellow-500 via-orange-400 to-yellow-500 shadow-[0_0_10px_rgba(250,204,21,0.8)]' : 'bg-transparent group-hover:bg-gradient-to-r group-hover:from-yellow-500/50 group-hover:via-orange-400/50 group-hover:to-yellow-500/50'
                  }`}
                />
                {active && <span className="absolute -top-3 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-yellow-400 shadow-[0_0_8px_#facc15] animate-pulse" />}
              </Link>
            );
          })}
        </nav>

        {/* --- Mobile Hamburger --- */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden relative w-10 h-10 flex flex-col justify-center items-center gap-1.5 focus:outline-none z-50 bg-white/5 rounded-xl border border-white/10 backdrop-blur-sm hover:bg-white/10 transition-colors"
        >
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-yellow-400 shadow-[0_0_8px_#facc15] animate-pulse border-2 border-black" />
          <motion.span animate={open ? { rotate: 45, y: 8, backgroundColor: "#facc15" } : { rotate: 0, y: 0, backgroundColor: "#ffffff" }} className="w-5 h-0.5 rounded-full block transition-colors" />
          <motion.span animate={open ? { opacity: 0 } : { opacity: 1, backgroundColor: "#ffffff" }} className="w-5 h-0.5 rounded-full block transition-colors" />
          <motion.span animate={open ? { rotate: -45, y: -8, backgroundColor: "#facc15" } : { rotate: 0, y: 0, backgroundColor: "#ffffff" }} className="w-5 h-0.5 rounded-full block transition-colors" />
        </button>
      </div>

      {/* --- Mobile Dropdown Menu --- */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden border-t border-yellow-500/20 bg-[#063d30] backdrop-blur-2xl overflow-hidden shadow-2xl"
          >
            <div className="px-6 py-6 space-y-3">
              {nav.map((n) => {
                const active = pathname === n.to;
                return (
                  <Link
                    key={n.to}
                    to={n.to}
                    onClick={() => setOpen(false)}
                    className={`block px-4 py-4 rounded-xl text-center text-lg font-bold tracking-widest uppercase transition-all ${
                      active
                        ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/10 border border-yellow-500/50 text-yellow-400 shadow-[0_0_15px_rgba(250,204,21,0.1)]'
                        : 'bg-white/5 text-[#fff8eb] hover:bg-white/10 hover:text-white border border-white/5'
                    }`}
                  >
                    {n.label}
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
