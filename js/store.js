import { RUOTE, DEGRADO, MESCOLE_DEFAULT, SOGLIE_DEFAULT } from './config.js';

export const CHIAVE = 'diagnostica-gomme';
export const VERSIONE = 1;

/** Data odierna in formato ISO `YYYY-MM-DD`, con il fuso orario locale. */
export function oggi(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/**
 * Identificatore unico. `crypto.randomUUID` esiste solo negli origin sicuri
 * (https o localhost): aperta da un indirizzo di rete locale in http l'app
 * deve funzionare lo stesso, quindi c'è un ripiego buono a sufficienza.
 */
export function nuovoId() {
  if (typeof crypto === 'object' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {
      /* ripiego qui sotto */
    }
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
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
    id: nuovoId(),
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

/* --- Normalizzazione di una sessione ------------------------------------- */

const CODICI_DEGRADO = new Set(DEGRADO.map((d) => d.codice));
const FONDI_VALIDI = new Set(['asfalto', 'terra']);
const CONDIZIONI_VALIDE = new Set(['asciutto', 'umido', 'bagnato']);

const numeroO = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const testoO = (v, ripiego) => (typeof v === 'string' ? v : ripiego);
const ternaO = (t) => {
  const o = t && typeof t === 'object' ? t : {};
  return { int: numeroO(o.int), cen: numeroO(o.cen), est: numeroO(o.est) };
};
const ruotaO = (r) => {
  const o = r && typeof r === 'object' ? r : {};
  return {
    pressFredda: numeroO(o.pressFredda),
    pressCalda: numeroO(o.pressCalda),
    inizio: ternaO(o.inizio),
    fine: ternaO(o.fine),
    degrado: CODICI_DEGRADO.has(o.degrado) ? o.degrado : 'regolare',
  };
};

/**
 * Riporta una sessione qualsiasi alla forma attesa dal resto dell'app, oppure
 * `null` se non è nemmeno una sessione (niente oggetto, niente id). Un backup
 * scritto a mano o troncato non deve mandare in errore la schermata.
 */
export function normalizzaSessione(grezza) {
  if (!grezza || typeof grezza !== 'object' || Array.isArray(grezza)) return null;
  if (typeof grezza.id !== 'string' || grezza.id === '') return null;
  const base = nuovaSessione();
  return {
    id: grezza.id,
    data: testoO(grezza.data, base.data),
    evento: testoO(grezza.evento, base.evento),
    prova: testoO(grezza.prova, base.prova),
    fondo: FONDI_VALIDI.has(grezza.fondo) ? grezza.fondo : base.fondo,
    condizioni: CONDIZIONI_VALIDE.has(grezza.condizioni) ? grezza.condizioni : base.condizioni,
    tempAria: numeroO(grezza.tempAria),
    tempAsfalto: numeroO(grezza.tempAsfalto),
    mescola: testoO(grezza.mescola, base.mescola),
    camber: { ant: numeroO(grezza.camber?.ant), post: numeroO(grezza.camber?.post) },
    ruote: Object.fromEntries(RUOTE.map((c) => [c, ruotaO(grezza.ruote?.[c])])),
    note: testoO(grezza.note, base.note),
    creataIl: testoO(grezza.creataIl, base.creataIl),
    modificataIl: testoO(grezza.modificataIl, base.modificataIl),
  };
}

/**
 * Vera se nella sessione non è stato scritto niente: serve a non lasciare in
 * elenco le sessioni aperte per sbaglio con il tasto "Nuova".
 */
export function sessioneIntatta(sessione) {
  if (!sessione || typeof sessione !== 'object') return false;
  if ((sessione.evento ?? '') !== '' || (sessione.prova ?? '') !== '' || (sessione.note ?? '') !== '') return false;
  if (sessione.tempAria != null || sessione.tempAsfalto != null) return false;
  if (sessione.camber?.ant != null || sessione.camber?.post != null) return false;
  for (const c of RUOTE) {
    const r = sessione.ruote?.[c];
    if (!r) continue;
    if (r.pressFredda != null || r.pressCalda != null) return false;
    for (const fase of ['inizio', 'fine']) {
      for (const punto of ['int', 'cen', 'est']) {
        if (r[fase]?.[punto] != null) return false;
      }
    }
    if ((r.degrado ?? 'regolare') !== 'regolare') return false;
  }
  return true;
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
  const sessioni = [];
  for (const grezza of dati.sessioni) {
    const s = normalizzaSessione(grezza);
    if (s) sessioni.push(s);
  }
  return {
    versione: VERSIONE,
    sessioni,
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

  /**
   * Persiste `prossimo` e lo adotta come stato corrente solo se la scrittura riesce:
   * se `setItem` lancia, lo stato in memoria resta quello dell'ultimo salvataggio valido.
   */
  function commit(prossimo) {
    try {
      storage.setItem(CHIAVE, JSON.stringify(prossimo));
    } catch (errore) {
      throw new Error('Impossibile salvare i dati: memoria del browser piena o non disponibile.', { cause: errore });
    }
    stato = prossimo;
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
    const sessioni = stato.sessioni.slice();
    const i = sessioni.findIndex((s) => s.id === copia.id);
    if (i >= 0) sessioni[i] = copia;
    else sessioni.push(copia);
    commit({ ...stato, sessioni });
    return structuredClone(copia);
  }

  function eliminaSessione(id) {
    const i = stato.sessioni.findIndex((s) => s.id === id);
    if (i < 0) return false;
    const sessioni = stato.sessioni.filter((_, k) => k !== i);
    commit({ ...stato, sessioni });
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
    commit({ ...stato, soglie: structuredClone(soglie) });
    return getSoglie();
  }

  function getMescole() {
    return structuredClone(stato.mescole);
  }

  function setMescole(mescole) {
    commit({ ...stato, mescole: structuredClone(mescole) });
    return getMescole();
  }

  /** Riporta soglie e mescole ai valori di fabbrica, senza toccare le sessioni. */
  function ripristinaDefault() {
    commit({
      ...stato,
      soglie: structuredClone(SOGLIE_DEFAULT),
      mescole: structuredClone(MESCOLE_DEFAULT),
    });
  }

  function esporta() {
    return JSON.stringify(stato, null, 2);
  }

  /**
   * Sostituisce tutto lo stato con il backup indicato. Le sessioni illeggibili
   * vengono scartate invece di far fallire tutta l'importazione: ritorna
   * `{ importate, scartate }` così la schermata può dirlo.
   */
  function importa(json) {
    let dati;
    try {
      dati = JSON.parse(json);
    } catch {
      throw new Error('File non valido: non è un JSON leggibile.');
    }
    const nuovo = normalizza(dati);
    if (!nuovo) throw new Error(`File non compatibile: serve un backup con versione ${VERSIONE} e l'elenco delle sessioni.`);
    const totale = dati.sessioni.length;
    commit(nuovo);
    return { importate: stato.sessioni.length, scartate: totale - stato.sessioni.length };
  }

  return {
    elencaSessioni, getSessione, salvaSessione, eliminaSessione, duplicaSessione,
    getSoglie, setSoglie, getMescole, setMescole,
    ripristinaDefault, esporta, importa,
  };
}
