import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';

type Step = 'email' | 'otp' | 'reset' | 'success';

export default function ForgotPassword() {
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const navigate = useNavigate();

  const startCooldown = () => {
    setCooldown(45);
    const t = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) {
          clearInterval(t);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  const sendOtp = async () => {
    setError('');
    setSuccess('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError('Enter valid email');
    setLoading(true);
    try {
      await api.post('/admin/auth/forgot-password', { email });
      setStep('otp');
      setOtp('');
      setSuccess('Reset OTP sent to your registered email');
      startCooldown();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    setError('');
    if (otp.length !== 6) return setError('Enter 6-digit OTP');
    setLoading(true);
    try {
      const { data } = await api.post('/admin/auth/verify-reset-otp', { email, otp });
      setResetToken(data.data.resetToken);
      setStep('reset');
      setSuccess('OTP verified � set your new password');
    } catch (e: any) {
      setError(e.response?.data?.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async () => {
    setError('');
    if (newPassword.length < 8) return setError('Password must be at least 8 characters');
    if (newPassword !== confirmPassword) return setError('Passwords do not match');
    setLoading(true);
    try {
      await api.post('/admin/auth/reset-password', {
        email,
        resetToken,
        newPassword,
      });
      setStep('success');
    } catch (e: any) {
      setError(e.response?.data?.message || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  const resend = async () => {
    if (cooldown > 0) return;
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await api.post('/admin/auth/forgot-password', { email });
      setSuccess('OTP resent to your email');
      startCooldown();
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to resend');
    } finally {
      setLoading(false);
    }
  };

  const OtpInput = () => (
    <input
      type="text"
      inputMode="numeric"
      maxLength={6}
      className="input text-center text-3xl tracking-[0.8em] font-mono"
      placeholder="000000"
      value={otp}
      onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
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
            {step === 'email' && 'Forgot Password?'}
            {step === 'otp' && 'Verify Password Reset OTP'}
            {step === 'reset' && 'Reset Password'}
            {step === 'success' && 'Password Reset Successful'}
          </p>
        </div>

        {error && (
          <div className="text-sm text-red-400 bg-red-900/20 p-3 rounded">{error}</div>
        )}
        {success && (
          <div className="text-sm text-emerald-400 bg-emerald-900/20 p-3 rounded">
            {success}
          </div>
        )}

        {step === 'email' && (
          <>
            <p className="text-xs text-slate-400 text-center">
              Enter your registered admin email address.
            </p>
            <input
              type="email"
              placeholder="admin@example.com"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendOtp()}
              autoFocus
            />
            <button
              onClick={sendOtp}
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
            <Link
              to="/login"
              className="text-xs text-slate-400 hover:text-brand-accent w-full text-center block"
            >
              ? Back to Login
            </Link>
          </>
        )}

        {step === 'otp' && (
          <>
            <p className="text-xs text-slate-400 text-center">
              Enter the OTP sent to <span className="text-slate-100">{email}</span>
            </p>
            <OtpInput />
            <button
              onClick={verifyOtp}
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>
            <div className="flex justify-between text-xs">
              <button
                onClick={() => setStep('email')}
                className="text-slate-400 hover:text-brand-accent"
              >
                ? Back
              </button>
              <button
                onClick={resend}
                disabled={loading || cooldown > 0}
                className={`${
                  cooldown > 0
                    ? 'text-slate-600'
                    : 'text-slate-400 hover:text-brand-accent'
                }`}
              >
                {cooldown > 0 ? `Resend OTP in ${cooldown}s` : 'Resend OTP'}
              </button>
            </div>
          </>
        )}

        {step === 'reset' && (
          <>
            <p className="text-xs text-slate-400 text-center">
              Password must be at least 8 characters long.
            </p>
            <input
              type="password"
              placeholder="New password"
              className="input"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoFocus
            />
            <input
              type="password"
              placeholder="Confirm new password"
              className="input"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && resetPassword()}
            />
            <button
              onClick={resetPassword}
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Updating...' : 'Reset Password'}
            </button>
          </>
        )}

        {step === 'success' && (
          <>
            <div className="text-center space-y-3 py-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-900/30 flex items-center justify-center">
                <span className="text-emerald-400 text-3xl">?</span>
              </div>
              <h2 className="text-lg font-bold text-emerald-400">
                Password Reset Successful
              </h2>
              <p className="text-xs text-slate-400">
                Your password has been changed successfully.
              </p>
              <p className="text-xs text-slate-400">
                A confirmation email has been sent to{' '}
                <span className="text-slate-100">{email}</span>.
              </p>
            </div>
            <button
              onClick={() => navigate('/login')}
              className="btn-primary w-full"
            >
              Go to Admin Login
            </button>
          </>
        )}
      </div>
    </div>
  );
}