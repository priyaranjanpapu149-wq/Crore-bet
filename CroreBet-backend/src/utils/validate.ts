/**
 * Strict whitelist validators.
 * Reject anything that doesn't match the expected format.
 * No sanitization — invalid input = request denied.
 */

export function isValidName(input: any): { ok: boolean; value: string; msg?: string } {
  if (input == null || typeof input !== 'string') {
    return { ok: false, value: '', msg: 'Name is required' };
  }
  
  const name = input.trim();
  
  // 1. Length checks
  if (name.length < 3) return { ok: false, value: name, msg: 'Name must be at least 3 characters' };
  if (name.length > 60) return { ok: false, value: name, msg: 'Name must be under 60 characters' };

  // 2. 🚀 ANTI-XSS CHECK (Explicitly block known attack vectors)
  // Blocks <script>, javascript:, onload=, etc.
  const XSS_PAYLOAD_REGEX = /(<|>|javascript:|onerror|onload|script|iframe|eval|alert|document\.|window\.|&lt;|&gt;)/i;
  if (XSS_PAYLOAD_REGEX.test(name)) {
    return { ok: false, value: name, msg: 'Name contains invalid characters' };
  }

  // 3. STRICT WHITELIST (Unicode letters, numbers, spaces, dots, hyphens, apostrophes ONLY)
  // This blocks ALL HTML tags (<, >), slashes (/), colons (:), etc.
  const NAME_REGEX = /^[\p{L}\p{N}\s.\-']+$/u;
  if (!NAME_REGEX.test(name)) {
    return { ok: false, value: name, msg: 'Name contains invalid characters' };
  }

  // 4. Must contain at least one actual letter (blocks pure numbers like 7327045937)
  const HAS_LETTER_REGEX = /[\p{L}]/u;
  if (!HAS_LETTER_REGEX.test(name)) {
    return { ok: false, value: name, msg: 'Name must contain at least one letter' };
  }

  return { ok: true, value: name };
}

export function isValidMobile(input: any): { ok: boolean; value: string; msg?: string } {
  if (input == null || typeof input !== 'string') {
    return { ok: false, value: '', msg: 'Mobile is required' };
  }
  const mobile = String(input).trim();
  if (!/^[6-9]\d{9}$/.test(mobile)) {
    return { ok: false, value: mobile, msg: 'Invalid mobile number' };
  }
  return { ok: true, value: mobile };
}

export function isValidOtp(input: any): { ok: boolean; value: string; msg?: string } {
  if (input == null) return { ok: false, value: '', msg: 'OTP is required' };
  const code = String(input).trim();
  if (!/^\d{6}$/.test(code)) {
    return { ok: false, value: code, msg: 'Invalid OTP format' };
  }
  return { ok: true, value: code };
}

export function isValidPassword(input: any): { ok: boolean; value: string; msg?: string } {
  if (input == null || typeof input !== 'string') {
    return { ok: false, value: '', msg: 'Password is required' };
  }
  if (input.length < 8) return { ok: false, value: input, msg: 'Password must be at least 8 characters' };
  if (input.length > 128) return { ok: false, value: input, msg: 'Password too long' };
  if (!/[A-Z]/.test(input)) return { ok: false, value: input, msg: 'Password must contain an uppercase letter' };
  if (!/[0-9]/.test(input)) return { ok: false, value: input, msg: 'Password must contain a digit' };
  return { ok: true, value: input };
}

export function isValidReferCode(input: any): { ok: boolean; value: string | null; msg?: string } {
  if (input == null || input === '') return { ok: true, value: null };
  if (typeof input !== 'string') return { ok: false, value: null, msg: 'Invalid refer code' };
  const code = input.trim().toUpperCase();
  if (code.length === 0) return { ok: true, value: null };
  if (!/^[A-Z0-9]{4,20}$/.test(code)) {
    return { ok: false, value: null, msg: 'Invalid refer code format' };
  }
  return { ok: true, value: code };
}