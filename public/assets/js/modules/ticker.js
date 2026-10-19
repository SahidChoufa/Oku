/** Bandeau défilant en haut de page. */
const MESSAGES = [
  'Lot 001',
  '300 sacs numérotés',
  'Ouverture mardi 1er décembre à 5 h',
  'Livraison Douala, Yaoundé, Bafoussam',
  'Paiement en ligne avec K-PAY',
  '15 000 FCFA le kilo',
];

export function initTicker() {
  const run = document.getElementById('run');
  if (!run) return;
  const once = MESSAGES.map((t) => `<span>${t}</span><span aria-hidden="true">✦</span>`).join('');
  run.innerHTML = once.repeat(4);
}
