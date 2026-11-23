import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../store/auth';

type Step = 'loading' | 'scan' | 'verify' | 'recovery' | 'manage';

export default function TwoFactorSetup() {
  const [step, setStep] = useState<Step>('loading');
  const [qr, setQr] = useState('');
  const [secret, setSecret] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [usePassword, setUsePassword] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { admin, setAdmin } = useAuth();
  const navigate = useNavigate();

  const startSetup = async () => {
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/admin/auth/2fa/setup');
      setQr(data.data.qr);
      setSecret(data.data.secret);
      setCode('');
      setStep('scan');
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to start setup');
      setStep('scan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/admin/auth/me');
        const fresh = data.data?.admin;
        if (fresh) setAdmin(fresh);
        if (fresh?.twoFactorEnabled) {
          setStep('manage');
        } else {
          await startSetup();
        }
      } catch {
        await startSetup();
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const verifySetup = async () => {
    setError('');
    if (code.length !== 6) return setError('Enter 6-digit code');
    setLoading(true);
    try {
      const { data } = await api.post('/admin/auth/2fa/verify-setup', { token: code });
      setRecoveryCodes(data.data.recoveryCodes || []);
      if (admin) setAdmin({ ...admin, twoFactorEnabled: true });
      setCode('');
      setStep('recovery');
    } catch (e: any) {
      setError(e.response?.data?.message || 'Invalid code');
    } finally {
      setLoading(false);
    }
  };

  const disable = async () => {
    setError('');
    if (usePassword) {
      if (!password) return setError('Enter password');
    } else {
      if (code.length !== 6) return setError('Enter current 6-digit code');
    }
    setLoading(true);
    try {
      await api.post(
        '/admin/auth/2fa/disable',
        usePassword ? { password } : { token: code }
      );
      if (admin) setAdmin({ ...admin, twoFactorEnabled: false });
      setCode('');
      setPassword('');
      setUsePassword(false);
      setRecoveryCodes([]);
      await startSetup();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to disable');
    } finally {
      setLoading(false);
    }
  };

  const regenerate = async () => {
    setError('');
    if (code.length !== 6) return setError('Enter current 6-digit code');
    setLoading(true);
    try {
      const { data } = await api.post('/admin/auth/2fa/regenerate-recovery', { token: code });
      setRecoveryCodes(data.data.recoveryCodes || []);
      setCode('');
      setStep('recovery');
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to regenerate');
    } finally {
      setLoading(false);
    }
  };

  const copyCodes = () => {
    const text = recoveryCodes.join('\n');
    navigator.clipboard?.writeText(text).catch(() => {
      window.prompt('Copy these codes:', text);
    });
  };

  const CodeInput = ({ onSubmit, autoFocus = true }: { onSubmit: () => void; autoFocus?: boolean }) => (
    <input
      type="text"
      inputMode="numeric"
      maxLength={6}
      className="input text-center text-3xl tracking-[0.8em] font-mono"
      placeholder="000000"
      value={code}
      onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
      onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
      autoFocus={autoFocus}
    />
  );

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-100">Google Authenticator (2FA)</h1>
        <p className="text-xs text-slate-500 mt-1">
          {step === 'loading' && 'Checking status...'}
          {(step === 'scan' || step === 'verify') && 'Set up two-factor authentication for your admin account'}
          {step === 'recovery' && 'Save your recovery codes'}
          {step === 'manage' && 'Two-factor authentication is enabled on your account'}
        </p>
      </div>

      {error && (
        <div className="bg-red-900/20 border border-red-700/50 rounded p-3 text-red-300 text-sm mb-4">
          {error}
        </div>
      )}

      <div className="card max-w-md space-y-4">
        {step === 'loading' && (
          <div className="flex justify-center py-8">
            <div className="w-10 h-10 border-4 border-brand-accent/30 border-t-brand-accent rounded-full animate-spin" />
          </div>
        )}

        {step === 'scan' && (
          <>
            <p className="text-sm text-slate-300">
              Scan this QR code with the Google Authenticator app on your phone.
            </p>
            {qr && (
              <div className="bg-white p-3 rounded flex justify-center">
                <img src={qr} alt="QR code" className="w-48 h-48" />
              </div>
            )}
            {secret && (
              <details className="text-xs text-slate-400">
                <summary className="cursor-pointer">Can't scan? Enter key manually</summary>
                <code className="block mt-2 p-2 bg-brand-bg rounded font-mono text-[10px] break-all">
                  {secret}
                </code>
              </details>
            )}
            <button
              onClick={() => { setCode(''); setError(''); setStep('verify'); }}
              className="btn-primary w-full"
            >
              I've scanned it — Next
            </button>
            <button
              onClick={() => navigate('/settings/main')}
              className="text-xs text-slate-400 hover:text-brand-accent w-full text-center block"
            >
              Cancel
            </button>
          </>
        )}

        {step === 'verify' && (
          <>
            <p className="text-sm text-slate-300">
              Enter the 6-digit code shown in your Authenticator app to confirm setup.
            </p>
            <CodeInput onSubmit={verifySetup} />
            <button onClick={verifySetup} disabled={loading} className="btn-primary w-full">
              {loading ? 'Verifying...' : 'Verify & Enable'}
            </button>
            <button
              onClick={() => { setCode(''); setError(''); setStep('scan'); }}
              className="text-xs text-slate-400 hover:text-brand-accent w-full text-center block"
            >
              ← Back
            </button>
          </>
        )}

        {step === 'recovery' && (
          <>
            <div className="text-sm text-emerald-400 bg-emerald-900/20 p-3 rounded">
              ✓ Recovery codes generated — save them now
            </div>
            <p className="text-sm text-slate-300">
              If you lose access to your Authenticator app, you'll need one of these
              to sign in. They will not be shown again.
            </p>
            <div className="grid grid-cols-2 gap-1 p-3 bg-brand-bg rounded font-mono text-xs">
              {recoveryCodes.map((c) => (
                <div key={c} className="text-slate-200">{c}</div>
              ))}
            </div>
            <button
              onClick={copyCodes}
              className="text-xs text-slate-400 hover:text-brand-accent w-full text-center block"
            >
              Copy all codes
            </button>
            <button
              onClick={() => { setCode(''); setError(''); setStep('manage'); }}
              className="btn-primary w-full"
            >
              I've saved these — Done
            </button>
          </>
        )}

        {step === 'manage' && (
          <>
            <div className="text-sm text-emerald-400 bg-emerald-900/20 p-3 rounded">
              ✓ 2FA is enabled on your account
            </div>
            <p className="text-sm text-slate-300">
              {usePassword
                ? 'Enter your account password to disable 2FA.'
                : 'Enter your current 6-digit code to manage 2FA.'}
            </p>

            {usePassword ? (
              <input
                type="password"
                placeholder="Password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
            ) : (
              <CodeInput onSubmit={regenerate} autoFocus={false} />
            )}

            <button
              onClick={regenerate}
              disabled={loading || usePassword}
              className="btn-primary w-full"
            >
              {loading ? 'Working...' : 'Regenerate recovery codes'}
            </button>
            <button onClick={disable} disabled={loading} className="btn-primary w-full">
              {loading ? 'Working...' : 'Disable 2FA'}
            </button>

            <button
              onClick={() => {
                setUsePassword((v) => !v);
                setCode('');
                setPassword('');
                setError('');
              }}
              className="text-xs text-slate-400 hover:text-brand-accent w-full text-center block"
            >
              {usePassword ? 'Use Authenticator code instead' : 'Lost access? Disable with password'}
            </button>

            <button
              onClick={() => navigate('/settings/main')}
              className="text-xs text-slate-400 hover:text-brand-accent w-full text-center block"
            >
              ← Back to settings
            </button>
          </>
        )}
      </div>
    </div>
  );
}