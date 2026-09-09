import { test } from 'node:test';
import assert from 'node:assert/strict';
import { creaStore, nuovaSessione, CHIAVE } from '../js/store.js';
import { RUOTE } from '../js/config.js';

const memoria = () => { const m = new Map(); return { getItem: k => m.has(k) ? m.get(k) : null, setItem: (k, v) => m.set(k, v) }; };

test('salva e rilegge una sessione', () => {
  const st = creaStore(memoria());
  const s = nuovaSessione({ evento: 'Rally Test' });
  st.salvaSessione(s);
  assert.equal(st.getSessione(s.id).evento, 'Rally Test');
  assert.equal(st.elencaSessioni().length, 1);
});

test('elenco ordinato per data decrescente', () => {
  const st = creaStore(memoria());
  st.salvaSessione(nuovaSessione({ data: '2026-01-01' }));
  st.salvaSessione(nuovaSessione({ data: '2026-03-01' }));
  assert.equal(st.elencaSessioni()[0].data, '2026-03-01');
});

test('duplica mantiene intestazione e pressioni a freddo, azzera temperature', () => {
  const st = creaStore(memoria());
  const s = nuovaSessione({ evento: 'X', tempAsfalto: 30 });
  s.ruote.AS.pressFredda = 1.8; s.ruote.AS.fine.int = 90; s.ruote.AS.degrado = 'graining';
  st.salvaSessione(s);
  const d = st.duplicaSessione(s.id);
  assert.notEqual(d.id, s.id);
  assert.equal(d.evento, 'X');
  assert.equal(d.ruote.AS.pressFredda, 1.8);
  assert.equal(d.ruote.AS.fine.int, null);
  assert.equal(d.ruote.AS.degrado, 'regolare');
});

test('elimina, esporta e importa', () => {
  const a = creaStore(memoria());
  const s = nuovaSessione(); a.salvaSessione(s);
  const json = a.esporta();
  a.eliminaSessione(s.id);
  assert.equal(a.elencaSessioni().length, 0);
  const b = creaStore(memoria()); b.importa(json);
  assert.equal(b.elencaSessioni().length, 1);
  assert.throws(() => b.importa('{"versione": 99}'));
});

test('soglie modificabili e ripristinabili', () => {
  const st = creaStore(memoria());
  const s = st.getSoglie(); s.asfalto.camber.leggera = 99; st.setSoglie(s);
  assert.equal(st.getSoglie().asfalto.camber.leggera, 99);
  st.ripristinaDefault();
  assert.equal(st.getSoglie().asfalto.camber.leggera, 5);
});

test('storage vuoto o corrotto parte dai default', () => {
  const st = creaStore({ getItem: () => 'non json', setItem: () => {} });
  assert.equal(st.elencaSessioni().length, 0);
});

// --- casi limite -------------------------------------------------------------

test('nuovaSessione ha la forma prevista dalla specifica', () => {
  const s = nuovaSessione();
  assert.match(s.id, /[0-9a-f-]{36}/);
  assert.match(s.data, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(s.fondo, 'asfalto');
  assert.equal(s.condizioni, 'asciutto');
  assert.equal(s.mescola, 'asf-medium');
  assert.deepEqual(Object.keys(s.ruote), RUOTE);
  assert.deepEqual(s.camber, { ant: null, post: null });
  assert.deepEqual(s.ruote.PD, {
    pressFredda: null, pressCalda: null,
    inizio: { int: null, cen: null, est: null },
    fine: { int: null, cen: null, est: null },
    degrado: 'regolare',
  });
  assert.equal(s.creataIl, s.modificataIl);
  assert.notEqual(nuovaSessione().id, s.id);
});

test('salvaSessione sostituisce per id e aggiorna modificataIl', () => {
  const st = creaStore(memoria());
  const s = nuovaSessione({ evento: 'Primo', creataIl: '2020-01-01T00:00:00.000Z', modificataIl: '2020-01-01T00:00:00.000Z' });
  st.salvaSessione(s);
  const salvata = st.salvaSessione({ ...s, evento: 'Secondo' });
  assert.equal(st.elencaSessioni().length, 1);
  assert.equal(st.getSessione(s.id).evento, 'Secondo');
  assert.equal(salvata.creataIl, '2020-01-01T00:00:00.000Z');
  assert.notEqual(salvata.modificataIl, '2020-01-01T00:00:00.000Z');
});

test('lo stato persiste nello storage e viene riletto da un altro store', () => {
  const m = memoria();
  const a = creaStore(m);
  a.salvaSessione(nuovaSessione({ evento: 'Persistente' }));
  assert.ok(m.getItem(CHIAVE));
  assert.equal(creaStore(m).elencaSessioni()[0].evento, 'Persistente');
});

test('le copie restituite non modificano lo store', () => {
  const st = creaStore(memoria());
  const s = nuovaSessione({ evento: 'Originale' });
  st.salvaSessione(s);
  st.getSessione(s.id).evento = 'Manomessa';
  st.elencaSessioni()[0].evento = 'Manomessa';
  assert.equal(st.getSessione(s.id).evento, 'Originale');
  const mescole = st.getMescole(); mescole.pop();
  assert.equal(st.getMescole().length, 6);
});

test('id sconosciuto: get null, elimina false, duplica lancia errore in italiano', () => {
  const st = creaStore(memoria());
  assert.equal(st.getSessione('inesistente'), null);
  assert.equal(st.eliminaSessione('inesistente'), false);
  assert.throws(() => st.duplicaSessione('inesistente'), /sessione non trovata/i);
});

test('importa senza soglie e mescole ricade sui default', () => {
  const st = creaStore(memoria());
  st.importa('{"versione": 1, "sessioni": []}');
  assert.equal(st.getSoglie().asfalto.camber.leggera, 5);
  assert.equal(st.getMescole().length, 6);
});

test('importa rifiuta json illeggibile e sessioni non array', () => {
  const st = creaStore(memoria());
  assert.throws(() => st.importa('non json'), /json/i);
  assert.throws(() => st.importa('{"versione": 1}'), /versione|sessioni/i);
});

test('ripristinaDefault ripristina le mescole e conserva le sessioni', () => {
  const st = creaStore(memoria());
  st.salvaSessione(nuovaSessione());
  st.setMescole([{ id: 'x', nome: 'X', fondo: 'terra', min: 1, max: 2 }]);
  assert.equal(st.getMescole().length, 1);
  st.ripristinaDefault();
  assert.equal(st.getMescole().length, 6);
  assert.equal(st.elencaSessioni().length, 1);
});

test('storage che lancia in scrittura produce un errore in italiano', () => {
  const st = creaStore({ getItem: () => null, setItem: () => { throw new Error('QuotaExceededError'); } });
  assert.throws(() => st.salvaSessione(nuovaSessione()), /impossibile salvare/i);
});

test('storage che lancia in lettura parte dai default', () => {
  const st = creaStore({ getItem: () => { throw new Error('SecurityError'); }, setItem: () => {} });
  assert.equal(st.elencaSessioni().length, 0);
  assert.equal(st.getSoglie().terra.camber.leggera, 8);
});

test('esporta produce un json rileggibile con versione 1', () => {
  const st = creaStore(memoria());
  st.salvaSessione(nuovaSessione({ evento: 'Backup' }));
  const dati = JSON.parse(st.esporta());
  assert.equal(dati.versione, 1);
  assert.equal(dati.sessioni.length, 1);
  assert.ok(dati.soglie && dati.mescole);
});
