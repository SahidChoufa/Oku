/** En-têtes de sécurité et limitation simple du nombre de requêtes par adresse IP. */
import { config } from '../config.js';

export function securityHeaders(req, res, next) {
  res.set({
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'X-Frame-Options': 'DENY',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy': [
      "default-src 'self'",
      "img-src 'self' data:",
      "style-src 'self' 'unsafe-inline'",
      "script-src 'self'",
      "font-src 'self'",
      "connect-src 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
    ].join('; '),
  });
  if (config.publicUrl.startsWith('https://')) {
    res.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
}

/** Limite en mémoire : `max` requêtes par fenêtre de `windowMs` et par IP. */
export function rateLimit({ windowMs, max, message = 'Trop de demandes. Réessaie dans quelques minutes.' }) {
  const hits = new Map();
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) if (now - v.start > windowMs) hits.delete(k);
  }, windowMs).unref();
  return (req, res, next) => {
    const key = req.ip || 'unknown';
    const now = Date.now();
    let entry = hits.get(key);
    if (!entry || now - entry.start > windowMs) {
      entry = { start: now, n: 0 };
      hits.set(key, entry);
    }
    entry.n += 1;
    if (entry.n > max) return res.status(429).json({ message });
    next();
  };
}
