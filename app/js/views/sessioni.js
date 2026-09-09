/**
 * Schermata 1 — Sessioni.
 *
 * Elenco delle prove salvate, una card per sessione: data in grande, evento
 * e prova, fondo e condizioni, e le quattro medie di fine prova colorate con
 * il range della mescola scelta. Tocco sulla card → sessione; cestino →
 * conferma ed elimina.
 */

import { RUOTE } from '../config.js';
import { fmtData } from '../format.js';
import {
  escapeHtml, mediaFine, mescolaDi, statoRuota, gradi,
  etichettaFondo, etichettaCondizioni,
  ICONA_CESTINO, ICONA_VUOTO,
} from '../ui.js';

const CLASSE_MINI = { vuota: '', fredda: 'mini-fredda', ok: 'mini-ok', calda: 'mini-calda' };

function miniRuote(sessione, mescola) {
  const celle = RUOTE.map((codice) => {
    const media = mediaFine(sessione.ruote?.[codice]);
    const stato = statoRuota(media, mescola);
    return `<span class="mini-ruota ${CLASSE_MINI[stato]}">
        <b>${codice}</b>
        <em>${gradi(media)}</em>
      </span>`;
  }).join('');
  return `<div class="mini-ruote" aria-label="Temperature medie di fine prova">${celle}</div>`;
}

function card(sessione, mescole) {
  const mescola = mescolaDi(sessione, mescole);
  const evento = sessione.evento?.trim() || 'Sessione senza nome';
  const prova = sessione.prova?.trim();
  const sottotitolo = [prova, mescola?.nome].filter(Boolean).join(' · ');

  return `
    <article class="card card-sessione">
      <button type="button" class="sessione-apri" data-azione="apri" data-id="${escapeHtml(sessione.id)}">
        <span class="sessione-data">${escapeHtml(fmtData(sessione.data))}</span>
        <span class="sessione-titolo">${escapeHtml(evento)}</span>
        ${sottotitolo ? `<span class="sessione-sub">${escapeHtml(sottotitolo)}</span>` : ''}
        <span class="chips chips-info">
          <span class="chip-info">${escapeHtml(etichettaFondo(sessione.fondo))}</span>
          <span class="chip-info">${escapeHtml(etichettaCondizioni(sessione.condizioni))}</span>
        </span>
        ${miniRuote(sessione, mescola)}
      </button>
      <button type="button" class="icon-btn" data-azione="elimina" data-id="${escapeHtml(sessione.id)}"
              aria-label="Elimina la sessione ${escapeHtml(evento)}">${ICONA_CESTINO}</button>
    </article>`;
}

const statoVuoto = () => `
  <div class="empty">
    ${ICONA_VUOTO}
    <p class="empty-title">Nessuna sessione</p>
    <p class="empty-sub">Registra la prima prova del weekend: temperature, pressioni e degrado di ogni gomma.</p>
    <button type="button" class="btn btn-primary" data-azione="nuova">Crea la prima sessione</button>
  </div>`;

export function render(ctx) {
  const { store, azioni, naviga, toast } = ctx;

  function disegna() {
    const sessioni = store.elencaSessioni();
    const mescole = store.getMescole();
    ctx.render(
      sessioni.length === 0
        ? statoVuoto()
        : `<p class="section-title">${sessioni.length} ${sessioni.length === 1 ? 'sessione' : 'sessioni'}</p>
           ${sessioni.map((s) => card(s, mescole)).join('')}`
    );
  }

  azioni.apri = (el) => naviga(`#/sessione/${el.dataset.id}`);
  azioni.nuova = () => naviga('#/nuova');
  azioni.elimina = (el) => {
    if (!confirm('Eliminare la sessione?')) return;
    try {
      store.eliminaSessione(el.dataset.id);
      toast('Sessione eliminata');
      disegna();
    } catch (errore) {
      toast(errore.message);
    }
  };

  disegna();
}