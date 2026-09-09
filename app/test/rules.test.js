import { test } from 'node:test';
import assert from 'node:assert/strict';
import { diagnosi, livello } from '../js/rules.js';
import { SOGLIE_DEFAULT, MESCOLE_DEFAULT } from '../js/config.js';

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

// --- camber: il riferimento e la differenza attesa, non lo zero ---------------

test('interno molto piu caldo dell atteso: ridurre camber, intensita forte', () => {
  const res = diagnosi(base(tutte(ruota(105, 90, 80))));
  const c = trova(res, 'AS', 'camber');
  assert.equal(c.length, 1);
  assert.equal(c[0].intensita, 'forte');
  assert.match(c[0].testo, /ridurre/i);
  // Il testo dice sia lo scarto misurato sia quello atteso.
  assert.match(c[0].testo, /25 °C/);
  assert.match(c[0].testo, /contro gli 8 °C attesi/);
});

test('esterno piu caldo dell interno: aumentare camber', () => {
  const res = diagnosi(base(tutte(ruota(80, 86, 88))));
  const c = trova(res, 'AS', 'camber')[0];
  assert.match(c.titolo, /insufficiente/i);
  assert.match(c.testo, /aumentare/i);
  assert.equal(c.intensita, 'forte');
});

test('spalla interna piu calda esattamente quanto atteso: nessun suggerimento camber', () => {
  const res = diagnosi(base(tutte(ruota(84, 82, 76))));
  assert.equal(trova(res, 'AS', 'camber').length, 0);
});

test('scarto interno-esterno appena sotto l atteso: nessun suggerimento camber', () => {
  // 5 gradi contro gli 8 attesi: scarto 3, sotto la soglia leggera.
  const res = diagnosi(base(tutte(ruota(83, 81, 78))));
  assert.equal(trova(res, 'AS', 'camber').length, 0);
});

test('camberTarget personalizzato ribalta il verdetto', () => {
  const ruote = tutte(ruota(100, 88, 80)); // interna piu calda di 20 gradi
  assert.match(trova(diagnosi(base(ruote)), 'AS', 'camber')[0].testo, /ridurre/i);

  const soglie = structuredClone(SOGLIE_DEFAULT);
  soglie.asfalto.camberTarget = 20;
  assert.equal(trova(diagnosi(base(ruote), soglie), 'AS', 'camber').length, 0);

  soglie.asfalto.camberTarget = 40;
  const c = trova(diagnosi(base(ruote), soglie), 'AS', 'camber')[0];
  assert.match(c.titolo, /insufficiente/i);
  assert.match(c.testo, /aumentare/i);
});

// --- pressione, salita, degrado ----------------------------------------------

test('centro piu caldo delle spalle: pressione alta, abbassare di 0,2 bar', () => {
  const res = diagnosi(base(tutte(ruota(80, 89, 80))));
  const p = trova(res, 'AD', 'pressione')[0];
  assert.equal(p.intensita, 'media');
  assert.match(p.testo, /abbassare/i);
  assert.match(p.testo, /di circa 0,2 bar/);
});

test('su terra il passo medio di pressione e 0,15 bar, non arrotondato a 0,1', () => {
  const res = diagnosi(base(tutte(ruota(80, 91, 80)), { fondo: 'terra', mescola: 'ter-medium' }));
  const p = trova(res, 'AS', 'pressione')[0];
  assert.equal(p.intensita, 'media');
  assert.match(p.testo, /di circa 0,15 bar/);
});

test('spalle piu calde del centro: pressione bassa, alzare', () => {
  const res = diagnosi(base(tutte(ruota(90, 85, 90))));
  assert.match(trova(res, 'PS', 'pressione')[0].testo, /alzare/i);
});

test('ruota equilibrata: nessun suggerimento camber o pressione', () => {
  const res = diagnosi(base(tutte(ruota(84, 82, 76))));
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
  const r = ruota(93, 84, 80, { degrado: 'spallaInt' });
  const res = diagnosi(base(tutte(r)));
  assert.equal(trova(res, 'AS', 'camber')[0].intensita, 'media');
  assert.equal(trova(res, 'AS', 'degrado').length, 1);
});

test('graining: mescola piu morbida oppure pressioni di partenza piu basse', () => {
  const r = ruota(70, 70, 70, { degrado: 'graining' });
  const res = diagnosi(base(tutte(r)));
  const d = trova(res, 'AD', 'degrado')[0];
  assert.match(d.testo, /morbida/i);
  // Convenzione: pressione di partenza piu bassa = la gomma scalda di piu.
  assert.match(d.testo, /abbassare le pressioni di partenza/i);
  assert.doesNotMatch(d.testo, /pressioni di partenza[^.]*più alte/i);
});

