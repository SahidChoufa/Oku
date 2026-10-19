/**
 * Configuration du serveur, lue dans les variables d'environnement (fichier .env à la racine).
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

try {
  process.loadEnvFile?.(path.join(ROOT, '.env'));
} catch {
  /* pas de fichier .env : on utilise les variables déjà définies */
}

const env = process.env;
const port = Number(env.PORT || 3000);

export const config = {
  port,
  publicUrl: (env.PUBLIC_URL || `http://localhost:${port}`).replace(/\/+$/, ''),
  publicDir: path.join(ROOT, 'public'),
  dataDir: env.DATA_DIR ? path.resolve(env.DATA_DIR) : path.join(ROOT, 'server', 'data'),
  trustProxy: env.TRUST_PROXY === '1',
  kpay: {
    apiBase: (env.KPAY_API_BASE || 'https://admin.kpay.site').replace(/\/+$/, ''),
    apiKey: env.KPAY_API_KEY || '',
    secretKey: env.KPAY_SECRET_KEY || '',
    gatewaySecret: env.KPAY_GATEWAY_SECRET || '',
    webhookSecret: env.KPAY_WEBHOOK_SECRET || '',
  },
  mail: {
    host: env.SMTP_HOST || '',
    port: Number(env.SMTP_PORT || 587),
    secure: env.SMTP_SECURE === '1',
    user: env.SMTP_USER || '',
    pass: env.SMTP_PASS || '',
    from: env.MAIL_FROM || 'OKU <no-reply@localhost>',
    shopNotify: env.SHOP_NOTIFY_EMAIL || '',
  },
};

export const kpayEnabled = () => Boolean(config.kpay.apiKey && config.kpay.secretKey);
