import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../store/auth';
import api from '../../api/axios';

interface Settings {
  signup_reward: string;
  telegram_details: string;
  min_deposit: string;
  min_withdraw: string;
  withdraw_rules: string;
  upi: string;
  merchant: string;
  upi_2: string;
  merchant_2: string;
  upi_3: string;
  merchant_3: string;
  paytms: string;
  phonepe: string;
  gpay: string;
  razorpay: string;
  razor_secret: string;
  razor_id: string;
  tet: string;
  whatsapp_active: string;
  whatsapp: string;
  whatsapp2: string;
  withdrawOpenTime: string;
  withdrawCloseTime: string;
  auto_verify: string;
  verify_upi_payment: string;
  imb: string;
  play_win: string;
  chat_support: string;
  welcome_msg: string;
  otp_verification: string;
}

const DEFAULTS: Settings = {
  signup_reward: '',
  telegram_details: '',
  min_deposit: '',
  min_withdraw: '',
  withdraw_rules: '',
  upi: '',
  merchant: '',
  upi_2: '',
  merchant_2: '',
  upi_3: '',
  merchant_3: '',
  paytms: '',
  phonepe: '',
  gpay: '',
  razorpay: '',
  razor_secret: '',
  razor_id: '',
  tet: '',
  whatsapp_active: '',
  whatsapp: '',
  whatsapp2: '',
  withdrawOpenTime: '',
  withdrawCloseTime: '',
  auto_verify: '',
  verify_upi_payment: '',
  imb: '',
  play_win: '',
  chat_support: '',
  welcome_msg: '',
  otp_verification: '',
};