// --- assale e lato -----------------------------------------------------------

test('anteriore piu caldo del posteriore: sottosterzo', () => {
  const ant = ruota(95, 96, 94), post = ruota(78, 79, 77);
  const res = diagnosi(base({ AS: ant, AD: ant, PS: post, PD: post }));
  const b = trova(res, 'anteriore', 'bilanciamento');
  assert.equal(b.length, 1);
  assert.equal(b[0].intensita, 'media');
  assert.match(b[0].testo, /sottosterzo/i);
  // Alzare le pressioni anteriori aumenterebbe il sottosterzo: non si consiglia.
  assert.doesNotMatch(b[0].testo, /pressioni anteriori/i);
});

test('lato sinistro piu caldo: asimmetria, con la spiegazione benigna per prima', () => {
  const sx = ruota(95, 96, 94), dx = ruota(64, 65, 63);
  const res = diagnosi(base({ AS: sx, AD: dx, PS: sx, PD: dx }));
  const a = trova(res, 'sinistra', 'asimmetria')[0];
  assert.equal(a.intensita, 'forte');
  assert.match(a.testo, /curve prevalenti in un verso/i);
  assert.ok(a.testo.indexOf('curve prevalenti') < a.testo.indexOf('simmetria'));
});

test('asimmetria sotto la soglia rialzata: nessun suggerimento', () => {
  const sx = ruota(88, 89, 87), dx = ruota(80, 81, 79); // 8 gradi di scarto
  const res = diagnosi(base({ AS: sx, AD: dx, PS: sx, PD: dx }));
  assert.equal(trova(res, 'sinistra', 'asimmetria').length, 0);
});

// --- mescola e asfalto -------------------------------------------------------

test('media sotto il range della mescola: mescola piu morbida', () => {
  const res = diagnosi(base(tutte(ruota(55, 56, 54))));
  const m = trova(res, 'auto', 'mescola')[0];
  assert.match(m.titolo, /troppo dura/i);
  // Nessuna mescola da asfalto arriva a 55 gradi: resta la frase generica.
  assert.match(m.testo, /più morbida/i);
});

test('media sotto il range: nomina la mescola la cui finestra contiene la media', () => {
  const res = diagnosi(base(tutte(ruota(64, 65, 63))));
  const m = trova(res, 'auto', 'mescola')[0];
  assert.match(m.titolo, /troppo dura/i);
  assert.match(m.testo, /Asfalto Soft/);
});

test('media sopra il range della mescola: mescola piu dura, con il nome di quella giusta', () => {
  const res = diagnosi(base(tutte(ruota(100, 101, 99))));
  const m = trova(res, 'auto', 'mescola')[0];
  assert.match(m.titolo, /troppo morbida/i);
  // 100 gradi stanno dentro la finestra di Asfalto Hard: il motore la nomina.
  assert.match(m.testo, /Asfalto Hard/);
});

test('asfalto freddo e gomma sotto range: avviso su pressioni di partenza', () => {
  const res = diagnosi(base(tutte(ruota(55, 56, 54)), { tempAsfalto: 8 }));
  assert.equal(trova(res, 'auto', 'mescola').some(x => /asfalto/i.test(x.titolo)), true);
});

test('su terra le soglie sono piu larghe', () => {
  const res = diagnosi(base(tutte(ruota(86, 84, 80)), { fondo: 'terra', mescola: 'ter-medium' }));
  assert.equal(trova(res, 'AS', 'camber').length, 0);
});

// --- taratura: soglie e mescole passate dall'esterno -------------------------

test('soglie personalizzate zittiscono un suggerimento che i default alzano', () => {
  const ruote = tutte(ruota(80, 89, 80));
  assert.equal(trova(diagnosi(base(ruote)), 'AS', 'pressione').length, 1);

  const soglie = structuredClone(SOGLIE_DEFAULT);
  soglie.asfalto.pressione = { leggera: 20, media: 30, forte: 40 };
  assert.equal(trova(diagnosi(base(ruote), soglie), 'AS', 'pressione').length, 0);
});

test('finestra di mescola personalizzata porta la gomma sotto range', () => {
  const ruote = tutte(ruota(80, 82, 80)); // media 80,67: dentro 70-95
  assert.equal(trova(diagnosi(base(ruote)), 'auto', 'mescola').length, 0);

  const mescole = structuredClone(MESCOLE_DEFAULT);
  mescole.find((m) => m.id === 'asf-medium').min = 90;
  const m = trova(diagnosi(base(ruote), SOGLIE_DEFAULT, mescole), 'auto', 'mescola')[0];
  assert.match(m.titolo, /troppo dura/i);
});

