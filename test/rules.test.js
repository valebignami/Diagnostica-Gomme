import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diagnosi, livello } from '../js/rules.js';
import { SOGLIE_DEFAULT } from '../js/config.js';

const ruota = (int, cen, est, extra = {}) => ({ fine: { int, cen, est }, degrado: 'regolare', ...extra });
const base = (ruote, extra = {}) => ({ fondo: 'asfalto', tempAsfalto: 25, mescola: 'asf-medium', ruote, ...extra });
const tutte = (r) => ({ AS: r, AD: r, PS: r, PD: r });
const trova = (res, ambito, area) => res.suggerimenti.filter(s => s.ambito === ambito && s.area === area);

test('livello ritorna null sotto soglia e la fascia giusta sopra', () => {
  const s = { leggera: 5, media: 10, forte: 15 };
  assert.equal(livello(4, s), null);
  assert.equal(livello(5, s), 'leggera');
  assert.equal(livello(12, s), 'media');
  assert.equal(livello(20, s), 'forte');
});

test('interno molto piu caldo dell esterno: ridurre camber, intensita forte', () => {
  const res = diagnosi(base(tutte(ruota(100, 88, 80))));
  const c = trova(res, 'AS', 'camber');
  assert.equal(c.length, 1);
  assert.equal(c[0].intensita, 'forte');
  assert.match(c[0].testo, /ridurre/i);
});

test('esterno piu caldo dell interno: aumentare camber', () => {
  const res = diagnosi(base(tutte(ruota(80, 86, 88))));
  assert.match(trova(res, 'AS', 'camber')[0].testo, /aumentare/i);
  assert.equal(trova(res, 'AS', 'camber')[0].intensita, 'leggera');
});

test('centro piu caldo delle spalle: pressione alta, abbassare di 0.2', () => {
  const res = diagnosi(base(tutte(ruota(80, 89, 80))));
  const p = trova(res, 'AD', 'pressione')[0];
  assert.equal(p.intensita, 'media');
  assert.match(p.testo, /abbassare/i);
  assert.match(p.testo, /0[.,]2/);
});

test('spalle piu calde del centro: pressione bassa, alzare', () => {
  const res = diagnosi(base(tutte(ruota(90, 85, 90))));
  assert.match(trova(res, 'PS', 'pressione')[0].testo, /alzare/i);
});

test('ruota equilibrata: nessun suggerimento camber o pressione', () => {
  const res = diagnosi(base(tutte(ruota(82, 84, 80))));
  assert.equal(trova(res, 'AS', 'camber').length, 0);
  assert.equal(trova(res, 'AS', 'pressione').length, 0);
});
