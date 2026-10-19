/** Liste prioritaire : prénom, numéro WhatsApp, ville, consentement explicite. */
import { Router } from 'express';
import { waitlist } from '../lib/store.js';
import { normalizePhone, phoneDigits, cleanText } from '../../public/assets/js/lib/validate.js';
import { rateLimit } from '../lib/security.js';

export const waitlistRouter = Router();
const CITIES = ['Douala', 'Yaoundé', 'Bafoussam', 'Autre ville'];

waitlistRouter.post('/', rateLimit({ windowMs: 10 * 60 * 1000, max: 10 }), async (req, res) => {
  const firstName = cleanText(req.body?.firstName, 60);
  const phone = normalizePhone(req.body?.phone);
  const city = CITIES.includes(req.body?.city) ? req.body.city : 'Autre ville';
  if (firstName.length < 2 || !phone) return res.status(422).json({ message: 'Vérifie ton prénom et ton numéro WhatsApp.' });
  if (req.body?.consent !== true) return res.status(422).json({ message: 'Ton accord est nécessaire pour être contacté sur WhatsApp.' });
  const key = phoneDigits(phone);
  const existing = await waitlist.get(key);
  await waitlist.put(key, {
    firstName,
    phone,
    city,
    consentAt: new Date().toISOString(),
    createdAt: existing?.createdAt || new Date().toISOString(),
  });
  return res.status(existing ? 200 : 201).json({ ok: true });
});
