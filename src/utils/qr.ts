import crypto from 'crypto';

const QR_SECRET = process.env.QR_HMAC_SECRET || 'dev_qr_secret';

export function signTableToken(
  tableId: string | number,
  ttlSeconds = 60 * 60 * 24 * 365,
) {
  const expiresAt = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${tableId}:${expiresAt}`;
  const hmac = crypto
    .createHmac('sha256', QR_SECRET)
    .update(payload)
    .digest('hex');
  return Buffer.from(`${payload}:${hmac}`).toString('base64url');
}

export function verifyTableToken(token: string) {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    const [tableId, expiresAtStr, hmac] = decoded.split(':');
    const payload = `${tableId}:${expiresAtStr}`;
    const expected = crypto
      .createHmac('sha256', QR_SECRET)
      .update(payload)
      .digest('hex');
    if (!expected || expected !== hmac) return { valid: false };
    const expiresAt = Number(expiresAtStr);
    if (isNaN(expiresAt) || expiresAt < Math.floor(Date.now() / 1000))
      return { valid: false, expired: true };
    return { valid: true, tableId };
  } catch (err) {
    return { valid: false };
  }
}

export default { signTableToken, verifyTableToken };
