import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../store/auth';

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { admin, setAdmin } = useAuth();
  const [checking, setChecking] = useState(!admin);

  useEffect(() => {
    if (admin) {
      setChecking(false);
      return;
    }
    let mounted = true;
    api
      .get('/admin/auth/me')
      .then((r) => {
        if (mounted) setAdmin(r.data.data.admin);
      })
      .catch(() => {
        if (mounted) setAdmin(null);
      })
      .finally(() => {
        if (mounted) setChecking(false);
      });
    return () => { mounted = false; };
  }, [admin, setAdmin]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-bg">
        <div className="w-10 h-10 border-4 border-brand-accent/30 border-t-brand-accent rounded-full animate-spin" />
      </div>
    );
  }

  if (!admin) return <Navigate to="/login" replace />;
  return <>{children}</>;
}