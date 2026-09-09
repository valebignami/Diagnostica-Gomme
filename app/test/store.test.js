import { test } from 'node:test';
import assert from 'node:assert/strict';
import { creaStore, nuovaSessione, nuovoId, sessioneIntatta, CHIAVE } from '../js/store.js';
import { RUOTE, SOGLIE_DEFAULT, MESCOLE_DEFAULT } from '../js/config.js';
import { diagnosi } from '../js/rules.js';

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
  const s = nuovaSessione({ evento: 'X', tempAsfalto: 30, data: '2026-05-04' });
  s.ruote.AS.pressFredda = 1.8; s.ruote.AS.fine.int = 90; s.ruote.AS.degrado = 'graining';
  st.salvaSessione(s);
  const d = st.duplicaSessione(s.id);
  assert.notEqual(d.id, s.id);
  assert.equal(d.evento, 'X');
  // La data della prova originale non viene spostata a oggi.
  assert.equal(d.data, '2026-05-04');
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

// --- coerenza dello stato quando il salvataggio fallisce ---------------------

/** Storage in memoria che, dopo `rompi()`, fa fallire ogni scrittura. */
const memoriaFragile = () => {
  const m = new Map();
  let guasta = false;
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { if (guasta) throw new Error('QuotaExceededError'); m.set(k, v); },
    rompi: () => { guasta = true; },
  };
};

test('scrittura fallita: ogni mutatore lancia in italiano e lascia lo stato invariato', () => {
  const m = memoriaFragile();
  const st = creaStore(m);
  const s = st.salvaSessione(nuovaSessione({ evento: 'Preesistente' }));
  const elencoPrima = st.elencaSessioni();
  const soglePrima = st.getSoglie();
  const mescolePrima = st.getMescole();
  const jsonPrima = m.getItem(CHIAVE);

  m.rompi();

  const soglieModificate = st.getSoglie();
  soglieModificate.asfalto.camber.leggera = 99;

  assert.throws(() => st.salvaSessione(nuovaSessione({ evento: 'Nuova' })), /impossibile salvare/i);
  assert.throws(() => st.salvaSessione({ ...s, evento: 'Modificata' }), /impossibile salvare/i);
  assert.throws(() => st.eliminaSessione(s.id), /impossibile salvare/i);
  assert.throws(() => st.duplicaSessione(s.id), /impossibile salvare/i);
  assert.throws(() => st.setSoglie(soglieModificate), /impossibile salvare/i);
  assert.throws(() => st.setMescole([{ id: 'x', nome: 'X', fondo: 'terra', min: 1, max: 2 }]), /impossibile salvare/i);
  assert.throws(() => st.ripristinaDefault(), /impossibile salvare/i);

  assert.deepEqual(st.elencaSessioni(), elencoPrima);
  assert.deepEqual(st.getSessione(s.id), s);
  assert.deepEqual(st.getSoglie(), soglePrima);
  assert.deepEqual(st.getMescole(), mescolePrima);
  assert.equal(m.getItem(CHIAVE), jsonPrima);
});

test('importazione fallita in scrittura: lo store conserva i dati precedenti', () => {
  const backup = creaStore(memoria());
  backup.salvaSessione(nuovaSessione({ evento: 'Backup A' }));
  backup.salvaSessione(nuovaSessione({ evento: 'Backup B' }));
  const json = backup.esporta();

  const m = memoriaFragile();
  const st = creaStore(m);
  st.salvaSessione(nuovaSessione({ evento: 'Preesistente' }));
  const elencoPrima = st.elencaSessioni();
  const jsonPrima = m.getItem(CHIAVE);

  m.rompi();
  assert.throws(() => st.importa(json), /impossibile salvare/i);

  assert.equal(st.elencaSessioni().length, 1);
  assert.equal(st.elencaSessioni()[0].evento, 'Preesistente');
  assert.deepEqual(st.elencaSessioni(), elencoPrima);
  assert.equal(m.getItem(CHIAVE), jsonPrima);
});

// --- importazione di backup malfatti -----------------------------------------

test('importa completa una sessione senza ruote invece di lasciarla rotta', () => {
  const st = creaStore(memoria());
  const esito = st.importa(JSON.stringify({
    versione: 1,
    sessioni: [{ id: 'abc', evento: 'Senza ruote', tempAria: 'venti' }],
  }));
  assert.deepEqual(esito, { importate: 1, scartate: 0 });
  const s = st.getSessione('abc');
  assert.deepEqual(Object.keys(s.ruote), RUOTE);
  assert.deepEqual(s.ruote.AS, {
    pressFredda: null, pressCalda: null,
    inizio: { int: null, cen: null, est: null },
    fine: { int: null, cen: null, est: null },
    degrado: 'regolare',
  });
  assert.equal(s.tempAria, null);
  assert.equal(s.evento, 'Senza ruote');
});

