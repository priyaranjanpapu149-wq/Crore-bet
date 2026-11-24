import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState, useCallback } from 'react';
import Sidebar from './Sidebar';
import { useAuth } from '../store/auth';
import { useIdleTimeout } from '../hooks/useIdleTimeout';
import api from '../api/axios';

export default function Layout() {
  const { admin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Close on ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSidebarOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Lock scroll on mobile when sidebar open
  useEffect(() => {
    const isMobile = window.innerWidth < 768;
    document.body.style.overflow = sidebarOpen && isMobile ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  const handleLogout = useCallback(async () => {
    try {
      await api.post('/admin/auth/logout'); // clears httpOnly cookie server-side
    } catch {}
    logout(); // clears in-memory state
    navigate('/login');
  }, [logout, navigate]);

  // Auto-logout after 10 min of inactivity
  useIdleTimeout(() => {
    handleLogout();
  }, 10 * 60 * 1000);

  return (
    <div className="min-h-screen bg-brand-bg flex">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          aria-hidden="true"
        />
      )}

      <div
        className={`flex-1 flex flex-col min-w-0 transition-[margin] duration-300 ease-in-out ${
          sidebarOpen ? 'md:ml-64' : 'md:ml-0'
        }`}
      >
        <header className="h-14 bg-brand-card border-b border-brand-border px-3 md:px-5 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-2 md:gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="text-slate-300 hover:text-brand-accent p-2 rounded hover:bg-slate-800/60 transition-colors flex-shrink-0"
              aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
            >
              {sidebarOpen ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              )}
            </button>

            {!sidebarOpen && (
              <div className="flex items-center gap-2 ml-1">
                <div className="w-7 h-7 rounded-full bg-brand-accent flex items-center justify-center flex-shrink-0">
                  <span className="text-brand-bg font-bold text-sm">C</span>
                </div>
                <span className="font-bold text-brand-accent hidden sm:inline">Crorebet</span>
              </div>
            )}

            <div className="text-sm text-slate-400 truncate hidden md:block ml-2">
              <span className="text-slate-100 font-medium truncate">
                {admin?.name || 'Admin'}
              </span>
              <span className="ml-2 text-xs bg-brand-accent text-slate-900 px-2 py-0.5 rounded">
                {admin?.role}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="text-sm text-red-400 hover:text-red-300 flex items-center gap-1.5 px-2 py-1.5 rounded hover:bg-red-900/20 transition-colors flex-shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span className="hidden sm:inline">Logout</span>
          </button>
        </header>

        <main className="flex-1 p-3 md:p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}