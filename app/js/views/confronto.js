/**
 * Schermata 4 — Confronto.
 *
 * Due sessioni affiancate: si scelgono con due menu (di partenza le due più
 * recenti) e sotto arriva la tabella ruota per ruota — media A, media B, la
 * differenza colorata e le pressioni a freddo — poi una scheda con i dati
 * della prova. Serve a rispondere a una domanda sola: cosa è cambiato fra il
 * passaggio di prima e quello di adesso.
 *
 * La scelta vive in una variabile di modulo: si va alla diagnosi e si torna
 * indietro senza ritrovare i menu riazzerati.
 */

import { RUOTE, ETICHETTE_RUOTE } from '../config.js';
import { TRATTINO, fmtNum, fmtData } from '../format.js';
import {
  escapeHtml, mediaFine, mescolaDi, gradi,
  etichettaFondo, etichettaCondizioni, ICONA_VUOTO,
} from '../ui.js';

/** Oltre questa differenza (°C) il delta di temperatura viene colorato. */
const SOGLIA_DELTA = 3;

/** Oltre questa differenza (bar) il delta di pressione viene colorato. */
const SOGLIA_DELTA_BAR = 0.05;

/** Scelta corrente, conservata fra un ingresso nella schermata e il successivo. */
let scelta = { a: null, b: null };

/* --- Frammenti di markup -------------------------------------------------- */

/** `gg/mm/aaaa · evento · prova`, con i pezzi vuoti saltati. */
function etichettaSessione(s) {
  const parti = [fmtData(s.data), s.evento?.trim() || 'Senza nome'];
  const prova = s.prova?.trim();
  if (prova) parti.push(prova);
  return parti.join(' · ');
}

const menu = (lato, sessioni, attiva) => `
  <div class="field">
    <label for="cmp-${lato}">Sessione ${lato.toUpperCase()}</label>
    <select id="cmp-${lato}" data-scelta="${lato}">
      ${sessioni.map((s) => `<option value="${escapeHtml(s.id)}"${s.id === attiva ? ' selected' : ''}>${escapeHtml(etichettaSessione(s))}</option>`).join('')}
    </select>
  </div>`;

/**
 * Differenza B − A: testo con il segno e classe del colore. Vale sia per i
 * gradi (interi, soglia 3 °C) sia per i bar (due decimali, soglia 0,05 bar):
 * cambiano solo i decimali e la soglia oltre la quale si colora.
 */
function delta(a, b, { dec = 0, soglia = SOGLIA_DELTA } = {}) {
  if (typeof a !== 'number' || !Number.isFinite(a) ||
      typeof b !== 'number' || !Number.isFinite(b)) return { testo: TRATTINO, classe: 'delta-neutro' };
  const d = b - a;
  let testo = fmtNum(d, dec);
  const zero = fmtNum(0, dec);
  if (testo === `-${zero}`) testo = zero;
  if (!testo.startsWith('-') && testo !== zero) testo = `+${testo}`;
  // Margine minimo: 1,85 − 1,80 in virgola mobile fa 0,049999… e resterebbe grigio.
  const limite = soglia - 1e-9;
  const classe = d >= limite ? 'delta-caldo' : d <= -limite ? 'delta-freddo' : 'delta-neutro';
  return { testo, classe };
}

function tabella(a, b) {
  const righe = RUOTE.map((codice) => {
    const ra = a.ruote?.[codice] ?? {};
    const rb = b.ruote?.[codice] ?? {};
    const mediaA = mediaFine(ra);
    const mediaB = mediaFine(rb);
    const d = delta(mediaA, mediaB);
    const dp = delta(ra.pressFredda, rb.pressFredda, { dec: 2, soglia: SOGLIA_DELTA_BAR });
    return `
      <tr>
        <th scope="row" title="${escapeHtml(ETICHETTE_RUOTE[codice] ?? codice)}">${escapeHtml(codice)}</th>
        <td>${gradi(mediaA)}</td>
        <td>${gradi(mediaB)}</td>
        <td class="${d.classe}">${escapeHtml(d.testo)}</td>
        <td>${fmtNum(ra.pressFredda, 2)}</td>
        <td>${fmtNum(rb.pressFredda, 2)}</td>
        <td class="${dp.classe}">${escapeHtml(dp.testo)}</td>
      </tr>`;
  }).join('');

  return `
    <div class="tabella-wrap">
      <table class="tabella">
        <caption class="sr-only">Temperature medie di fine prova e pressioni a freddo delle due sessioni</caption>
        <thead>
          <tr>
            <th scope="col">Ruota</th>
            <th scope="col">Media A<small>°C</small></th>
            <th scope="col">Media B<small>°C</small></th>
            <th scope="col">Δ B−A</th>
            <th scope="col">Fredda A<small>bar</small></th>
            <th scope="col">Fredda B<small>bar</small></th>
            <th scope="col">Δ bar</th>
          </tr>
        </thead>
        <tbody>${righe}</tbody>
      </table>
    </div>`;
}

