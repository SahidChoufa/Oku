/**
 * Panier : état unique, mémorisé dans le navigateur, avec abonnements.
 * Les lignes ne stockent que { sku, qty, grind } ; les prix viennent toujours du catalogue.
 */
import { CONFIG } from '../config.js';
import { readJSON, writeJSON } from '../lib/storage.js';
import { resolveSku, priceCart, MAX_QTY_PER_LINE } from '../data/catalog.js';

const listeners = new Set();

function sanitize(list) {
  return (Array.isArray(list) ? list : [])
    .filter((x) => x && resolveSku(x.sku) && Number.isInteger(x.qty) && x.qty > 0)
    .map((x) => ({ sku: x.sku, qty: Math.min(x.qty, MAX_QTY_PER_LINE), grind: typeof x.grind === 'string' ? x.grind : '' }));
}

let items = sanitize(readJSON(CONFIG.cartKey, []));

function emit() {
  writeJSON(CONFIG.cartKey, items);
  listeners.forEach((fn) => fn());
}

const find = (sku, grind = '') => items.find((x) => x.sku === sku && x.grind === grind);

export const cart = {
  lines() {
    return items.map((x) => ({ ...x, ...resolveSku(x.sku) }));
  },
  count() {
    return items.reduce((s, x) => s + x.qty, 0);
  },
  totals(city) {
    return priceCart(items, city);
  },
  add(sku, grind = '', qty = 1) {
    if (!resolveSku(sku)) return;
    const line = find(sku, grind);
    if (line) line.qty = Math.min(line.qty + qty, MAX_QTY_PER_LINE);
    else items.push({ sku, grind, qty: Math.min(qty, MAX_QTY_PER_LINE) });
    emit();
  },
  setQty(sku, grind, qty) {
    const line = find(sku, grind);
    if (!line) return;
    if (qty <= 0) items = items.filter((x) => x !== line);
    else line.qty = Math.min(qty, MAX_QTY_PER_LINE);
    emit();
  },
  clear() {
    items = [];
    emit();
  },
  /** Données envoyées au serveur. */
  payload() {
    return items.map(({ sku, qty, grind }) => ({ sku, qty, grind }));
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
