import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePhone, isEmail, validateCheckout } from '../public/assets/js/lib/validate.js';

test('numéros camerounais', () => {
  assert.equal(normalizePhone('677 12 34 56'), '+237 6 77 12 34 56');
  assert.equal(normalizePhone('+237 677123456'), '+237 6 77 12 34 56');
  assert.equal(normalizePhone('00237677123456'), '+237 6 77 12 34 56');
  assert.equal(normalizePhone('233 42 11 00'), '+237 2 33 42 11 00');
  assert.equal(normalizePhone('12345'), null);
  assert.equal(normalizePhone('877123456'), null);
});

test('adresses e-mail', () => {
  assert.ok(isEmail('awa@exemple.cm'));
  assert.ok(!isEmail('awa@exemple'));
  assert.ok(!isEmail('awa exemple.cm'));
});

test('formulaire de commande complet et incomplet', () => {
  const good = validateCheckout({
    customer: { name: 'Awa Ngono', email: 'awa@exemple.cm', phone: '677123456' },
    delivery: { city: 'Douala', district: 'Bonamoussadi', address: 'Rue des Palmiers, après la pharmacie' },
    payment: 'kpay',
    acceptTerms: true,
  }, ['Douala', 'Yaoundé', 'Bafoussam']);
  assert.ok(good.ok);
  assert.equal(good.value.customer.phone, '+237 6 77 12 34 56');

  const bad = validateCheckout({ customer: {}, delivery: { city: 'Paris' } }, ['Douala']);
  assert.ok(!bad.ok);
  assert.deepEqual(Object.keys(bad.errors).sort(), ['address', 'city', 'district', 'email', 'name', 'phone', 'terms']);
});
