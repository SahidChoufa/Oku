/** Notifications de commande : e-mail au client et alerte à la boutique. Les erreurs sont journalisées, jamais bloquantes. */
import { config } from '../config.js';
import { sendMail } from './mailer.js';
import { customerEmail, shopEmail } from '../templates/emails.js';

export function notifyOrder(order, kind) {
  const tasks = [
    sendMail({ to: order.customer.email, ...customerEmail(order, kind) }),
    config.mail.shopNotify ? sendMail({ to: config.mail.shopNotify, ...shopEmail(order, kind) }) : null,
  ].filter(Boolean);
  Promise.allSettled(tasks).then((results) => {
    results.filter((r) => r.status === 'rejected').forEach((r) => console.error(`[e-mail ${order.ref}]`, r.reason?.message || r.reason));
  });
}
