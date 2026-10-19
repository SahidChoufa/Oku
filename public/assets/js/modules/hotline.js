/**
 * Hotline et e-mail du service client : un seul réglage (config.js), affiché partout.
 * Attributs reconnus : data-hl-text, data-hl-num, data-hl-tag, data-hl-hours, data-hl-copy, data-hl-call, data-support-email.
 */
import { CONFIG } from '../config.js';
import { copyText } from '../lib/clipboard.js';

export function initHotline() {
  const number = CONFIG.hotline.number.trim();
  const has = Boolean(number);
  document.querySelectorAll('[data-hl-text]').forEach((el) => { el.textContent = has ? number : 'numéro à venir'; });
  document.querySelectorAll('[data-hl-num]').forEach((el) => {
    if (has) { el.textContent = number; el.classList.remove('ph'); }
  });
  document.querySelectorAll('[data-hl-tag]').forEach((el) => { el.hidden = has; });
  if (has && CONFIG.hotline.hours) {
    document.querySelectorAll('[data-hl-hours]').forEach((el) => { el.textContent = CONFIG.hotline.hours; });
  }
  document.querySelectorAll('[data-hl-copy]').forEach((btn) => {
    btn.disabled = !has;
    btn.addEventListener('click', () => copyText(number, btn, 'Numéro copié'));
  });
  document.querySelectorAll('[data-hl-call]').forEach((a) => {
    a.hidden = !has;
    if (has) a.href = 'tel:' + number.replace(/[^\d+]/g, '');
  });
  const mail = CONFIG.supportEmail.trim();
  document.querySelectorAll('[data-support-email]').forEach((el) => {
    if (mail) el.textContent = mail;
  });
}