export default function MainSettings() {
  const [form, setForm] = useState<Settings>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { admin } = useAuth(); // ← ADDED (for 2FA status)

  useEffect(() => {
    api
      .get('/admin/settings')
      .then((r) => {
        setForm((prev) => ({ ...prev, ...(r.data.data || {}) }));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const set = (key: keyof Settings, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      await api.post('/admin/settings', form);
      setSuccess('Settings saved successfully');
      setTimeout(() => setSuccess(''), 3000);
    } catch (e: any) {
      setError(e.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="w-12 h-12 border-4 border-brand-accent/30 border-t-brand-accent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-100">Main Settings</h1>
        <p className="text-xs text-slate-500 mt-1">
          Global configuration for payment gateways, wallet limits, and app
          behavior
        </p>
      </div>

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

      <form onSubmit={submit} className="space-y-6">
        {/* ===== SECTION 1: Reward & Limits ===== */}
        <Section title="Reward & Limits">
          <Grid cols={2}>
            <Field
              label="Signup Reward"
              type="number"
              value={form.signup_reward}
              onChange={(v) => set('signup_reward', v)}
              placeholder="e.g. 50"
            />
            <Field
              label="Telegram Details"
              value={form.telegram_details}
              onChange={(v) => set('telegram_details', v)}
              placeholder="https://t.me/yourchannel"
            />
            <Field
              label="Minimum Deposit"
              type="number"
              value={form.min_deposit}
              onChange={(v) => set('min_deposit', v)}
              placeholder="e.g. 100"
            />
            <Field
              label="Minimum Withdraw"
              type="number"
              value={form.min_withdraw}
              onChange={(v) => set('min_withdraw', v)}
              placeholder="e.g. 100"
            />
          </Grid>
        </Section>

        {/* ===== SECTION 2: Withdraw Rules ===== */}
        <Section title="Withdraw Rules">
          <div>
            <label className="text-xs text-slate-400 mb-1 block">
              Withdraw Rules
            </label>
            <textarea
              className="input min-h-[140px] font-mono text-xs"
              value={form.withdraw_rules}
              onChange={(e) => set('withdraw_rules', e.target.value)}
              placeholder="Enter withdraw rules (HTML or plain text)"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              Supports plain text. HTML will render in the app.
            </p>
          </div>
        </Section>

        {/* ===== SECTION 3: Payment Gateways ===== */}
        <Section title="Payment Gateways">
          <Subtitle>Paytm</Subtitle>
          <Grid cols={2}>
            <Field
              label="Paytm UPI Address"
              value={form.upi}
              onChange={(v) => set('upi', v)}
              placeholder="merchant@paytm"
            />
            <Field
              label="Paytm UPI MCC"
              type="number"
              value={form.merchant}
              onChange={(v) => set('merchant', v)}
              placeholder="5411"
            />
            <Toggle
              label="Enable Paytm"
              value={form.paytms}
              onChange={(v) => set('paytms', v)}
            />
          </Grid>

          <Subtitle>PhonePe</Subtitle>
          <Grid cols={2}>
            <Field
              label="PhonePe UPI Address"
              value={form.upi_2}
              onChange={(v) => set('upi_2', v)}
              placeholder="merchant@ybl"
            />
            <Field
              label="PhonePe UPI MCC"
              type="number"
              value={form.merchant_2}
              onChange={(v) => set('merchant_2', v)}
              placeholder="5411"
            />
            <Toggle
              label="Enable PhonePe"
              value={form.phonepe}
              onChange={(v) => set('phonepe', v)}
            />
          </Grid>

          <Subtitle>GPay</Subtitle>
          <Grid cols={2}>
            <Field
              label="GPAY UPI Address"
              value={form.upi_3}
              onChange={(v) => set('upi_3', v)}
              placeholder="merchant@okaxis"
            />
            <Field
              label="GPAY UPI MCC"
              type="number"
              value={form.merchant_3}
              onChange={(v) => set('merchant_3', v)}
              placeholder="5411"
            />
            <Toggle
              label="Enable GPay"
              value={form.gpay}
              onChange={(v) => set('gpay', v)}
            />
          </Grid>

          <Subtitle>Razorpay</Subtitle>
          <Grid cols={2}>
            <Field
              label="Razorpay Secret"
              value={form.razor_secret}
              onChange={(v) => set('razor_secret', v)}
              placeholder="••••••••••"
              mono
            />
            <Field
              label="Razorpay ID"
              value={form.razor_id}
              onChange={(v) => set('razor_id', v)}
              placeholder="rzp_live_xxxx"
              mono
            />
            <Toggle
              label="Enable Razorpay"
              value={form.razorpay}
              onChange={(v) => set('razorpay', v)}
            />
          </Grid>
        </Section>

        {/* ===== SECTION 4: UPI Verification ===== */}
        <Section title="UPI Verification">
          <Grid cols={2}>
            <Toggle
              label="Auto Verify"
              value={form.auto_verify}
              onChange={(v) => set('auto_verify', v)}
            />
            <Toggle
              label="UPI Manual Verify"
              value={form.verify_upi_payment}
              onChange={(v) => set('verify_upi_payment', v)}
            />
          </Grid>
        </Section>

        {/* ===== SECTION 5: Support ===== */}
        <Section title="Support">
          <Grid cols={2}>
            <Field
              label="Whatsapp"
              type="number"
              value={form.whatsapp}
              onChange={(v) => set('whatsapp', v)}
              placeholder="e.g. 919876543210"
            />
            <Field
              label="Call Number"
              type="number"
              value={form.whatsapp2}
              onChange={(v) => set('whatsapp2', v)}
              placeholder="e.g. 919876543210"
            />
            <Toggle
              label="Whatsapp Support Active"
              value={form.whatsapp_active}
              onChange={(v) => set('whatsapp_active', v)}
            />
            <Toggle
              label="Chat Support"
              value={form.chat_support}
              onChange={(v) => set('chat_support', v)}
            />
          </Grid>
        </Section>

        {/* ===== SECTION 6: Withdraw Timing ===== */}
        <Section title="Withdraw Timing">
          <Grid cols={2}>
            <Field
              label="Withdraw Open Time"
              type="time"
              value={form.withdrawOpenTime}
              onChange={(v) => set('withdrawOpenTime', v)}
            />
            <Field
              label="Withdraw Close Time"
              type="time"
              value={form.withdrawCloseTime}
              onChange={(v) => set('withdrawCloseTime', v)}
            />
          </Grid>
        </Section>

        {/* ===== SECTION 7: App Features ===== */}
        <Section title="App Features">
          <Grid cols={2}>
            <Toggle
              label="Enable IMB"
              value={form.imb}
              onChange={(v) => set('imb', v)}
            />
            <Toggle
              label="Enable Play & Win"
              value={form.play_win}
              onChange={(v) => set('play_win', v)}
            />
            <Toggle
              label="OTP Verification"
              value={form.otp_verification}
              onChange={(v) => set('otp_verification', v)}
            />
          </Grid>
        </Section>

        {/* ===== SECTION 8: Home Screen ===== */}
        <Section title="Home Screen">
          <Field
            label="Homescreen Text"
            value={form.tet}
            onChange={(v) => set('tet', v)}
            placeholder="Welcome to Crorebet"
          />
          <Field
            label="Welcome Message"
            value={form.welcome_msg}
            onChange={(v) => set('welcome_msg', v)}
            placeholder="Welcome!"
          />
        </Section>

        {/* ===== SECTION 9: Admin Security (2FA) — ADDED ===== */}
        <Section title="Admin Security">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm text-slate-200">Google Authenticator (2FA)</p>
              <p className="text-xs text-slate-500 mt-1">
                {admin?.twoFactorEnabled
                  ? 'Enabled — 6-digit code required at every login'
                  : 'Add a second layer of security to your admin account'}
              </p>
            </div>
            <Link
              to="/settings/2fa"
              className="btn-primary px-4 py-2 text-sm whitespace-nowrap"
            >
              {admin?.twoFactorEnabled ? 'Manage' : 'Set up'}
            </Link>
          </div>
        </Section>

        {/* Submit */}
        <div className="sticky bottom-0 bg-brand-bg/95 backdrop-blur border-t border-brand-border -mx-6 px-6 py-4">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary w-full md:w-auto px-8 disabled:opacity-40"
          >
            {saving ? 'Saving...' : 'Submit'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ---------- Reusable Components ----------

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card">
      <h2 className="text-sm font-bold text-brand-accent uppercase tracking-wider mb-4 pb-3 border-b border-brand-border">
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Subtitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wide mt-3 first:mt-0">
      {children}
    </h3>
  );
}

function Grid({
  cols = 1,
  children,
}: {
  cols?: 1 | 2 | 3;
  children: React.ReactNode;
}) {
  const cls =
    cols === 2
      ? 'grid grid-cols-1 md:grid-cols-2 gap-4'
      : cols === 3
      ? 'grid grid-cols-1 md:grid-cols-3 gap-4'
      : 'space-y-4';
  return <div className={cls}>{children}</div>;
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  mono,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  mono?: boolean;
}) {
  return (
    <div>
      <label className="text-xs text-slate-400 mb-1 block">{label}</label>
      <input
        type={type}
        className={`input ${mono ? 'font-mono text-xs' : ''}`}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

function Toggle({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="text-xs text-slate-400 mb-1 block">{label}</label>
      <select
        className="input"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select Global Setting</option>
        <option value="1">ON</option>
        <option value="0">OFF</option>
      </select>
    </div>
  );
}