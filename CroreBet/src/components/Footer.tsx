export default function Footer() {
  return (
    <footer className="relative mt-16 z-10">
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-yellow-500 to-transparent shadow-[0_0_15px_rgba(250,204,21,0.8)]" />
      <div className="absolute inset-0 bg-[#063d30] backdrop-blur-xl border-t border-yellow-500/30" />

      <div className="relative max-w-7xl mx-auto px-4 py-16">
        <div className="text-center space-y-6">
          
          {/* --- CRORE BET LOGO --- */}
          <div className="relative w-24 h-24 mx-auto group flex items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-yellow-500/20 blur-xl group-hover:bg-yellow-500/40 transition-colors animate-pulse" />
            <img 
              src="/crore-bet-hero-cutout.png" 
              alt="Crore Bet character" 
              className="relative w-full h-full object-contain drop-shadow-[0_0_20px_rgba(250,204,21,0.6)]" 
            />
          </div>

          <h3>
            <img src="/crore-bet-wordmark-v3.png" alt="Crore Bet" className="h-auto w-60 max-w-full mx-auto" />
          </h3>

          <p className="text-[#86e8d2] text-base max-w-2xl mx-auto font-bold">
            Trusted Satta Matka platform. Play your favorite games, check live charts, and win jackpots.
          </p>

          <div className="flex items-center justify-center gap-4 py-6">
            <div className="w-10 h-10 rounded-full border-2 border-red-500/60 flex items-center justify-center text-red-500 text-xs font-black shadow-[0_0_15px_rgba(239,68,68,0.2)] bg-red-500/10 backdrop-blur-md">
              18+
            </div>
            <p className="text-sm text-[#fff7e8] max-w-md text-left font-bold">
              Players must be 18+ to register. Underage gambling is prohibited.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 text-xs font-bold tracking-wider uppercase">
            <a href="https://www.begambleaware.org/" target="_blank" rel="noreferrer" className="border border-[#e8cb83] rounded-full px-4 py-2 text-[#f5dfa7] hover:bg-[#f5dfa7] hover:text-[#063d30] transition-colors">
              BeGambleAware
            </a>
            <a href="https://www.gamblingtherapy.org/" target="_blank" rel="noreferrer" className="border border-[#e8cb83] rounded-full px-4 py-2 text-[#f5dfa7] hover:bg-[#f5dfa7] hover:text-[#063d30] transition-colors">
              Gambling Therapy
            </a>
          </div>

          <div className="h-px w-full max-w-md mx-auto bg-gradient-to-r from-transparent via-yellow-500/30 to-transparent my-8" />

          <p className="text-xs text-[#fff7e8] font-bold">
            © {new Date().getFullYear()} Crore Bet. All Rights Reserved.
          </p>

          <p className="text-[10px] tracking-[0.4em] uppercase text-[#f5d88b] font-black pt-4">
            ✦ Play · Win · Rise ✦
          </p>
        </div>
      </div>
    </footer>
  );
}
