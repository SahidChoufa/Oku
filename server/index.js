/** Démarrage du serveur OKU : `npm start`. */
import { config, kpayEnabled } from './config.js';
import { createApp } from './app.js';

const app = createApp();

app.listen(config.port, () => {
  console.log(`OKU en ligne sur ${config.publicUrl} (port ${config.port})`);
  if (!kpayEnabled()) console.warn('K-PAY non configuré : seul le paiement à la livraison est accepté. Renseigne KPAY_API_KEY et KPAY_SECRET_KEY.');
  if (!config.kpay.webhookSecret) console.warn('KPAY_WEBHOOK_SECRET manquant : les webhooks K-PAY seront refusés.');
});
