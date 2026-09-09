import { RUOTE, ETICHETTE_RUOTE, DEGRADO, MESCOLE_DEFAULT } from './config.js';

/** Segnaposto per i valori mancanti. */
export const TRATTINO = '–';

/** Numero con la virgola come separatore decimale, o `–` se il valore manca. */
export function fmtNum(v, dec = 0) {
  if (typeof v !== 'number' || !Number.isFinite(v)) return TRATTINO;
  return v.toFixed(dec).replace('.', ',');
}

/** Data ISO `YYYY-MM-DD` (o istante ISO) in formato `gg/mm/aaaa`. */
export function fmtData(iso) {
  if (typeof iso !== 'string') return TRATTINO;
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : TRATTINO;
}

const testo = (v) => (typeof v === 'string' && v.trim() !== '' ? v.trim() : TRATTINO);

const nomeMescola = (id, mescole) => mescole.find((m) => m.id === id)?.nome ?? testo(id);

const etichettaDegrado = (codice) => DEGRADO.find((d) => d.codice === codice)?.etichetta ?? testo(codice);

const GRUPPI = [
  ['auto', 'Auto'],
  ['anteriore', 'Assale anteriore'],
  ['posteriore', 'Assale posteriore'],
  ['sinistra', 'Lato sinistro'],
  ['destra', 'Lato destro'],
  ...RUOTE.map((c) => [c, ETICHETTE_RUOTE[c]]),
];

const terna = (t) => `int ${fmtNum(t?.int)} · cen ${fmtNum(t?.cen)} · est ${fmtNum(t?.est)}`;

/** Diagnosi in testo piano multilinea, pronta da copiare o condividere. */
export function diagnosiInTesto(sessione = {}, risultato = {}, mescole = MESCOLE_DEFAULT) {
  const suggerimenti = risultato.suggerimenti ?? [];
  const avvisi = risultato.avvisi ?? [];
  const r = ['DIAGNOSTICA GOMME', ''];

  r.push(`Data: ${fmtData(sessione.data)}`);
  r.push(`Evento: ${testo(sessione.evento)}`);
  r.push(`Prova: ${testo(sessione.prova)}`);
  r.push(`Fondo: ${testo(sessione.fondo)} · ${testo(sessione.condizioni)}`);
  r.push(`Temperatura aria: ${fmtNum(sessione.tempAria)} °C · asfalto: ${fmtNum(sessione.tempAsfalto)} °C`);
  r.push(`Mescola: ${nomeMescola(sessione.mescola, mescole)}`);
  r.push(`Camber: ant ${fmtNum(sessione.camber?.ant, 1)}° · post ${fmtNum(sessione.camber?.post, 1)}°`);

  r.push('', 'TEMPERATURE');
  for (const c of RUOTE) {
    const w = sessione.ruote?.[c] ?? {};
    r.push(`${ETICHETTE_RUOTE[c]} · pressione ${fmtNum(w.pressFredda, 2)} / ${fmtNum(w.pressCalda, 2)} bar`);
    r.push(`  inizio: ${terna(w.inizio)}`);
    r.push(`  fine:   ${terna(w.fine)}`);
    r.push(`  degrado: ${etichettaDegrado(w.degrado)}`);
  }

  r.push('', 'SUGGERIMENTI');
  if (suggerimenti.length === 0) {
    r.push('Nessun suggerimento: i dati inseriti non segnalano correzioni.');
  } else {
    const noti = new Set(GRUPPI.map(([codice]) => codice));
    const gruppi = [...GRUPPI, ['', 'Altro']];
    for (const [codice, titolo] of gruppi) {
      const del = suggerimenti.filter((s) => (codice === '' ? !noti.has(s.ambito) : s.ambito === codice));
      if (del.length === 0) continue;
      r.push(titolo);
      for (const s of del) {
        r.push(`- [${String(s.intensita ?? '').toUpperCase()}] ${testo(s.titolo)}`);
        if (s.testo) r.push(`  ${s.testo}`);
      }
    }
  }

  if (avvisi.length) {
    r.push('', 'AVVISI');
    for (const a of avvisi) r.push(`- ${a}`);
  }

  if (typeof sessione.note === 'string' && sessione.note.trim() !== '') {
    r.push('', 'NOTE', sessione.note.trim());
  }

  return r.join('\n');
}
