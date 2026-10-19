/** Petits utilitaires DOM. */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Échappe une chaîne avant de l'insérer dans du HTML. */
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

/** Crée un élément à partir d'une chaîne HTML (un seul élément racine). */
export function fromHTML(html) {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

export const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

/** Relance une animation CSS sur un élément. */
export function replay(el, cls) {
  if (reducedMotion()) return;
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}
