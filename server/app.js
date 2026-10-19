/** Application Express : site statique + API de commande + webhook K-PAY. */
import path from 'node:path';
import express from 'express';
import { config, kpayEnabled } from './config.js';
import { securityHeaders } from './lib/security.js';
import { ordersRouter } from './routes/orders.js';
import { paymentsRouter, webhookRouter } from './routes/payments.js';
import { waitlistRouter } from './routes/waitlist.js';

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  if (config.trustProxy) app.set('trust proxy', 1);
  app.use(securityHeaders);

  // Le webhook a besoin du corps brut pour vérifier la signature : il passe avant express.json().
  app.use('/api/kpay/webhook', webhookRouter);
  app.use(express.json({ limit: '20kb' }));

  app.use('/api/orders', ordersRouter);
  app.use('/api/payments', paymentsRouter);
  app.use('/api/waitlist', waitlistRouter);
  app.get('/api/health', (req, res) => res.json({ ok: true, kpay: kpayEnabled() }));
  app.use('/api', (req, res) => res.status(404).json({ message: 'Ressource introuvable.' }));

  // Fichier de vérification du domaine K-PAY, servi tel quel en texte brut.
  app.get('/.well-known/kpay-verification.txt', (req, res) => {
    res.type('text/plain').sendFile(path.join(config.publicDir, '.well-known', 'kpay-verification.txt'), { dotfiles: 'allow' });
  });

  app.use(express.static(config.publicDir, {
    dotfiles: 'allow',
    extensions: ['html'],
    maxAge: '7d',
    setHeaders(res, file) {
      if (file.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
    },
  }));

  app.use((req, res) => res.status(404).sendFile(path.join(config.publicDir, '404.html')));

  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed' || err.type === 'entity.too.large') {
      return res.status(400).json({ message: 'Requête invalide.' });
    }
    console.error(err);
    return res.status(500).json({ message: 'Erreur du serveur. Réessaie dans un instant.' });
  });

  return app;
}
