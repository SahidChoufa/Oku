/**
 * Envoi d'e-mails par SMTP (nodemailer). Sans configuration SMTP, les messages sont seulement
 * écrits dans le journal du serveur : la commande n'est jamais bloquée par un e-mail.
 */
import { config } from '../config.js';

let transport = null;

export async function sendMail({ to, subject, text, html }) {
  if (!to) return false;
  if (!config.mail.host) {
    console.log(`[e-mail non envoyé, SMTP non configuré] à ${to} : ${subject}`);
    return false;
  }
  if (!transport) {
    const nodemailer = (await import('nodemailer')).default;
    transport = nodemailer.createTransport({
      host: config.mail.host,
      port: config.mail.port,
      secure: config.mail.secure,
      auth: config.mail.user ? { user: config.mail.user, pass: config.mail.pass } : undefined,
    });
  }
  await transport.sendMail({ from: config.mail.from, to, subject, text, html });
  return true;
}
