import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../store/auth';

export default function Login() {
  const [step, setStep] = useState<'creds' | '2fa'>('creds');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { setAdmin } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    if (!email || !password) return setError('Email and password required');
    
    setLoading(true);
    try {
      const { data } = await api.post('/admin/auth/login', { email, password });
      
      if (data.data.twoFactorRequired) {
        setTempToken(data.data.tempToken);
        setStep('2fa');
      } else {
        // No 2FA enabled yet
        setAdmin(data.data.admin);
        navigate('/');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const verify2FA = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError('');
    if (code.length !== 6) return setError('Enter 6-digit code');
    
    setLoading(true);
    try {
      const { data } = await api.post('/admin/auth/2fa/verify', { 
        tempToken, 
        token: code 
      });
      setAdmin(data.data.admin);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid Authenticator code');
    } finally {
      setLoading(false);
    }
  };

  const CodeInput = () => (
    <input
      type="text"
      inputMode="numeric"
      maxLength={6}
      className="input text-center text-3xl tracking-[0.8em] font-mono"
      placeholder="000000"
      value={code}
      onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
      onKeyDown={(e) => e.key === 'Enter' && verify2FA()}
      autoFocus
    />
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-bg px-4">
      <div className="card w-full max-w-sm space-y-5">
        <div className="text-center">
          <div className="w-14 h-14 mx-auto rounded-full bg-brand-accent flex items-center justify-center mb-3">
            <span className="text-brand-bg font-bold text-2xl">M</span>
          </div>
          <h1 className="text-xl font-bold text-brand-accent">Crorebet Admin</h1>
          <p className="text-xs text-slate-400 mt-1">
            {step === 'creds'
              ? 'Sign in with email and password'
              : 'Enter code from Google Authenticator'}
          </p>
        </div>

        {error && (
          <div className="text-sm text-red-400 bg-red-900/20 p-3 rounded">{error}</div>
        )}

        {step === 'creds' && (
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="email"
              placeholder="admin@example.com"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
            />
            <input
              type="password"
              placeholder="Password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Verifying...' : 'Login'}
            </button>
            <Link
              to="/forgot-password"
              className="text-xs text-slate-400 hover:text-brand-accent w-full text-center block"
            >
              Forgot password?
            </Link>
          </form>
        )}

        {step === '2fa' && (
          <form onSubmit={verify2FA} className="space-y-4">
            <p className="text-xs text-slate-400 text-center">
              Open Google Authenticator and enter the 6-digit code for <span className="text-slate-100">{email}</span>
            </p>
            <CodeInput />
            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Verifying...' : 'Verify & Login'}
            </button>
            <div className="flex justify-center text-xs mt-2">
              <button
                type="button"
                onClick={() => {
                  setStep('creds');
                  setCode('');
                  setError('');
                }}
                className="text-slate-400 hover:text-brand-accent"
              >
                ← Back to Login
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}