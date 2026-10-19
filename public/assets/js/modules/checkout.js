/**
 * Tunnel de commande en trois étapes dans le tiroir du panier :
 * 1. Panier  →  2. Livraison et paiement  →  3. Confirmation (ou redirection vers K-PAY).
 */
import { CONFIG } from '../config.js';
import { DELIVERY } from '../data/catalog.js';
import { validateCheckout } from '../lib/validate.js';
import { $, $$, esc } from '../lib/dom.js';
import { fcfa } from '../lib/format.js';
import { api } from '../lib/api.js';
import { writeJSON } from '../lib/storage.js';
import { copyText } from '../lib/clipboard.js';
import { cart } from './cart.js';
import { markField, clearFieldErrors, liveClear } from './forms.js';

const FIELDS = { name: 'o-nom', email: 'o-mail', phone: 'o-tel', city: 'o-ville', district: 'o-quartier', address: 'o-adresse', terms: 'o-terms' };
const TITLES = { cart: 'Ton panier', form: 'Livraison et paiement', done: 'Commande enregistrée', redirect: 'Paiement' };
export const PENDING_KEY = 'oku-pending-order';

export function initCheckout() {
  const root = $('#cart');
  if (!root) return;
  const form = $('#v-form');
  const cta = $('#cta');
  const dbody = $('#dbody');
  const opener = $('#cartbtn');
  let view = 'cart';
  let busy = false;
  let lastFocus = null;

  liveClear(form);

  // ---------- ouverture / fermeture
  const open = () => {
    lastFocus = document.activeElement;
    root.classList.add('open');
    root.setAttribute('aria-hidden', 'false');
    setTimeout(() => $('[data-close].x', root)?.focus({ preventScroll: true }), 60);
  };
  const close = () => {
    root.classList.remove('open');
    root.setAttribute('aria-hidden', 'true');
    if (view === 'done') setTimeout(() => show('cart'), 650);
    (lastFocus || opener)?.focus?.({ preventScroll: true });
  };
  opener?.addEventListener('click', open);
  $$('[data-close]', root).forEach((b) => b.addEventListener('click', close));
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && root.classList.contains('open')) close(); });
  $('#back', root)?.addEventListener('click', () => show('cart'));

  // ---------- rendu
  function badge() {
    const b = $('#badge');
    if (!b) return;
    const n = cart.count();
    if (b.textContent !== String(n)) {
      b.textContent = String(n);
      b.classList.add('bump');
      setTimeout(() => b.classList.remove('bump'), 360);
    }
  }

  function renderItems() {
    const list = $('#items', root);
    const lines = cart.lines();
    if (!lines.length) {
      list.innerHTML = '<p class="empty">Ton panier est vide.</p>';
    } else {
      list.replaceChildren(...lines.map((l) => {
        const d = document.createElement('div');
        d.className = 'item';
        d.innerHTML = `<img src="${l.img}" alt=""><b>${esc(l.name)}</b><span class="u r">${fcfa(l.unitPrice * l.qty)}</span>
          <span class="u">${esc(l.grind || `${fcfa(l.unitPrice)} l'unité`)}</span>
          <div class="qty"><button type="button" aria-label="Retirer un ${esc(l.name)}">−</button><span>${l.qty}</span><button type="button" aria-label="Ajouter un ${esc(l.name)}">+</button></div>`;
        const [minus, plus] = d.querySelectorAll('button');
        minus.addEventListener('click', () => cart.setQty(l.sku, l.grind, l.qty - 1));
        plus.addEventListener('click', () => cart.setQty(l.sku, l.grind, l.qty + 1));
        return d;
      }));
    }
    const t = cart.totals(form.elements[FIELDS.city].value);
    $('#total', root).textContent = fcfa(t.total);
  }

  function renderRecap() {
    const city = form.elements[FIELDS.city].value;
    const t = cart.totals(city);
    $('#recap', root).innerHTML = t.lines.map((l) => `<div class="ln"><span>${l.qty} × ${esc(l.name)}${l.grind ? ` · ${esc(l.grind)}` : ''}</span><span>${fcfa(l.total)}</span></div>`).join('')
      + `<div class="ln"><span>Livraison${city ? ` · ${esc(city)}` : ''}</span><span>${t.delivery ? fcfa(t.delivery) : 'incluse'}</span></div>`
      + `<div class="ln t"><span>Total TTC</span><span>${fcfa(t.total)}</span></div>`;
    $('#total', root).textContent = fcfa(t.total);
  }

  function show(v) {
    view = v;
    $('#v-cart', root).hidden = v !== 'cart';
    form.hidden = v !== 'form';
    $('#v-done', root).hidden = v !== 'done' && v !== 'redirect';
    const idx = { cart: 0, form: 1, done: 2, redirect: 2 }[v];
    $$('.stepper span', root).forEach((s, i) => s.classList.toggle('on', i <= idx));
    $('#d-title', root).textContent = TITLES[v];
    $('#totrow', root).hidden = v === 'done' || v === 'redirect';
    dbody.scrollTop = 0;
    if (v === 'form') renderRecap();
    setCta();
  }

  function payMethod() {
    return form.querySelector('input[name="pay"]:checked')?.value === 'cod' ? 'cod' : 'kpay';
  }

  function setCta() {
    cta.onclick = null;
    const total = cart.totals(form.elements[FIELDS.city].value).total;
    if (view === 'cart') {
      cta.textContent = 'Passer commande';
      cta.disabled = cart.count() === 0;
      cta.onclick = () => { show('form'); setTimeout(() => form.elements[FIELDS.name].focus({ preventScroll: true }), 300); };
    } else if (view === 'form') {
      cta.disabled = busy || cart.count() === 0;
      cta.textContent = busy ? 'Envoi en cours…' : payMethod() === 'kpay' ? `Payer ${fcfa(total)} avec K-PAY` : `Commander, ${fcfa(total)} à la livraison`;
      cta.onclick = submit;
    } else {
      cta.disabled = false;
      cta.textContent = 'Continuer mes achats';
      cta.onclick = close;
    }
  }

  form.addEventListener('change', (e) => {
    if (e.target.name === 'pay' || e.target.id === FIELDS.city) { renderRecap(); setCta(); }
  });
  form.addEventListener('submit', (e) => { e.preventDefault(); submit(); });

  // ---------- envoi
  function collect() {
    const el = form.elements;
    return {
      customer: { name: el[FIELDS.name].value, email: el[FIELDS.email].value, phone: el[FIELDS.phone].value },
      delivery: { city: el[FIELDS.city].value, district: el[FIELDS.district].value, address: el[FIELDS.address].value, notes: el['o-notes'].value },
      payment: payMethod(),
      acceptTerms: el[FIELDS.terms].checked,
    };
  }

  function showErrors(errors) {
    clearFieldErrors(form);
    for (const [key, id] of Object.entries(FIELDS)) markField(form.elements[id], Boolean(errors[key]), errors[key]);
    const firstKey = Object.keys(FIELDS).find((k) => errors[k]);
    if (firstKey) {
      const input = form.elements[FIELDS[firstKey]];
      input.focus({ preventScroll: true });
      input.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }

  function formAlert(message) {
    const box = $('#form-alert', root);
    box.hidden = !message;
    box.textContent = message || '';
    if (message) box.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  async function submit() {
    if (busy) return;
    formAlert('');
    const v = validateCheckout(collect(), DELIVERY.cities);
    if (!v.ok) { showErrors(v.errors); return; }
    clearFieldErrors(form);
    form.elements[FIELDS.phone].value = v.value.customer.phone;
    const priced = cart.totals(v.value.delivery.city);
    if (!priced.lines.length) return;

    busy = true;
    setCta();
    try {
      const res = CONFIG.demo
        ? demoOrder(v.value, priced)
        : await api('/api/orders', { method: 'POST', body: { ...v.value, items: cart.payload(), acceptTerms: true } });
      const order = { ...res, customer: v.value.customer, delivery: v.value.delivery, lines: priced.lines, payment: v.value.payment };
      if (res.gatewayUrl) {
        writeJSON(PENDING_KEY, { ref: res.ref, at: Date.now() });
        renderRedirect(order);
        show('redirect');
        setTimeout(() => location.assign(res.gatewayUrl), 900);
      } else {
        cart.clear();
        renderDone(order);
        show('done');
      }
    } catch (err) {
      if (err.status === 422 && err.data?.errors) showErrors(err.data.errors);
      else formAlert(`${err.message} Si le problème continue, appelle la hotline.`);
    } finally {
      busy = false;
      setCta();
    }
  }

  function demoOrder(value, priced) {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    const rnd = Array.from(crypto.getRandomValues(new Uint8Array(4)), (b) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join('');
    return {
      ref: `OKU-${String(d.getFullYear()).slice(2)}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${rnd}`,
      status: value.payment === 'cod' ? 'cod_confirmed' : 'pending_payment',
      total: priced.total,
      demo: true,
    };
  }

  function refBlock(ref) {
    return `<div class="ref"><span>Référence</span><b>${esc(ref)}</b><button type="button" class="copy" data-copy-ref>Copier</button></div>`;
  }

  function bindCopy(ref) {
    const b = $('[data-copy-ref]', root);
    b?.addEventListener('click', () => copyText(ref, b, 'Copiée'));
  }

  function summaryBoxes(o) {
    return `<div class="box"><b>Livraison</b><span>${esc(o.delivery.district)}, ${esc(o.delivery.city)}<br>${esc(o.delivery.address)}${o.delivery.notes ? `<br>${esc(o.delivery.notes)}` : ''}</span></div>
      <div class="box"><b>Contact</b><span>${esc(o.customer.email)}<br>${esc(o.customer.phone)}</span></div>
      <div class="box"><b>Articles</b><span>${o.lines.map((l) => `${l.qty} × ${esc(l.name)}${l.grind ? ` · ${esc(l.grind)}` : ''}`).join('<br>')}</span></div>`;
  }

  function renderRedirect(o) {
    $('#v-done', root).innerHTML = `<div class="done">
      <span class="eyebrow">Paiement sécurisé K-PAY</span>
      <h3>On t'emmène payer.</h3>
      ${refBlock(o.ref)}
      <p>Ta commande de <b>${fcfa(o.total)}</b> est enregistrée. La page de paiement K-PAY s'ouvre : choisis Orange Money ou MTN MoMo et valide sur ton téléphone.</p>
      <a class="btn" href="${esc(o.gatewayUrl)}">Continuer vers K-PAY</a>
      ${summaryBoxes(o)}
    </div>`;
    bindCopy(o.ref);
  }

  function renderDone(o) {
    const first = o.customer.name.split(' ')[0];
    const cod = o.payment === 'cod';
    $('#v-done', root).innerHTML = `<div class="done">
      <span class="eyebrow">${cod ? 'Paiement à la livraison' : 'Paiement en ligne'}</span>
      <h3>Merci ${esc(first)}.</h3>
      ${refBlock(o.ref)}
      ${cod
        ? `<p>Tu paieras <b>${fcfa(o.total)}</b> en espèces au livreur. Il t'appellera au ${esc(o.customer.phone)} avant de passer.</p>`
        : `<p>Ta commande de <b>${fcfa(o.total)}</b> est prête à être payée avec K-PAY.</p>`}
      ${summaryBoxes(o)}
      <p class="note">${o.demo
        ? 'Démo : la commande n\'est pas envoyée au serveur et aucun paiement n\'est demandé.'
        : `Un e-mail de confirmation part à ${esc(o.customer.email)}. Garde ta référence pour la hotline.`}</p>
    </div>`;
    bindCopy(o.ref);
  }

  // ---------- démarrage
  const refresh = () => { renderItems(); if (view === 'form') renderRecap(); setCta(); badge(); };
  cart.subscribe(refresh);
  renderItems();
  $('#badge').textContent = String(cart.count());
  show('cart');
}