/** Righe della scheda dei dati di prova: etichetta e come si legge da una sessione. */
const RIGHE_INFO = (mescole) => [
  ['Data', (s) => escapeHtml(fmtData(s.data))],
  ['Evento', (s) => escapeHtml(s.evento?.trim() || TRATTINO)],
  ['Prova', (s) => escapeHtml(s.prova?.trim() || TRATTINO)],
  ['Fondo', (s) => escapeHtml(etichettaFondo(s.fondo))],
  ['Condizioni', (s) => escapeHtml(etichettaCondizioni(s.condizioni))],
  ['Temp. asfalto', (s) => `${gradi(s.tempAsfalto)} °C`],
  ['Temp. aria', (s) => `${gradi(s.tempAria)} °C`],
  ['Mescola', (s) => escapeHtml(mescolaDi(s, mescole)?.nome ?? TRATTINO)],
  ['Camber ant.', (s) => `${fmtNum(s.camber?.ant, 1)}°`],
  ['Camber post.', (s) => `${fmtNum(s.camber?.post, 1)}°`],
];

function schedaDati(a, b, mescole) {
  const righe = RIGHE_INFO(mescole)
    .map(([etichetta, leggi]) => `
      <span class="cmp-label">${escapeHtml(etichetta)}</span>
      <span class="cmp-val">${leggi(a)}</span>
      <span class="cmp-val">${leggi(b)}</span>`)
    .join('');
  return `
    <section class="card">
      <h2 class="card-title">Dati della prova</h2>
      <div class="cmp-griglia">
        <span class="cmp-label"></span>
        <span class="cmp-cap">A</span>
        <span class="cmp-cap">B</span>
        ${righe}
      </div>
    </section>`;
}

const statoVuoto = () => `
  <div class="empty">
    ${ICONA_VUOTO}
    <p class="empty-title">Servono almeno due sessioni</p>
    <p class="empty-sub">Il confronto affianca due prove: registra un altro passaggio e torna qui per vedere cosa è cambiato.</p>
    <button type="button" class="btn btn-primary" data-azione="nuova">Nuova sessione</button>
  </div>`;

/* --- Vista ---------------------------------------------------------------- */

export function render(ctx) {
  const { store, azioni, naviga } = ctx;

  const sessioni = store.elencaSessioni();
  const mescole = store.getMescole();

  if (sessioni.length < 2) {
    ctx.render(statoVuoto());
    azioni.nuova = () => naviga('#/nuova');
    return;
  }

  // Scelta di partenza (o ripiego se una delle due sessioni non c'è più).
  const ids = new Set(sessioni.map((s) => s.id));
  if (!ids.has(scelta.a) || !ids.has(scelta.b)) {
    scelta = { a: sessioni[0].id, b: sessioni[1].id };
  }

  const trova = (id) => sessioni.find((s) => s.id === id);

  function corpo() {
    const a = trova(scelta.a);
    const b = trova(scelta.b);
    if (!a || !b) return '';
    return `
      <section class="card">
        <h2 class="card-title">Temperature e pressioni</h2>
        <p class="card-sub">Medie di fine prova e pressioni a freddo. I delta sono B meno A: in rosso se B è più alta, in blu se più bassa. La tabella scorre di lato.</p>
        ${tabella(a, b)}
      </section>
      ${schedaDati(a, b, mescole)}
      <div class="btn-row">
        <button type="button" class="btn btn-ghost" data-azione="diagnosi" data-id="${escapeHtml(a.id)}">Apri diagnosi A</button>
        <button type="button" class="btn btn-ghost" data-azione="diagnosi" data-id="${escapeHtml(b.id)}">Apri diagnosi B</button>
      </div>`;
  }

  ctx.render(`
    <section class="card">
      <h2 class="card-title">Confronto</h2>
      <p class="card-sub">Scegli le due prove da mettere una accanto all'altra.</p>
      ${menu('a', sessioni, scelta.a)}
      ${menu('b', sessioni, scelta.b)}
    </section>
    <div id="cmp-corpo">${corpo()}</div>`);

  /* --- Cambio di sessione ------------------------------------------------- */

  /** Ridisegna solo la parte sotto ai menu: niente salto in cima alla pagina. */
  function aggiorna() {
    const contenitore = document.getElementById('cmp-corpo');
    if (contenitore) contenitore.innerHTML = corpo();
  }

  function suCambio(ev) {
    const el = ev.target?.closest?.('[data-scelta]');
    if (!el) return;
    scelta[el.dataset.scelta] = el.value;
    aggiorna();
  }
  document.addEventListener('change', suCambio);

  azioni.diagnosi = (el) => naviga(`#/diagnosi/${el.dataset.id}`);

  return () => document.removeEventListener('change', suCambio);
}
