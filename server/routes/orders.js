/** API des commandes : création, consultation, reprise du paiement. */
import { Router } from 'express';
import { kpayEnabled } from '../config.js';
import { orders } from '../lib/store.js';
import { buildOrder, publicView, startPayment, STATUS } from '../lib/orders.js';
import { notifyOrder } from '../lib/notify.js';
import { rateLimit } from '../lib/security.js';

export const ordersRouter = Router();
const limiter = rateLimit({ windowMs: 10 * 60 * 1000, max: 20 });
const REF = /^OKU-\d{6}-[A-Z2-9]{4,6}$/;

const UNAVAILABLE = 'Le paiement en ligne est momentanément indisponible. Choisis le paiement à la livraison ou appelle la hotline.';

ordersRouter.post('/', limiter, async (req, res) => {
  const built = buildOrder(req.body);
  if (!built.ok) return res.status(422).json({ message: 'Certaines informations sont à corriger.', errors: built.errors });
  const order = built.order;

  if (order.payment === 'kpay') {
    if (!kpayEnabled()) return res.status(503).json({ message: UNAVAILABLE });
    await orders.put(order.ref, order);
    try {
      const p = await startPayment(order);
      return res.status(201).json({ ref: order.ref, status: order.status, total: order.total, gatewayUrl: p.gatewayUrl });
    } catch (err) {
      console.error(`[commande ${order.ref}] K-PAY :`, err.message, err.body ?? '');
      return res.status(502).json({ ref: order.ref, message: "K-PAY n'a pas répondu. Réessaie dans un instant ou choisis le paiement à la livraison." });
    }
  }

  await orders.put(order.ref, order);
  order.notified.cod = new Date().toISOString();
  await orders.put(order.ref, order);
  notifyOrder(order, 'cod');
  return res.status(201).json({ ref: order.ref, status: order.status, total: order.total });
});

ordersRouter.get('/:ref', async (req, res) => {
  if (!REF.test(req.params.ref)) return res.status(404).json({ message: 'Commande introuvable.' });
  const order = await orders.get(req.params.ref);
  if (!order) return res.status(404).json({ message: 'Commande introuvable.' });
  res.set('Cache-Control', 'no-store');
  return res.json(publicView(order));
});

ordersRouter.post('/:ref/pay', limiter, async (req, res) => {
  if (!REF.test(req.params.ref)) return res.status(404).json({ message: 'Commande introuvable.' });
  const order = await orders.get(req.params.ref);
  if (!order || order.payment !== 'kpay') return res.status(404).json({ message: 'Commande introuvable.' });
  if (order.status === STATUS.PAID) return res.status(409).json({ message: 'Cette commande est déjà payée.' });
  if (order.payments.length >= 5) return res.status(429).json({ message: 'Trop de tentatives de paiement. Appelle la hotline avec ta référence.' });
  if (!kpayEnabled()) return res.status(503).json({ message: UNAVAILABLE });
  try {
    const p = await startPayment(order);
    return res.json({ ref: order.ref, gatewayUrl: p.gatewayUrl });
  } catch (err) {
    console.error(`[commande ${order.ref}] K-PAY :`, err.message);
    return res.status(502).json({ message: "K-PAY n'a pas répondu. Réessaie dans un instant." });
  }
});
