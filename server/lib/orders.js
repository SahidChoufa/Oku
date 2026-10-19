/**
 * Logique des commandes : création à partir du formulaire, statuts, paiement K-PAY.
 * Les prix sont recalculés ici à partir du catalogue partagé, jamais repris du navigateur.
 */
import crypto from 'node:crypto';
import { priceCart, DELIVERY } from '../../public/assets/js/data/catalog.js';
import { validateCheckout } from '../../public/assets/js/lib/validate.js';
import { config } from '../config.js';
import { orders } from './store.js';
import { initGatewayPayment } from './kpay.js';
import { notifyOrder } from './notify.js';

export const STATUS = {
  PENDING: 'pending_payment',
  PAID: 'paid',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  COD: 'cod_confirmed',
};

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function newRef(date = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  const rnd = Array.from(crypto.randomBytes(5), (b) => ALPHABET[b % ALPHABET.length]).join('');
  return `OKU-${String(date.getFullYear()).slice(2)}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${rnd}`;
}

export const paymentExternalId = (ref, attempt) => `${ref}-P${attempt}`;
export const refFromExternalId = (ext) => String(ext || '').replace(/-P\d+$/, '');

/** Construit une commande à partir du corps de requête. Renvoie { ok, order } ou { ok:false, errors }. */
export function buildOrder(body) {
  const v = validateCheckout(body, DELIVERY.cities);
  const priced = priceCart(body?.items, v.value.delivery.city);
  const errors = { ...v.errors };
  if (!priced.lines.length) errors.items = 'Ton panier est vide.';
  if (priced.errors.length) errors.items = priced.errors.join(' ');
  if (Object.keys(errors).length) return { ok: false, errors };
  const now = new Date();
  return {
    ok: true,
    order: {
      ref: newRef(now),
      createdAt: now.toISOString(),
      status: v.value.payment === 'kpay' ? STATUS.PENDING : STATUS.COD,
      payment: v.value.payment,
      customer: v.value.customer,
      delivery: v.value.delivery,
      lines: priced.lines,
      subtotal: priced.subtotal,
      deliveryFee: priced.delivery,
      total: priced.total,
      currency: 'XAF',
      acceptedTermsAt: now.toISOString(),
      payments: [],
      history: [{ at: now.toISOString(), status: v.value.payment === 'kpay' ? STATUS.PENDING : STATUS.COD, source: 'checkout' }],
      notified: {},
    },
  };
}

/** Ce que le navigateur peut voir d'une commande (aucune donnée personnelle). */
export function publicView(order) {
  return {
    ref: order.ref,
    status: order.status,
    payment: order.payment,
    total: order.total,
    items: order.lines.map((l) => ({ name: l.name, qty: l.qty, grind: l.grind })),
    createdAt: order.createdAt,
  };
}

/** Lance une tentative de paiement K-PAY pour une commande et l'enregistre. */
export async function startPayment(order) {
  const attempt = order.payments.length + 1;
  const externalId = paymentExternalId(order.ref, attempt);
  const p = await initGatewayPayment({
    amount: order.total,
    externalId,
    returnUrl: `${config.publicUrl}/paiement.html`,
    cancelUrl: `${config.publicUrl}/paiement.html?annule=1&ref=${encodeURIComponent(order.ref)}`,
    description: `Commande ${order.ref} · OKU`,
    customerEmail: order.customer.email,
    metadata: { orderRef: order.ref },
  });
  order.payments.push({ externalId, kpayId: p.id, reference: p.reference, status: 'PENDING', isTest: p.isTest, createdAt: new Date().toISOString() });
  if (order.status !== STATUS.PAID) order.status = STATUS.PENDING;
  await orders.put(order.ref, order);
  return p;
}

const MAP = { COMPLETED: STATUS.PAID, FAILED: STATUS.FAILED, CANCELLED: STATUS.CANCELLED };

/**
 * Applique un statut K-PAY à une commande (idempotent).
 * Une commande payée ne repasse jamais en échec ; un montant incohérent est signalé, pas validé.
 */
export async function applyKpayStatus(ref, { externalId, paymentId, status, amount, source }) {
  const order = await orders.get(ref);
  if (!order) return null;
  const attempt = order.payments.find((p) => p.externalId === externalId || (paymentId && p.kpayId === paymentId));
  const kstatus = String(status || '').toUpperCase();
  if (attempt) {
    attempt.status = kstatus || attempt.status;
    attempt.updatedAt = new Date().toISOString();
  }
  const next = MAP[kstatus];
  if (next === STATUS.PAID && amount != null && Number(amount) !== order.total) {
    order.history.push({ at: new Date().toISOString(), status: 'amount_mismatch', source, amount: Number(amount) });
    order.review = true;
    await orders.put(ref, order);
    console.warn(`[commande ${ref}] montant K-PAY ${amount} différent du total ${order.total} : à vérifier`);
    return order;
  }
  if (next && order.status !== STATUS.PAID && order.status !== next) {
    order.status = next;
    if (next === STATUS.PAID) order.paidAt = new Date().toISOString();
    order.history.push({ at: new Date().toISOString(), status: next, source });
  }
  await orders.put(ref, order);
  if (order.status === STATUS.PAID && !order.notified.paid) {
    order.notified.paid = new Date().toISOString();
    await orders.put(ref, order);
    notifyOrder(order, 'paid');
  }
  return order;
}
