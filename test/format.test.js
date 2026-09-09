import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fmtNum, fmtData, diagnosiInTesto } from '../js/format.js';

test('fmtNum usa la virgola e il trattino per null', () => {
  assert.equal(fmtNum(1.85, 2), '1,85');
  assert.equal(fmtNum(null), '–');
});
test('fmtData in formato italiano', () => { assert.equal(fmtData('2026-09-09'), '09/09/2026'); });
test('diagnosiInTesto contiene intestazione e suggerimenti', () => {
  const txt = diagnosiInTesto({ data: '2026-09-09', evento: 'Rally', fondo: 'asfalto', condizioni: 'asciutto', tempAsfalto: 25, mescola: 'asf-medium', ruote: {} },
    { suggerimenti: [{ ambito: 'AS', area: 'camber', intensita: 'forte', titolo: 'Troppo camber', testo: 'Ridurre.' }], avvisi: ['manca AD'] });
  assert.match(txt, /Rally/); assert.match(txt, /\[FORTE\]/); assert.match(txt, /manca AD/);
});

// --- casi limite -------------------------------------------------------------

test('fmtNum arrotonda, gestisce zero decimali e valori non numerici', () => {
  assert.equal(fmtNum(25), '25');
  assert.equal(fmtNum(24.6), '25');
  assert.equal(fmtNum(-1.25, 1), '-1,3');
  assert.equal(fmtNum(0, 2), '0,00');
  assert.equal(fmtNum(undefined), '–');
  assert.equal(fmtNum(NaN, 2), '–');
  assert.equal(fmtNum('1.85', 2), '–');
});

test('fmtData accetta un istante ISO e rifiuta il resto', () => {
  assert.equal(fmtData('2026-01-31T10:20:30.000Z'), '31/01/2026');
  assert.equal(fmtData(''), '–');
  assert.equal(fmtData(null), '–');
  assert.equal(fmtData('non una data'), '–');
});

test('diagnosiInTesto stampa il trattino per ruote assenti o incomplete', () => {
  const txt = diagnosiInTesto({ data: '2026-09-09', ruote: { AS: { pressFredda: 1.8, fine: { int: 90 } } } }, { suggerimenti: [], avvisi: [] });
  assert.match(txt, /Anteriore sinistra/);
  assert.match(txt, /Posteriore destra/);
  assert.match(txt, /1,80/);
  assert.match(txt, /–/);
  assert.doesNotMatch(txt, /undefined|NaN|\[object/);
});

test('diagnosiInTesto risolve il nome della mescola e ricade sull id sconosciuto', () => {
  const vuoto = { suggerimenti: [], avvisi: [] };
  assert.match(diagnosiInTesto({ mescola: 'ter-soft', ruote: {} }, vuoto), /Terra Soft/);
  assert.match(diagnosiInTesto({ mescola: 'mia-mescola', ruote: {} }, vuoto), /mia-mescola/);
  assert.match(diagnosiInTesto({ mescola: 'x1', ruote: {} }, vuoto, [{ id: 'x1', nome: 'Sperimentale' }]), /Sperimentale/);
});

test('diagnosiInTesto raggruppa i suggerimenti in ordine: auto, assali, lati, ruote', () => {
  const txt = diagnosiInTesto({ ruote: {} }, {
    suggerimenti: [
      { ambito: 'PD', area: 'camber', intensita: 'leggera', titolo: 'T-PD', testo: '.' },
      { ambito: 'destra', area: 'asimmetria', intensita: 'media', titolo: 'T-destra', testo: '.' },
      { ambito: 'anteriore', area: 'bilanciamento', intensita: 'media', titolo: 'T-ant', testo: '.' },
      { ambito: 'auto', area: 'mescola', intensita: 'forte', titolo: 'T-auto', testo: '.' },
      { ambito: 'AS', area: 'camber', intensita: 'leggera', titolo: 'T-AS', testo: '.' },
    ],
    avvisi: [],
  });
  const pos = (t) => txt.indexOf(t);
  assert.ok(pos('T-auto') > -1);
  assert.ok(pos('T-auto') < pos('T-ant'));
  assert.ok(pos('T-ant') < pos('T-destra'));
  assert.ok(pos('T-destra') < pos('T-AS'));
  assert.ok(pos('T-AS') < pos('T-PD'));
  assert.match(txt, /\[LEGGERA\]/);
  assert.match(txt, /\[MEDIA\]/);
});

test('diagnosiInTesto senza suggerimenti e senza avvisi resta leggibile', () => {
  const txt = diagnosiInTesto({ ruote: {} }, { suggerimenti: [], avvisi: [] });
  assert.match(txt, /Nessun suggerimento/i);
  assert.doesNotMatch(txt, /AVVISI/);
});
