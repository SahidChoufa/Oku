/** Mise en forme des montants et des dates en français. */

const NBSP = ' ';

/** 15000 → « 15 000 FCFA » (espaces insécables). */
export function fcfa(amount) {
  return Math.round(Number(amount) || 0).toLocaleString('fr-FR').replace(/[  \s]/g, NBSP) + NBSP + 'FCFA';
}

export function pad2(n) {
  return String(n).padStart(2, '0');
}
