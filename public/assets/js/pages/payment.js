/**
 * Page de retour K-PAY (/paiement.html).
 * K-PAY y renvoie le client avec ?status&reference&externalId&ts&sig.
 * Le navigateur ne décide jamais seul qu'une commande est payée : il transmet ces paramètres
 * au serveur, qui vérifie la signature puis interroge K-PAY avant de répondre.
 */
import { CONFIG } from '../config.js';
import { initHeader } from '../modules/header.js';
import { initHotline } from '../modules/hotline.js';
import { cart } from '../modules/cart.js';
import { PENDING_KEY } from '../modules/checkout.js';
import { api } from '../lib/api.js';
import { readJSON, remove } from '../lib/storage.js';
import { $, esc } from '../lib/dom.js';
import { fcfa } from '../lib/format.js';
import { copyText } from '../lib/clipboard.js';

initHeader();
initHotline();

const box = $('#pay-state');
const params = new URLSearchParams(location.search);
const pending = readJSON(PENDING_KEY, null);
const ref = params.get('ref') || (params.get('externalId') || '').replace(/-P\d+$/, '') || pending?.ref || '';

const VIEWS = {
  checking: { eyebrow: 'Vérification', title: 'On vérifie ton paiement…', text: 'Ne ferme pas cette page, cela prend quelques secondes.' },
  paid: { eyebrow: 'Paiement confirmé', title: 'Merci, c\'est payé.', text: 'Ta commande part en préparation. Le livreur t\'appellera avant de passer.' },
  pending: { eyebrow: 'En attente', title: 'Paiement en attente.', text: 'Valide la demande de paiement sur ton téléphone. Cette page se met à jour toute seule.' },
  failed: { eyebrow: 'Paiement refusé', title: 'Le paiement n\'est pas passé.', text: 'Aucun montant n\'a été débité. Tu peux réessayer ou appeler la hotline.' },
  cancelled: { eyebrow: 'Paiement annulé', title: 'Paiement annulé.', text: 'Ta commande est gardée. Tu peux reprendre le paiement quand tu veux.' },
  unknown: { eyebrow: 'Paiement', title: 'Commande introuvable.', text: 'Appelle la hotline avec ta référence de commande, on retrouve tout.' },
};

function render(state, order) {
  const v = VIEWS[state] || VIEWS.unknown;
  const canRetry = (state === 'failed' || state === 'cancelled') && ref;
  box.innerHTML = `
    <p class="eyebrow">${v.eyebrow}</p>
    <h1>${v.title}</h1>
    <p class="lead">${v.text}</p>
    ${ref ? `<div class="ref"><span>Référence</span><b>${esc(ref)}</b><button type="button" class="copy" id="copy-ref">Copier</button></div>` : ''}
    ${order ? `<div class="box"><b>Montant</b><span>${fcfa(order.total)}</span></div>` : ''}
    <div class="row">
      ${canRetry ? '<button type="button" class="btn" id="retry">Reprendre le paiement</button>' : ''}
      <a class="btn ${canRetry ? 'ghost' : ''}" href="index.html">Retour à la boutique</a>
    </div>
    <p class="helpline">Besoin d'aide ? Hotline : <b data-hl-text>numéro à venir</b></p>`;
  initHotline();
  $('#copy-ref')?.addEventListener('click', (e) => copyText(ref, e.currentTarget, 'Copiée'));
  $('#retry')?.addEventListener('click', retry);
  if (state === 'paid') {
    cart.clear();
    remove(PENDING_KEY);
  }
}

async function retry(e) {
  const btn = e.currentTarget;
  btn.disabled = true;
  btn.textContent = 'Ouverture de K-PAY…';
  try {
    const res = await api(`/api/orders/${encodeURIComponent(ref)}/pay`, { method: 'POST' });
    location.assign(res.gatewayUrl);
  } catch (err) {
    btn.disabled = false;
    btn.textContent = 'Reprendre le paiement';
    box.insertAdjacentHTML('beforeend', `<p class="alert">${esc(err.message)}</p>`);
  }
}

async function poll(deadline) {
  try {
    const order = await api(`/api/orders/${encodeURIComponent(ref)}`);
    const state = { paid: 'paid', failed: 'failed', cancelled: 'cancelled' }[order.status] || 'pending';
    render(state, order);
    if (state === 'pending' && Date.now() < deadline) setTimeout(() => poll(deadline), 4000);
  } catch {
    render('unknown');
  }
}

async function start() {
  if (CONFIG.demo) { render('pending'); return; }
  if (!ref) { render('unknown'); return; }
  render('checking');
  if (params.get('annule') === '1' && !params.get('sig')) {
    // retour par cancelUrl : on demande quand même l'état au serveur
    poll(Date.now());
    return;
  }
  if (params.get('sig')) {
    try {
      const res = await api(`/api/payments/return?${params.toString()}`);
      const state = { paid: 'paid', failed: 'failed', cancelled: 'cancelled' }[res.status] || 'pending';
      render(state, res);
      if (state === 'pending') setTimeout(() => poll(Date.now() + 3 * 60 * 1000), 4000);
      return;
    } catch {
      /* signature invalide ou expirée : on se fie à l'état connu du serveur */
    }
  }
  poll(Date.now() + 3 * 60 * 1000);
}

start();