test('importa scarta le voci che non sono sessioni e lo dice', () => {
  const st = creaStore(memoria());
  const esito = st.importa(JSON.stringify({
    versione: 1,
    sessioni: ['non un oggetto', null, { evento: 'senza id' }, { id: 'buona' }],
  }));
  assert.deepEqual(esito, { importate: 1, scartate: 3 });
  assert.equal(st.elencaSessioni().length, 1);
  assert.equal(st.elencaSessioni()[0].id, 'buona');
});

test('importa ricostruisce soglie monche invece di lasciare il motore senza numeri', () => {
  const st = creaStore(memoria());
  st.importa(JSON.stringify({
    versione: 1,
    sessioni: [],
    soglie: { asfalto: {}, terra: { camber: { media: 'venti', forte: 30 }, salita: null } },
  }));
  const s = st.getSoglie();
  // Fondo vuoto: tutto di fabbrica.
  assert.deepEqual(s.asfalto, SOGLIE_DEFAULT.asfalto);
  // Fondo parziale: si tiene solo ciò che è un numero, il resto è di fabbrica.
  assert.equal(s.terra.camber.forte, 30);
  assert.equal(s.terra.camber.media, SOGLIE_DEFAULT.terra.camber.media);
  assert.equal(s.terra.camber.leggera, SOGLIE_DEFAULT.terra.camber.leggera);
  assert.equal(s.terra.salita, SOGLIE_DEFAULT.terra.salita);
  assert.equal(s.terra.camberTarget, SOGLIE_DEFAULT.terra.camberTarget);
});

test('importa scarta le mescole inutilizzabili e raddrizza le finestre rovesciate', () => {
  const st = creaStore(memoria());
  st.importa(JSON.stringify({
    versione: 1,
    sessioni: [],
    mescole: [
      null,
      'non un oggetto',
      { nome: 'Senza id', fondo: 'asfalto', min: 60, max: 80 },
      { id: 'rovesciata', nome: 'Rovesciata', fondo: 'asfalto', min: 95, max: 70 },
      { id: 'monca', fondo: 'terra' },
    ],
  }));
  const m = st.getMescole();
  assert.equal(m.some((x) => x.nome === 'Senza id'), false);
  const r = m.find((x) => x.id === 'rovesciata');
  assert.deepEqual([r.min, r.max], [70, 95]);
  const monca = m.find((x) => x.id === 'monca');
  assert.equal(monca.nome, 'Mescola');
  assert.equal(monca.fondo, 'terra');
  assert.ok(monca.min < monca.max);
  // Ogni fondo ha almeno una mescola: senza finestra la diagnosi non saprebbe dire nulla.
  for (const fondo of ['asfalto', 'terra']) assert.ok(m.some((x) => x.fondo === fondo), fondo);
});

test('un backup con soglie e mescole malformate lascia l app usabile', () => {
  const st = creaStore(memoria());
  st.importa('{"versione":1,"sessioni":[],"soglie":{"asfalto":{}},"mescole":[null]}');
  const soglie = st.getSoglie();
  const mescole = st.getMescole();
  assert.deepEqual(soglie, SOGLIE_DEFAULT);
  assert.equal(mescole.length, MESCOLE_DEFAULT.length);
  // Il motore gira senza lanciare e le viste trovano la mescola di partenza.
  const s = nuovaSessione();
  s.ruote.AS.fine = { int: 90, cen: 88, est: 82 };
  const res = diagnosi(s, soglie, mescole);
  assert.ok(Array.isArray(res.suggerimenti));
  assert.ok(mescole.some((m) => m.id === s.mescola));
});

test('importa riporta un degrado sconosciuto a usura regolare', () => {
  const st = creaStore(memoria());
  st.importa(JSON.stringify({
    versione: 1,
    sessioni: [{ id: 'x', ruote: { AS: { degrado: 'inventato', fine: { int: '90' } } } }],
  }));
  assert.equal(st.getSessione('x').ruote.AS.degrado, 'regolare');
  assert.equal(st.getSessione('x').ruote.AS.fine.int, null);
});

// --- aiutanti ----------------------------------------------------------------

test('nuovoId produce identificatori diversi', () => {
  assert.notEqual(nuovoId(), nuovoId());
  assert.ok(String(nuovoId()).length >= 8);
});

test('sessioneIntatta distingue una sessione appena creata da una compilata', () => {
  assert.equal(sessioneIntatta(nuovaSessione()), true);
  assert.equal(sessioneIntatta(nuovaSessione({ evento: 'Ciocco' })), false);
  assert.equal(sessioneIntatta(nuovaSessione({ tempAsfalto: 20 })), false);
  const conCamber = nuovaSessione(); conCamber.camber.post = -2;
  assert.equal(sessioneIntatta(conCamber), false);
  const conRuota = nuovaSessione(); conRuota.ruote.PD.fine.cen = 80;
  assert.equal(sessioneIntatta(conRuota), false);
  const conDegrado = nuovaSessione(); conDegrado.ruote.AS.degrado = 'graining';
  assert.equal(sessioneIntatta(conDegrado), false);
  const conPressione = nuovaSessione(); conPressione.ruote.AD.pressFredda = 1.8;
  assert.equal(sessioneIntatta(conPressione), false);
  assert.equal(sessioneIntatta(null), false);
});
