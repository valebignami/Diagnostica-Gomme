/**
 * Aiutanti di presentazione condivisi fra le viste.
 *
 * Qui sta tutto ciò che serve a più di una schermata: escape dell'HTML,
 * lettura e scrittura dei valori numerici digitati a mano, stato termico di
 * una ruota, icone e silhouette. Nessuna dipendenza dal router: così le viste
 * importano da qui senza creare cicli con `app.js`.
 */

import { RUOTE, ETICHETTE_RUOTE } from './config.js';
import { TRATTINO, fmtNum } from './format.js';

/* --- Testo --------------------------------------------------------------- */

const FUGA = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Rende sicuro un valore qualsiasi interpolato dentro l'HTML o un attributo. */
export function escapeHtml(valore) {
  return String(valore ?? '').replace(/[&<>"']/g, (c) => FUGA[c]);
}

/* --- Numeri -------------------------------------------------------------- */

/**
 * Legge un numero digitato dall'utente accettando sia la virgola sia il punto.
 * Campo vuoto o testo non numerico → `null`, mai `NaN`.
 */
export function parseNumero(grezzo) {
  if (typeof grezzo === 'number') return Number.isFinite(grezzo) ? grezzo : null;
  if (typeof grezzo !== 'string') return null;
  const t = grezzo.trim().replace(',', '.');
  if (t === '' || !/^[+-]?(\d+(\.\d*)?|\.\d+)$/.test(t)) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Valore da mettere nell'attributo `value` di un campo: virgola, o vuoto. */
export function valoreCampo(v) {
  return typeof v === 'number' && Number.isFinite(v) ? String(v).replace('.', ',') : '';
}

/** Scrive `valore` dentro `oggetto` seguendo un percorso tipo `camber.ant`. */
export function impostaPercorso(oggetto, percorso, valore) {
  const parti = String(percorso).split('.');
  let nodo = oggetto;
  for (const p of parti.slice(0, -1)) {
    if (nodo[p] == null || typeof nodo[p] !== 'object') nodo[p] = {};
    nodo = nodo[p];
  }
  nodo[parti[parti.length - 1]] = valore;
}

/** Legge un percorso tipo `ruote.AS.fine.int`, `undefined` se manca un pezzo. */
export function leggiPercorso(oggetto, percorso) {
  return String(percorso).split('.').reduce((n, p) => (n == null ? undefined : n[p]), oggetto);
}

/* --- Ruote --------------------------------------------------------------- */

/** Media delle tre temperature di fine prova, o `null` se ne manca una. */
export function mediaFine(ruota) {
  const f = ruota?.fine;
  const v = [f?.int, f?.cen, f?.est];
  if (!v.every((x) => typeof x === 'number' && Number.isFinite(x))) return null;
  return (v[0] + v[1] + v[2]) / 3;
}

/** La mescola scelta nella sessione, o `null` se non è più in elenco. */
export function mescolaDi(sessione, mescole = []) {
  return mescole.find((m) => m.id === sessione?.mescola) ?? null;
}

/** `vuota` | `fredda` | `ok` | `calda` a partire dalla media e dal range mescola. */
export function statoRuota(media, mescola) {
  if (media == null) return 'vuota';
  if (!mescola || typeof mescola.min !== 'number' || typeof mescola.max !== 'number') return 'ok';
  if (media < mescola.min) return 'fredda';
  if (media > mescola.max) return 'calda';
  return 'ok';
}

export const CLASSE_STATO = { vuota: 'tyre-vuota', fredda: 'tyre-fredda', ok: 'tyre-ok', calda: 'tyre-calda' };
export const BADGE_STATO = { vuota: 'badge-neutro', fredda: 'badge-fredda', ok: 'badge-ok', calda: 'badge-forte' };
export const ETICHETTA_STATO = { vuota: 'Senza dati', fredda: 'Fredda', ok: 'In range', calda: 'Calda' };

/* --- Etichette ----------------------------------------------------------- */

export const FONDI = [
  { valore: 'asfalto', etichetta: 'Asfalto' },
  { valore: 'terra', etichetta: 'Terra' },
];

export const CONDIZIONI = [
  { valore: 'asciutto', etichetta: 'Asciutto' },
  { valore: 'umido', etichetta: 'Umido' },
  { valore: 'bagnato', etichetta: 'Bagnato' },
];

const etichettaDa = (elenco, valore) =>
  elenco.find((v) => v.valore === valore)?.etichetta ?? (valore ? String(valore) : TRATTINO);

export const etichettaFondo = (v) => etichettaDa(FONDI, v);
export const etichettaCondizioni = (v) => etichettaDa(CONDIZIONI, v);

/** Temperatura in gradi già formattata, con il trattino se manca il dato. */
export const gradi = (v, dec = 0) => (v == null ? TRATTINO : fmtNum(v, dec));

/* --- Icone --------------------------------------------------------------- */

export const ICONA_CESTINO = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"/><path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2"/></svg>`;

export const ICONA_CHEVRON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>`;

export const ICONA_VUOTO = `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
  <circle cx="32" cy="32" r="26"/><circle cx="32" cy="32" r="11"/>
  <path d="M32 6v10M32 48v10M6 32h10M48 32h10M13.6 13.6l7 7M43.4 43.4l7 7M50.4 13.6l-7 7M20.6 43.4l-7 7"/>
</svg>`;

/** Auto vista dall'alto, sfondo della griglia delle quattro ruote. */
export const SILHOUETTE = `<svg class="auto-silhouette" viewBox="0 0 100 200" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
  <path d="M50 4C40 6 34 12 32 22L28 42C20 47 16 58 16 76L16 150C16 164 18 172 24 178L26 186C28 195 36 198 50 198C64 198 72 195 74 186L76 178C82 172 84 164 84 150L84 76C84 58 80 47 72 42L68 22C66 12 60 6 50 4Z" fill="#252a34" stroke="#3a4150" stroke-width="1.6"/>
  <path d="M34 60H66L63 80H37Z" fill="#12151b"/>
  <rect x="36" y="84" width="28" height="40" rx="5" fill="#1b1f27"/>
  <path d="M37 128H63L66 148H34Z" fill="#12151b"/>
  <path d="M50 84V124" stroke="#ff3b1f" stroke-width="4" stroke-opacity=".6"/>
  <rect x="20" y="179" width="60" height="9" rx="3" fill="#1b1f27" stroke="#3a4150" stroke-width="1.6"/>
  <rect x="34" y="14" width="12" height="6" rx="3" fill="#454d5e"/>
  <rect x="54" y="14" width="12" height="6" rx="3" fill="#454d5e"/>
</svg>`;

export const LEGENDA_AUTO = `<div class="auto-legenda">
  <span style="color:var(--cold)"><i></i>Fredda</span>
  <span style="color:var(--ok)"><i></i>In range</span>
  <span style="color:var(--forte)"><i></i>Calda</span>
  <span><i></i>Senza dati</span>
</div>`;

/* --- Griglia delle quattro ruote ----------------------------------------- */

/**
 * Una mattonella `.tyre`: sigla, media di fine prova e pressione a freddo,
 * colorata con lo stato termico rispetto al range della mescola.
 *
 * Con `interattiva` esce un `<button>` con `id="tyre-AS"` e
 * `data-azione="ruota"` (la sessione lo tocca per aprire il pannello e lo
 * ridisegna sostituendo l'`outerHTML`); senza, un riquadro di sola lettura.
 */
export function tyreRuota(sessione, codice, mescola, { interattiva = false } = {}) {
  const r = sessione?.ruote?.[codice] ?? {};
  const media = mediaFine(r);
  const stato = statoRuota(media, mescola);
  const press = typeof r.pressFredda === 'number' ? `${fmtNum(r.pressFredda, 2)} bar` : 'da rilevare';
  const corpo = `
      <span class="tyre-code">${escapeHtml(codice)}</span>
      <span class="tyre-temp">${gradi(media)}<small>°</small></span>
      <span class="tyre-press">${escapeHtml(press)}</span>`;
  const nome = ETICHETTE_RUOTE[codice] ?? codice;
  if (!interattiva) {
    const valore = media == null ? 'senza dati' : `${gradi(media)} gradi`;
    return `<div class="tyre ${CLASSE_STATO[stato]}" role="img"
      aria-label="${escapeHtml(`${nome}: ${valore}, ${ETICHETTA_STATO[stato].toLowerCase()}`)}">${corpo}</div>`;
  }
  return `<button type="button" class="tyre ${CLASSE_STATO[stato]}" id="tyre-${escapeHtml(codice)}"
      data-azione="ruota" data-cod="${escapeHtml(codice)}"
      aria-label="${escapeHtml(`${nome}, ${ETICHETTA_STATO[stato].toLowerCase()}`)}">${corpo}</button>`;
}

/** Silhouette, le quattro mattonelle e la legenda dei colori. */
export function autoRuote(sessione, mescole, opzioni) {
  const mescola = mescolaDi(sessione, mescole);
  return `<div class="auto">
        ${SILHOUETTE}
        ${RUOTE.map((c) => tyreRuota(sessione, c, mescola, opzioni)).join('')}
      </div>
      ${LEGENDA_AUTO}`;
}
