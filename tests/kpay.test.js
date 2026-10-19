import test from 'node:test';
import assert from 'node:assert/strict';
import { hmacHex, verifyReturnSignature, verifyWebhookSignature } from '../server/lib/kpay.js';

const SECRET = 'gateway-secret-test';

test('signature de retour valide', () => {
  const ts = String(Math.floor(Date.now() / 1000));
  const sig = hmacHex(SECRET, `COMPLETED|KP-1|OKU-261015-ABCDE-P1|${ts}`);
  assert.ok(verifyReturnSignature({ status: 'COMPLETED', reference: 'KP-1', externalId: 'OKU-261015-ABCDE-P1', ts, sig }, SECRET));
});

test('signature de retour falsifiée ou expirée', () => {
  const ts = String(Math.floor(Date.now() / 1000));
  const sig = hmacHex(SECRET, `FAILED|KP-1|OKU-261015-ABCDE-P1|${ts}`);
  assert.ok(!verifyReturnSignature({ status: 'COMPLETED', reference: 'KP-1', externalId: 'OKU-261015-ABCDE-P1', ts, sig }, SECRET));
  const old = String(Math.floor(Date.now() / 1000) - 3600);
  const sigOld = hmacHex(SECRET, `COMPLETED|KP-1|OKU-261015-ABCDE-P1|${old}`);
  assert.ok(!verifyReturnSignature({ status: 'COMPLETED', reference: 'KP-1', externalId: 'OKU-261015-ABCDE-P1', ts: old, sig: sigOld }, SECRET));
  assert.ok(!verifyReturnSignature({ status: 'COMPLETED', reference: 'KP-1', externalId: 'OKU-261015-ABCDE-P1', ts, sig: 'abc' }, SECRET));
});

test('signature de webhook sur le corps brut', () => {
  const raw = Buffer.from(JSON.stringify({ event: 'payment.completed', status: 'COMPLETED' }));
  const sig = hmacHex('wh', raw);
  assert.ok(verifyWebhookSignature(raw, sig, 'wh'));
  assert.ok(!verifyWebhookSignature(raw, sig, 'autre'));
  assert.ok(!verifyWebhookSignature(raw, '', 'wh'));
  assert.ok(!verifyWebhookSignature(Buffer.from(raw.toString() + ' '), sig, 'wh'));
});
