/**
 * Paiements K-PAY :
 *  - GET  /api/payments/return  : retour du client (paramètres signés) → vérification + confirmation auprès de K-PAY
 *  - POST /api/kpay/webhook     : notification serveur à serveur, signée, qui fait foi
 */
import express, { Router } from 'express';
import { config } from '../config.js';
import { orders } from '../lib/store.js';
import { getPayment, verifyReturnSignature, verifyWebhookSignature } from '../lib/kpay.js';
import { applyKpayStatus, publicView, refFromExternalId } from '../lib/orders.js';

export const paymentsRouter = Router();

paymentsRouter.get('/return', async (req, res) => {
  const { status = '', reference = '', externalId = '', ts = '', sig = '' } = req.query;
  const ref = refFromExternalId(externalId);
  const order = ref ? await orders.get(ref) : null;
  if (!order) return res.status(404).json({ message: 'Commande introuvable.' });

  if (config.kpay.gatewaySecret && !verifyReturnSignature({ status, reference, externalId, ts, sig }, config.kpay.gatewaySecret)) {
    return res.status(400).json({ message: 'Lien de retour invalide ou expiré.' });
  }

  // On ne croit jamais l'URL seule : on demande l'état réel du paiement à K-PAY.
  const attempt = order.payments.find((p) => p.externalId === externalId);
  if (attempt?.kpayId) {
    try {
      const p = await getPayment(attempt.kpayId);
      await applyKpayStatus(ref, { externalId, paymentId: attempt.kpayId, status: p.status, amount: p.amount, source: 'return' });
    } catch (err) {
      console.error(`[retour ${ref}] K-PAY :`, err.message);
    }
  }
  const fresh = await orders.get(ref);
  res.set('Cache-Control', 'no-store');
  return res.json(publicView(fresh));
});

export const webhookRouter = Router();

webhookRouter.post('/', express.raw({ type: '*/*', limit: '100kb' }), async (req, res) => {
  const signature = req.get('X-KPAY-Signature') || '';
  if (!verifyWebhookSignature(req.body, signature, config.kpay.webhookSecret)) {
    return res.status(400).send('Invalid signature');
  }
  let event;
  try {
    event = JSON.parse(req.body.toString('utf8'));
  } catch {
    return res.status(400).send('Invalid JSON');
  }
  const name = String(event.event || req.get('X-KPAY-Event') || '');
  if (!name.startsWith('payment.')) return res.status(200).json({ received: true, ignored: name });

  const status = event.status || { 'payment.completed': 'COMPLETED', 'payment.failed': 'FAILED', 'payment.cancelled': 'CANCELLED' }[name];
  const ref = refFromExternalId(event.externalId || event.metadata?.orderRef);
  try {
    const order = await applyKpayStatus(ref, { externalId: event.externalId, paymentId: event.paymentId, status, amount: event.amount, source: `webhook:${name}` });
    if (!order) console.warn(`[webhook] commande inconnue pour ${event.externalId}`);
    return res.status(200).json({ received: true });
  } catch (err) {
    console.error('[webhook]', err);
    return res.status(500).send('Error'); // K-PAY réessaie sur les erreurs 5xx
  }
});
