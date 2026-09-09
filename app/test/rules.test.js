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

test('salita di temperatura oltre soglia tra inizio e fine', () => {
  const r = ruota(90, 92, 88, { inizio: { int: 55, cen: 58, est: 55 } });
  const res = diagnosi(base(tutte(r)));
  const p = trova(res, 'AS', 'pressione').filter(x => /salita/i.test(x.titolo));
  assert.equal(p.length, 1);
});

test('degrado spalla interna rafforza il camber da leggera a media', () => {
  const r = ruota(86, 84, 80, { degrado: 'spallaInt' });
  const res = diagnosi(base(tutte(r)));
  assert.equal(trova(res, 'AS', 'camber')[0].intensita, 'media');
  assert.equal(trova(res, 'AS', 'degrado').length, 1);
});

test('graining genera un suggerimento degrado con indicazione mescola piu morbida', () => {
  const r = ruota(70, 70, 70, { degrado: 'graining' });
  const res = diagnosi(base(tutte(r)));
  assert.match(trova(res, 'AD', 'degrado')[0].testo, /morbida/i);
});

test('anteriore piu caldo del posteriore: sottosterzo', () => {
  const ant = ruota(95, 96, 94), post = ruota(78, 79, 77);
  const res = diagnosi(base({ AS: ant, AD: ant, PS: post, PD: post }));
  const b = trova(res, 'anteriore', 'bilanciamento');
  assert.equal(b.length, 1);
  assert.equal(b[0].intensita, 'media');
  assert.match(b[0].testo, /sottosterzo/i);
});

test('lato sinistro piu caldo: asimmetria', () => {
  const sx = ruota(95, 96, 94), dx = ruota(70, 71, 69);
  const res = diagnosi(base({ AS: sx, AD: dx, PS: sx, PD: dx }));
  assert.equal(trova(res, 'sinistra', 'asimmetria')[0].intensita, 'forte');
});

test('media sotto il range della mescola: mescola piu morbida', () => {
  const res = diagnosi(base(tutte(ruota(55, 56, 54))));
  assert.match(trova(res, 'auto', 'mescola')[0].testo, /più morbida/i);
});

test('media sopra il range della mescola: mescola piu dura', () => {
  const res = diagnosi(base(tutte(ruota(100, 101, 99))));
  assert.match(trova(res, 'auto', 'mescola')[0].testo, /più dura/i);
});

test('asfalto freddo e gomma sotto range: avviso su pressioni di partenza', () => {
  const res = diagnosi(base(tutte(ruota(55, 56, 54)), { tempAsfalto: 8 }));
  assert.equal(trova(res, 'auto', 'mescola').some(x => /asfalto/i.test(x.titolo)), true);
});

test('su terra le soglie sono piu larghe', () => {
  const res = diagnosi(base(tutte(ruota(86, 84, 80)), { fondo: 'terra', mescola: 'ter-medium' }));
  assert.equal(trova(res, 'AS', 'camber').length, 0);
});

test('ruota incompleta: avviso e regole di assale saltate', () => {
  const ok = ruota(80, 82, 80);
  const res = diagnosi(base({ AS: ok, AD: { fine: { int: 80 } }, PS: ok, PD: ok }));
  assert.equal(res.avvisi.length, 1);
  assert.equal(trova(res, 'anteriore', 'bilanciamento').length, 0);
});
