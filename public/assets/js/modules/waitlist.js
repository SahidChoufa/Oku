/** Liste prioritaire du lot 001 (prénom, WhatsApp, ville, consentement). */
import { CONFIG } from '../config.js';
import { normalizePhone, cleanText } from '../lib/validate.js';
import { esc } from '../lib/dom.js';
import { api } from '../lib/api.js';
import { markField, clearFieldErrors } from './forms.js';

export function initWaitlist() {
  const form = document.getElementById('wl');
  const ok = document.getElementById('wl-ok');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearFieldErrors(form);
    const firstName = cleanText(form.elements['wl-nom'].value, 60);
    const phone = normalizePhone(form.elements['wl-tel'].value);
    const city = form.elements['wl-ville'].value;
    const consent = form.elements['wl-consent'].checked;
    const errors = {
      'wl-nom': firstName.length < 2,
      'wl-tel': !phone,
      'wl-consent': !consent,
    };
    Object.entries(errors).forEach(([id, bad]) => markField(form.elements[id], bad));
    const first = Object.keys(errors).find((k) => errors[k]);
    if (first) { form.elements[first].focus(); return; }
    form.elements['wl-tel'].value = phone;

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    try {
      if (!CONFIG.demo) await api('/api/waitlist', { method: 'POST', body: { firstName, phone, city, consent } });
      ok.hidden = false;
      ok.classList.remove('err');
      ok.innerHTML = `C'est noté, ${esc(firstName)}. Rendez-vous le 30 novembre au soir.${CONFIG.demo ? '<small>Démo : l\'inscription n\'est pas envoyée.</small>' : ''}`;
      form.reset();
    } catch (err) {
      ok.hidden = false;
      ok.classList.add('err');
      ok.textContent = err.message;
    } finally {
      btn.disabled = false;
    }
  });
}
