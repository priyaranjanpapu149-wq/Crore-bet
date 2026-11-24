import axios from 'axios';

const BREVO_API_KEY = process.env.BREVO_API_KEY;
const SENDER_EMAIL = process.env.BREVO_SENDER_EMAIL;
const SENDER_NAME = process.env.BREVO_SENDER_NAME;

if (!BREVO_API_KEY) throw new Error('Missing BREVO_API_KEY in .env');
if (!SENDER_EMAIL) throw new Error('Missing BREVO_SENDER_EMAIL in .env');
if (!SENDER_NAME) throw new Error('Missing BREVO_SENDER_NAME in .env');

async function sendEmail(to: string, subject: string, html: string) {
  const { data } = await axios.post(
    'https://api.brevo.com/v3/smtp/email',
    {
      sender: { name: SENDER_NAME, email: SENDER_EMAIL },
      to: [{ email: to }],
      subject,
      htmlContent: html,
    },
    {
      headers: {
        'api-key': BREVO_API_KEY,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      timeout: 15000,
    }
  );
  return data;
}

function otpTemplate(title: string, subtitle: string, otp: string) {
  return `
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;">
      <div style="background:linear-gradient(135deg,#0a0a1a,#1a0a2e);padding:30px;text-align:center;border-radius:12px 12px 0 0;">
        <h1 style="color:#d4af37;margin:0;font-size:28px;">Crorebet</h1>
        <p style="color:#9ca3af;margin:8px 0 0;font-size:12px;letter-spacing:2px;">ADMIN PANEL</p>
      </div>
      <div style="background:#13132b;padding:30px;border-radius:0 0 12px 12px;">
        <h2 style="color:#f5f5f7;margin:0 0 8px;">${title}</h2>
        <p style="color:#9ca3af;margin:0 0 20px;font-size:14px;">${subtitle}</p>
        <div style="background:#0a0a1a;border:2px solid #d4af37;border-radius:10px;padding:20px;text-align:center;">
          <span style="color:#d4af37;font-size:42px;font-weight:bold;letter-spacing:8px;font-family:monospace;">${otp}</span>
        </div>
        <p style="color:#9ca3af;margin:20px 0 0;font-size:12px;">Valid for <strong style="color:#d4af37;">5 minutes</strong>. Do not share.</p>
        <hr style="border:none;border-top:1px solid #2a2a4a;margin:20px 0;" />
        <p style="color:#6b7280;margin:0;font-size:11px;">If you didn't request this, ignore this email.</p>
      </div>
    </div>
  `;
}

export async function sendResetOtpEmail(to: string, otp: string) {
  return sendEmail(
    to,
    'Crorebet Admin - Password Reset',
    otpTemplate('Password Reset', 'Use this OTP to reset your password:', otp)
  );
}

export async function sendResetConfirmationEmail(
  to: string,
  adminName: string,
  when: Date
) {
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto;">
      <div style="background:linear-gradient(135deg,#0a0a1a,#1a0a2e);padding:30px;text-align:center;border-radius:12px 12px 0 0;">
        <h1 style="color:#d4af37;margin:0;font-size:28px;">Crorebet</h1>
        <p style="color:#9ca3af;margin:8px 0 0;font-size:12px;letter-spacing:2px;">ADMIN PANEL</p>
      </div>
      <div style="background:#13132b;padding:30px;border-radius:0 0 12px 12px;">
        <h2 style="color:#4ade80;margin:0 0 16px;">Password Reset Successful</h2>
        <p style="color:#f5f5f7;font-size:15px;">Hello ${adminName || 'Admin'},</p>
        <p style="color:#9ca3af;font-size:14px;line-height:1.6;">Your admin account password was successfully changed.</p>
        <p style="color:#9ca3af;font-size:14px;">
          <strong style="color:#d4af37;">Time:</strong> ${when.toUTCString()}
        </p>
        <hr style="border:none;border-top:1px solid #2a2a4a;margin:20px 0;" />
        <p style="color:#9ca3af;font-size:13px;">If you made this change, no further action is required.</p>
        <p style="color:#f87171;font-size:13px;">If you did not make this change, contact the system administrator immediately.</p>
        <hr style="border:none;border-top:1px solid #2a2a4a;margin:20px 0;" />
        <p style="color:#6b7280;font-size:11px;">Never share your password or OTP with anyone.</p>
        <p style="color:#6b7280;font-size:11px;">Crorebet Admin Security Team</p>
      </div>
    </div>
  `;
  return sendEmail(to, 'Admin Password Reset Successful', html);
}