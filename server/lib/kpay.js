/**
 * Client K-PAY (https://kpay.site/documentation).
 * - Paiement hébergé (mode GATEWAY) : POST /api/v1/payments/init → gatewayUrl
 * - État d'un paiement : GET /api/v1/payments/:id
 * - Retour client signé : ?status&reference&externalId&ts&sig, sig = HMAC-SHA256(status|reference|externalId|ts)
 * - Webhook signé : en-tête X-KPAY-Signature = HMAC-SHA256 du corps brut
 */
import crypto from 'node:crypto';
import { config } from '../config.js';

export class KpayError extends Error {
  constructor(message, status, body) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

function headers() {
  return {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-API-Key': config.kpay.apiKey,
    'X-Secret-Key': config.kpay.secretKey,
  };
}

async function call(method, pathname, body) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 15000);
  try {
    const res = await fetch(`${config.kpay.apiBase}${pathname}`, {
      method,
      headers: headers(),
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new KpayError(json.message || `K-PAY a répondu ${res.status}`, res.status, json);
    // certaines réponses sont enveloppées dans { data: … }
    return json && typeof json === 'object' && json.data && typeof json.data === 'object' ? json.data : json;
  } catch (err) {
    if (err instanceof KpayError) throw err;
    throw new KpayError(`K-PAY injoignable : ${err.message}`, 0, null);
  } finally {
    clearTimeout(timer);
  }
}

/** Crée un paiement sur la page hébergée K-PAY. Renvoie { id, reference, gatewayUrl, expiresAt, isTest }. */
export async function initGatewayPayment({ amount, externalId, returnUrl, cancelUrl, description, customerEmail, metadata }) {
  const p = await call('POST', '/api/v1/payments/init', {
    amount: Math.round(amount),
    externalId,
    returnUrl,
    cancelUrl,
    description,
    customerEmail,
    metadata,
  });
  if (!p.gatewayUrl) throw new KpayError("K-PAY n'a pas renvoyé de page de paiement", 502, p);
  return { id: p.id, reference: p.reference, gatewayUrl: p.gatewayUrl, expiresAt: p.expiresAt, isTest: Boolean(p.isTest) };
}

/** État d'un paiement (PENDING, PROCESSING, COMPLETED, FAILED, CANCELLED…). */
export async function getPayment(id) {
  const p = await call('GET', `/api/v1/payments/${encodeURIComponent(id)}`);
  const payment = p.payment && typeof p.payment === 'object' ? p.payment : p;
  return { ...payment, status: String(payment.status || '').toUpperCase() };
}

function safeEqualHex(a, b) {
  const x = Buffer.from(String(a).toLowerCase(), 'utf8');
  const y = Buffer.from(String(b).toLowerCase(), 'utf8');
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

export function hmacHex(secret, data) {
  return crypto.createHmac('sha256', secret).update(data).digest('hex');
}

/**
 * Vérifie les paramètres signés ajoutés par K-PAY à l'URL de retour.
 * ts peut être en secondes ou en millisecondes ; on refuse au-delà de 10 minutes.
 */
export function verifyReturnSignature({ status, reference, externalId = '', ts, sig }, secret, now = Date.now(), maxAgeMs = 10 * 60 * 1000) {
  if (!secret || !status || !reference || !ts || !sig) return false;
  const tsNum = Number(ts);
  if (!Number.isFinite(tsNum)) return false;
  const tsMs = tsNum > 1e12 ? tsNum : tsNum * 1000;
  if (Math.abs(now - tsMs) > maxAgeMs) return false;
  const expected = hmacHex(secret, `${status}|${reference}|${externalId}|${ts}`);
  return safeEqualHex(sig, expected);
}

/** Vérifie la signature d'un webhook calculée sur le corps brut (Buffer). */
export function verifyWebhookSignature(rawBody, signature, secret) {
  if (!secret || !signature || !Buffer.isBuffer(rawBody)) return false;
  return safeEqualHex(signature, hmacHex(secret, rawBody));
}
