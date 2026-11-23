import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import { useAuth } from '../../store/auth';

export default function ChangePassword() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const { logout } = useAuth();
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!oldPassword) return setError('Enter your current password');
    if (newPassword.length < 8)
      return setError('New password must be at least 8 characters');
    if (newPassword !== confirmPassword)
      return setError('New passwords do not match');
    if (newPassword === oldPassword)
      return setError('New password must be different from the old password');

    setSaving(true);
    try {
      await api.post('/admin/change-password', { oldPassword, newPassword });
      setSuccess('Password updated. Logging you out in 2 seconds...');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');

      setTimeout(() => {
        logout();
        navigate('/login');
      }, 2000);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-100">Change Password</h1>
        <p className="text-xs text-slate-500 mt-1">
          Update the admin account password. You will be logged out after
          changing.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ===== FORM ===== */}
        <div className="lg:col-span-2">
          <div className="card">
            {error && (
              <div className="bg-red-900/20 border border-red-700/50 rounded p-3 text-red-300 text-sm mb-4">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-emerald-900/20 border border-emerald-700/50 rounded p-3 text-emerald-300 text-sm mb-4">
                {success}
              </div>
            )}

            <form onSubmit={submit} className="space-y-4">
              {/* Old password */}
              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  Old Password
                </label>
                <div className="relative">
                  <input
                    type={showOld ? 'text' : 'password'}
                    className="input pr-12"
                    placeholder="Enter current password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowOld(!showOld)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
                  >
                    {showOld ? 'HIDE' : 'SHOW'}
                  </button>
                </div>
              </div>

              {/* New password */}
              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    className="input pr-12"
                    placeholder="Min 8 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 text-xs"
                  >
                    {showNew ? 'HIDE' : 'SHOW'}
                  </button>
                </div>
              </div>

              {/* Confirm */}
              <div>
                <label className="text-xs text-slate-400 mb-1 block">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  className="input"
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="btn-primary w-full disabled:opacity-40"
              >
                {saving ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          </div>
        </div>

        {/* ===== HELP PANEL ===== */}
        <div className="lg:col-span-1">
          <div className="card">
            <h3 className="text-sm font-bold text-brand-accent mb-3">
              Password Rules
            </h3>
            <ul className="space-y-2 text-xs text-slate-400">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">✓</span>
                <span>Minimum 8 characters</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">✓</span>
                <span>Must be different from current password</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">✓</span>
                <span>Both new fields must match</span>
              </li>
            </ul>

            <div className="mt-5 pt-4 border-t border-brand-border">
              <h3 className="text-sm font-bold text-brand-accent mb-3">
                About Admin Login
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Admin panel login uses <strong className="text-slate-200">email OTP</strong> — you
                don't need this password to log in. But the password is stored
                for audit purposes and can be used later if password login is
                re-enabled.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}