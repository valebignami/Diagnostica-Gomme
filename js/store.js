import { RUOTE, MESCOLE_DEFAULT, SOGLIE_DEFAULT } from './config.js';

export const CHIAVE = 'diagnostica-gomme';
export const VERSIONE = 1;

/** Data odierna in formato ISO `YYYY-MM-DD`, con il fuso orario locale. */
export function oggi(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const ruotaVuota = () => ({
  pressFredda: null,
  pressCalda: null,
  inizio: { int: null, cen: null, est: null },
  fine: { int: null, cen: null, est: null },
  degrado: 'regolare',
});

export function nuovaSessione(campi = {}) {
  const ora = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    data: oggi(),
    evento: '',
    prova: '',
    fondo: 'asfalto',
    condizioni: 'asciutto',
    tempAria: null,
    tempAsfalto: null,
    mescola: 'asf-medium',
    camber: { ant: null, post: null },
    ruote: Object.fromEntries(RUOTE.map((c) => [c, ruotaVuota()])),
    note: '',
    creataIl: ora,
    modificataIl: ora,
    ...campi,
  };
}

const statoDefault = () => ({
  versione: VERSIONE,
  sessioni: [],
  soglie: structuredClone(SOGLIE_DEFAULT),
  mescole: structuredClone(MESCOLE_DEFAULT),
});

/** Ritorna uno stato valido a partire da dati grezzi, oppure `null` se incompatibili. */
function normalizza(dati) {
  if (!dati || typeof dati !== 'object') return null;
  if (dati.versione !== VERSIONE || !Array.isArray(dati.sessioni)) return null;
  return {
    versione: VERSIONE,
    sessioni: structuredClone(dati.sessioni),
    soglie: dati.soglie && typeof dati.soglie === 'object' ? structuredClone(dati.soglie) : structuredClone(SOGLIE_DEFAULT),
    mescole: Array.isArray(dati.mescole) ? structuredClone(dati.mescole) : structuredClone(MESCOLE_DEFAULT),
  };
}

const perData = (a, b) =>
  String(b.data ?? '').localeCompare(String(a.data ?? '')) ||
  String(b.creataIl ?? '').localeCompare(String(a.creataIl ?? ''));

/** Ripiego quando `localStorage` non esiste (test in Node): dati solo in memoria. */
const memoriaVolatile = () => {
  const m = new Map();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => { m.set(k, v); } };
};

export function creaStore(storage = globalThis.localStorage ?? memoriaVolatile()) {
  let stato = carica();

  function carica() {
    let grezzo = null;
    try {
      grezzo = storage.getItem(CHIAVE) ?? null;
    } catch {
      return statoDefault();
    }
    if (!grezzo) return statoDefault();
    let dati;
    try {
      dati = JSON.parse(grezzo);
    } catch {
      return statoDefault();
    }
    return normalizza(dati) ?? statoDefault();
  }

  function salva() {
    try {
      storage.setItem(CHIAVE, JSON.stringify(stato));
    } catch (errore) {
      throw new Error('Impossibile salvare i dati: memoria del browser piena o non disponibile.', { cause: errore });
    }
  }

  function trova(id) {
    return stato.sessioni.find((s) => s.id === id) ?? null;
  }

  function elencaSessioni() {
    return structuredClone(stato.sessioni).sort(perData);
  }

  function getSessione(id) {
    const s = trova(id);
    return s ? structuredClone(s) : null;
  }

  function salvaSessione(sessione) {
    const copia = structuredClone(sessione);
    const esistente = trova(copia.id);
    copia.creataIl = esistente?.creataIl ?? copia.creataIl ?? new Date().toISOString();
    copia.modificataIl = new Date().toISOString();
    const i = stato.sessioni.findIndex((s) => s.id === copia.id);
    if (i >= 0) stato.sessioni[i] = copia;
    else stato.sessioni.push(copia);
    salva();
    return structuredClone(copia);
  }

  function eliminaSessione(id) {
    const i = stato.sessioni.findIndex((s) => s.id === id);
    if (i < 0) return false;
    stato.sessioni.splice(i, 1);
    salva();
    return true;
  }

  function duplicaSessione(id) {
    const orig = trova(id);
    if (!orig) throw new Error('Sessione non trovata.');
    const nuova = nuovaSessione({
      evento: orig.evento,
      prova: orig.prova,
      fondo: orig.fondo,
      condizioni: orig.condizioni,
      tempAria: orig.tempAria,
      tempAsfalto: orig.tempAsfalto,
      mescola: orig.mescola,
      camber: structuredClone(orig.camber ?? { ant: null, post: null }),
    });
    for (const c of RUOTE) nuova.ruote[c].pressFredda = orig.ruote?.[c]?.pressFredda ?? null;
    return salvaSessione(nuova);
  }

  function getSoglie() {
    return structuredClone(stato.soglie);
  }

  function setSoglie(soglie) {
    stato.soglie = structuredClone(soglie);
    salva();
    return getSoglie();
  }

  function getMescole() {
    return structuredClone(stato.mescole);
  }

  function setMescole(mescole) {
    stato.mescole = structuredClone(mescole);
    salva();
    return getMescole();
  }

  /** Riporta soglie e mescole ai valori di fabbrica, senza toccare le sessioni. */
  function ripristinaDefault() {
    stato.soglie = structuredClone(SOGLIE_DEFAULT);
    stato.mescole = structuredClone(MESCOLE_DEFAULT);
    salva();
  }

  function esporta() {
    return JSON.stringify(stato, null, 2);
  }

  /** Sostituisce tutto lo stato con il backup indicato; ritorna il numero di sessioni importate. */
  function importa(json) {
    let dati;
    try {
      dati = JSON.parse(json);
    } catch {
      throw new Error('File non valido: non è un JSON leggibile.');
    }
    const nuovo = normalizza(dati);
    if (!nuovo) throw new Error(`File non compatibile: serve un backup con versione ${VERSIONE} e l'elenco delle sessioni.`);
    stato = nuovo;
    salva();
    return stato.sessioni.length;
  }

  return {
    elencaSessioni, getSessione, salvaSessione, eliminaSessione, duplicaSessione,
    getSoglie, setSoglie, getMescole, setMescole,
    ripristinaDefault, esporta, importa,
  };
}
