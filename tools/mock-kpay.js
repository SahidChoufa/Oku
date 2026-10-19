/**
 * Faux K-PAY pour tester le tunnel de paiement en local, sans argent réel.
 *   npm run mock:kpay   (port 4010)
 * Puis dans .env : KPAY_API_BASE=http://localhost:4010 et des clés quelconques.
 * Il imite : POST /api/v1/payments/init (mode GATEWAY), la page de paiement, le retour signé,
 * le webhook signé et GET /api/v1/payments/:id.
 */
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
try { process.loadEnvFile?.(path.join(ROOT, '.env')); } catch { /* facultatif */ }

const PORT = Number(process.env.MOCK_KPAY_PORT || 4010);
const GATEWAY_SECRET = process.env.KPAY_GATEWAY_SECRET || 'gateway-secret-test';
const WEBHOOK_SECRET = process.env.KPAY_WEBHOOK_SECRET || 'webhook-secret-test';
const WEBHOOK_URL = process.env.MOCK_WEBHOOK_URL || `${(process.env.PUBLIC_URL || 'http://localhost:3000').replace(/\/+$/, '')}/api/kpay/webhook`;

const hmac = (secret, data) => crypto.createHmac('sha256', secret).update(data).digest('hex');
const payments = new Map();
const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.post('/api/v1/payments/init', (req, res) => {
  if (!req.get('X-API-Key') || !req.get('X-Secret-Key')) return res.status(401).json({ message: 'Clés manquantes' });
  const { amount, externalId, returnUrl, cancelUrl } = req.body || {};
  if (!amount || !externalId || !returnUrl) return res.status(400).json({ message: 'amount, externalId et returnUrl sont requis' });
  for (const p of payments.values()) {
    if (p.externalId === externalId && p.status === 'PENDING') return res.status(409).json({ message: 'externalId déjà actif' });
  }
  const id = `pay_${crypto.randomBytes(5).toString('hex')}`;
  const p = { id, reference: `KP-${crypto.randomBytes(4).toString('hex').toUpperCase()}`, externalId, amount, currency: 'XAF', status: 'PENDING', returnUrl, cancelUrl, isTest: true };
  payments.set(id, p);
  res.status(201).json({ ...p, mode: 'GATEWAY', gatewayUrl: `http://localhost:${PORT}/pay/${id}`, expiresAt: new Date(Date.now() + 15 * 60e3).toISOString(), message: 'Paiement créé' });
});

app.get('/api/v1/payments/:id', (req, res) => {
  const p = payments.get(req.params.id);
  if (!p) return res.status(404).json({ message: 'Paiement introuvable' });
  const { returnUrl, cancelUrl, ...pub } = p;
  res.json(pub);
});

app.get('/pay/:id', (req, res) => {
  const p = payments.get(req.params.id);
  if (!p) return res.status(404).send('Paiement introuvable');
  res.send(`<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
  <title>K-PAY (simulation)</title><body style="font-family:system-ui;max-width:420px;margin:40px auto;padding:0 16px">
  <h1 style="font-size:22px">K-PAY · simulation</h1><p>Paiement de <b>${p.amount} FCFA</b><br>Référence ${p.reference}<br>Commande ${p.externalId}</p>
  <form method="post" action="/pay/${p.id}/COMPLETED"><button style="padding:12px 18px;width:100%;margin:6px 0">Payer (succès)</button></form>
  <form method="post" action="/pay/${p.id}/FAILED"><button style="padding:12px 18px;width:100%;margin:6px 0">Simuler un échec</button></form>
  <form method="post" action="/pay/${p.id}/CANCELLED"><button style="padding:12px 18px;width:100%;margin:6px 0">Annuler</button></form></body></html>`);
});

app.post('/pay/:id/:outcome', async (req, res) => {
  const p = payments.get(req.params.id);
  const outcome = req.params.outcome;
  if (!p || !['COMPLETED', 'FAILED', 'CANCELLED'].includes(outcome)) return res.status(404).send('Introuvable');
  p.status = outcome;
  const now = new Date().toISOString();
  const event = {
    event: `payment.${outcome.toLowerCase()}`,
    status: outcome,
    paymentId: p.id,
    reference: p.reference,
    amount: p.amount,
    phoneNumber: '237670000000',
    externalId: p.externalId,
    metadata: {},
    completedAt: outcome === 'COMPLETED' ? now : null,
    failedAt: outcome === 'FAILED' ? now : null,
    failureReason: outcome === 'FAILED' ? 'Solde insuffisant (simulation)' : null,
    timestamp: now,
  };
  const raw = JSON.stringify(event);
  try {
    const r = await fetch(WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-KPAY-Signature': hmac(WEBHOOK_SECRET, raw), 'X-KPAY-Event': event.event, 'User-Agent': 'KPAY-Webhook/1.0' }, body: raw });
    console.log(`webhook ${event.event} → ${r.status}`);
  } catch (err) {
    console.log(`webhook non délivré : ${err.message}`);
  }
  const ts = String(Math.floor(Date.now() / 1000));
  const sig = hmac(GATEWAY_SECRET, `${outcome}|${p.reference}|${p.externalId}|${ts}`);
  const base = outcome === 'CANCELLED' && p.cancelUrl ? p.cancelUrl : p.returnUrl;
  const u = new URL(base);
  for (const [k, v] of Object.entries({ status: outcome, reference: p.reference, externalId: p.externalId, ts, sig })) u.searchParams.set(k, v);
  res.redirect(303, u.toString());
});

app.listen(PORT, () => console.log(`Faux K-PAY sur http://localhost:${PORT} (webhook → ${WEBHOOK_URL})`));
