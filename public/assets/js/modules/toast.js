/** Message bref en bas de l'écran (« Sommet · 250 g ajouté au panier »). */
let timer;

export function toast(message) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = message;
  el.classList.add('on');
  clearTimeout(timer);
  timer = setTimeout(() => el.classList.remove('on'), 2200);
}
