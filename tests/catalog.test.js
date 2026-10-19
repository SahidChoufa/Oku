import test from 'node:test';
import assert from 'node:assert/strict';
import { priceCart, resolveSku, coffeePrice } from '../public/assets/js/data/catalog.js';

test('le café coûte 15 000 FCFA le kilo, quel que soit le format', () => {
  assert.equal(coffeePrice(250), 3750);
  assert.equal(coffeePrice(500), 7500);
  assert.equal(coffeePrice(1000), 15000);
});

test('le total est recalculé depuis le catalogue, pas depuis le navigateur', () => {
  const r = priceCart([{ sku: 'sommet-500', qty: 2, grind: 'En grains', unitPrice: 1 }, { sku: 'moka', qty: 1 }], 'Douala');
  assert.equal(r.subtotal, 2 * 7500 + 14000);
  assert.equal(r.total, r.subtotal);
  assert.deepEqual(r.errors, []);
});

test('les articles inconnus et les quantités invalides sont refusés', () => {
  const r = priceCart([{ sku: 'sommet-333', qty: 1 }, { sku: 'moka', qty: 0 }, { sku: 'moka', qty: 99 }], 'Douala');
  assert.equal(r.lines.length, 0);
  assert.equal(r.errors.length, 3);
});

test('une mouture inconnue retombe sur « En grains »', () => {
  const r = priceCart([{ sku: 'insomnie-250', qty: 1, grind: '<script>' }], 'Yaoundé');
  assert.equal(r.lines[0].grind, 'En grains');
});

test('resolveSku connaît cafés et machines', () => {
  assert.equal(resolveSku('manengouba-1000').unitPrice, 15000);
  assert.equal(resolveSku('espresso').unitPrice, 210000);
  assert.equal(resolveSku('nimporte'), null);
});