test('fondo sconosciuto o mancante: si usano le soglie dell asfalto', () => {
  const ruote = tutte(ruota(80, 84, 80)); // scarto centro-spalle 4: soglia asfalto, non terra
  assert.equal(trova(diagnosi(base(ruote)), 'AS', 'pressione').length, 1);
  assert.equal(trova(diagnosi(base(ruote, { fondo: 'terra', mescola: 'ter-hard' })), 'AS', 'pressione').length, 0);

  for (const fondo of ['ghiaccio', undefined]) {
    const res = diagnosi(base(ruote, { fondo }));
    assert.equal(trova(res, 'AS', 'pressione').length, 1, `fondo ${fondo}`);
  }
});

// --- dati mancanti e degradi -------------------------------------------------

test('ruota incompleta: avviso e regole di assale saltate', () => {
  const ok = ruota(80, 82, 80);
  const res = diagnosi(base({ AS: ok, AD: { fine: { int: 80 } }, PS: ok, PD: ok }));
  assert.equal(res.avvisi.length, 1);
  assert.equal(trova(res, 'anteriore', 'bilanciamento').length, 0);
});

test('spalla esterna consumata rafforza sia il camber sia la pressione', () => {
  const r = ruota(88, 82, 86, { degrado: 'spallaEst' });
  const res = diagnosi(base(tutte(r)));
  const c = trova(res, 'AS', 'camber')[0];
  assert.match(c.titolo, /insufficiente/i);
  assert.equal(c.intensita, 'media');
  const p = trova(res, 'AS', 'pressione')[0];
  assert.match(p.titolo, /bassa/i);
  assert.equal(p.intensita, 'media');
});

test('blistering rafforza la pressione alta della ruota e la mescola troppo morbida', () => {
  const r = ruota(100, 110, 100, { degrado: 'blistering' });
  const res = diagnosi(base(tutte(r)));
  const d = trova(res, 'AD', 'degrado')[0];
  assert.match(d.testo, /più dura/i);
  assert.match(d.testo, /centro del battistrada/i);
  const p = trova(res, 'AD', 'pressione')[0];
  assert.match(p.titolo, /alta/i);
  assert.equal(p.intensita, 'forte');
  const m = trova(res, 'auto', 'mescola').filter((x) => /morbida/i.test(x.titolo))[0];
  assert.equal(m.intensita, 'forte');
});

test('gomma vetrificata: abbassare le pressioni di partenza', () => {
  const r = ruota(60, 61, 59, { degrado: 'vetrificata' });
  const res = diagnosi(base(tutte(r)));
  const d = trova(res, 'PD', 'degrado')[0];
  assert.match(d.titolo, /vetrificata/i);
  assert.match(d.testo, /abbassare le pressioni di partenza/i);
});

test('asfalto caldo e gomma sopra range: avviso su pressioni piu alte', () => {
  const res = diagnosi(base(tutte(ruota(100, 101, 99)), { tempAsfalto: 45 }));
  const a = trova(res, 'auto', 'mescola').filter((x) => /asfalto caldo/i.test(x.titolo));
  assert.equal(a.length, 1);
  assert.match(a[0].testo, /pressioni più alte/i);
});

test('chunking pesa di piu su terra: forte invece di media', () => {
  const r = ruota(70, 71, 69, { degrado: 'chunking' });
  const terra = diagnosi(base(tutte(r), { fondo: 'terra', mescola: 'ter-medium' }));
  assert.equal(trova(terra, 'AS', 'degrado')[0].intensita, 'forte');
  const asfalto = diagnosi(base(tutte(r)));
  assert.equal(trova(asfalto, 'AS', 'degrado')[0].intensita, 'media');
});

test('mescola sconosciuta: avviso e nessuna regola su mescola o asfalto', () => {
  const res = diagnosi(base(tutte(ruota(100, 101, 99)), { mescola: 'non-esiste', tempAsfalto: 45 }));
  assert.equal(res.avvisi.some((a) => /Mescola non trovata/i.test(a)), true);
  assert.equal(trova(res, 'auto', 'mescola').length, 0);
});

test('temperatura asfalto mancante: avviso dedicato', () => {
  const res = diagnosi(base(tutte(ruota(80, 82, 80)), { tempAsfalto: null }));
  assert.equal(res.avvisi.some((a) => /Temperatura asfalto mancante/i.test(a)), true);
});
