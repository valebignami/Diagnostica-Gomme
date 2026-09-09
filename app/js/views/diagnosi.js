/**
 * Schermata 3 — Diagnosi.
 *
 * Sola lettura: il motore di `rules.js` gira una volta sola all'apertura e
 * quello che esce viene raggruppato dal generale al particolare — mescola e
 * asfalto, assali, lati, poi ruota per ruota — così il pilota, in piedi
 * accanto alla macchina, legge prima le correzioni che pesano di più.
 */

import { RUOTE, ETICHETTE_RUOTE } from '../config.js';
import { diagnosi } from '../rules.js';
import { diagnosiInTesto, fmtData } from '../format.js';
import {
  escapeHtml, mescolaDi, gradi,
  etichettaFondo, etichettaCondizioni, autoRuote,
} from '../ui.js';

/* --- Tabelle di presentazione -------------------------------------------- */

/** Sezioni nell'ordine di lettura; ogni ambito di `rules.js` sta in una sola. */
const SEZIONI = [
  { titolo: 'Mescola e asfalto', ambiti: ['auto'] },
  { titolo: 'Assali', ambiti: ['anteriore', 'posteriore'] },
  { titolo: 'Lati', ambiti: ['sinistra', 'destra'] },
  ...RUOTE.map((codice) => ({ titolo: ETICHETTE_RUOTE[codice], ambiti: [codice] })),
];

/** Ambiti già coperti: quello che non c'è finisce nella sezione "Altro". */
const AMBITI_NOTI = new Set(SEZIONI.flatMap((s) => s.ambiti));

const AREE = {
  pressione: 'Pressione',
  camber: 'Camber',
  bilanciamento: 'Bilanciamento',
  asimmetria: 'Asimmetria',
  mescola: 'Mescola',
  degrado: 'Degrado',
};

const INTENSITA = ['forte', 'media', 'leggera'];
const peso = (i) => (INTENSITA.indexOf(i) === -1 ? INTENSITA.length : INTENSITA.indexOf(i));

/* --- Frammenti di markup -------------------------------------------------- */

const stat = (etichetta, valore, extra = '') => `
  <div class="stat${extra}">
    <span class="stat-label">${escapeHtml(etichetta)}</span>
    <span class="stat-value">${valore}</span>
  </div>`;

function cardSuggerimento(s) {
  const intensita = INTENSITA.includes(s.intensita) ? s.intensita : 'leggera';
  const area = AREE[s.area] ?? s.area ?? '';
  return `
    <article class="card card-sug sug-${intensita}">
      <div class="diagnosi-head">
        <span class="badge badge-${intensita}">${escapeHtml(intensita)}</span>
        ${area ? `<span class="diagnosi-area">${escapeHtml(area)}</span>` : ''}
      </div>
      <p class="diagnosi-titolo">${escapeHtml(s.titolo ?? '')}</p>
      <p class="diagnosi-testo">${escapeHtml(s.testo ?? '')}</p>
    </article>`;
}

function htmlSezione(titolo, elenco) {
  if (elenco.length === 0) return '';
  const ordinati = [...elenco].sort((a, b) => peso(a.intensita) - peso(b.intensita));
  return `
    <p class="section-title">${escapeHtml(titolo)}</p>
    <div class="sug-gruppo">${ordinati.map(cardSuggerimento).join('')}</div>`;
}

function htmlIntestazione(sessione, mescola) {
  const evento = sessione.evento?.trim() || 'Sessione senza nome';
  const prova = sessione.prova?.trim();
  return `
    <section class="card">
      <h2 class="card-title">${escapeHtml(evento)}</h2>
      <p class="card-sub">${escapeHtml([fmtData(sessione.data), prova].filter(Boolean).join(' · '))}</p>
      <div class="chips chips-info">
        <span class="chip-info">${escapeHtml(etichettaFondo(sessione.fondo))}</span>
        <span class="chip-info">${escapeHtml(etichettaCondizioni(sessione.condizioni))}</span>
      </div>
      <div class="card-stats">
        ${stat('Asfalto', `${gradi(sessione.tempAsfalto)}<small>°C</small>`)}
        ${stat('Aria', `${gradi(sessione.tempAria)}<small>°C</small>`)}
        ${stat('Mescola', escapeHtml(mescola?.nome ?? 'Non scelta'), ' stat-testo')}
      </div>
    </section>`;
}

function htmlConteggi(suggerimenti) {
  if (suggerimenti.length === 0) return '';
  const celle = INTENSITA
    .map((i) => stat(i, String(suggerimenti.filter((s) => s.intensita === i).length), ` stat-${i}`))
    .join('');
  return `<section class="card"><div class="card-stats">${celle}</div></section>`;
}

const htmlAvvisi = (avvisi, id) => (avvisi.length === 0 ? '' : `
    <section class="card card-avviso">
      <h2 class="card-title">Dati incompleti</h2>
      <ul class="avvisi">${avvisi.map((a) => `<li>${escapeHtml(a)}</li>`).join('')}</ul>
      <button type="button" class="btn btn-ghost btn-block" data-azione="completa"
              data-id="${escapeHtml(id)}">Completa i dati</button>
    </section>`);

const CARD_OK = `
    <section class="card card-ok">
      <h2 class="card-title">Setup in equilibrio</h2>
      <p class="card-sub">Nessuna correzione da fare: temperature e degrado sono nei limiti impostati.</p>
    </section>`;

/* --- Vista ---------------------------------------------------------------- */

export function render(ctx) {
  const { store, params, azioni, naviga, toast } = ctx;

  const sessione = store.getSessione(params.id);
  if (!sessione) {
    ctx.render('');
    toast('Sessione non trovata');
    naviga('#/sessioni', { sostituisci: true });
    return;
  }

  const mescole = store.getMescole();
  const risultato = diagnosi(sessione, store.getSoglie(), mescole);
  const { suggerimenti, avvisi } = risultato;
  let vivo = true;

  const sezioni = SEZIONI
    .map((s) => htmlSezione(s.titolo, suggerimenti.filter((x) => s.ambiti.includes(x.ambito))))
    .join('');
  const altro = htmlSezione('Altro', suggerimenti.filter((x) => !AMBITI_NOTI.has(x.ambito)));

  ctx.render(`
    ${htmlIntestazione(sessione, mescolaDi(sessione, mescole))}
    ${htmlConteggi(suggerimenti)}
    <section class="card">
      <h2 class="card-title">Temperature medie</h2>
      ${autoRuote(sessione, mescole)}
    </section>
    ${htmlAvvisi(avvisi, sessione.id)}
    ${suggerimenti.length === 0 && avvisi.length === 0 ? CARD_OK : ''}
    ${sezioni}${altro}
    <button type="button" class="btn btn-primary btn-block" data-azione="condividi">Condividi diagnosi</button>
    <button type="button" class="btn btn-ghost btn-block" data-azione="indietro">Torna alla sessione</button>`);

  /* --- Azioni ------------------------------------------------------------- */

  /** Il toast arriva dopo un `await`: se intanto si è cambiato schermata, tace. */
  const avvisa = (messaggio) => { if (vivo) toast(messaggio); };

  azioni.condividi = async () => {
    const testo = diagnosiInTesto(sessione, risultato, mescole);
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: 'Diagnosi gomme', text: testo });
      } catch (errore) {
        // Annullare la condivisione è una scelta dell'utente, non un errore.
        if (errore?.name !== 'AbortError') avvisa('Condivisione non riuscita');
      }
      return;
    }
    if (typeof navigator.clipboard?.writeText === 'function') {
      try {
        await navigator.clipboard.writeText(testo);
        avvisa('Diagnosi copiata');
      } catch {
        avvisa('Condivisione non disponibile');
      }
      return;
    }
    toast('Condivisione non disponibile');
  };

  azioni.completa = (el) => naviga(`#/sessione/${el.dataset.id}`);
  azioni.indietro = () => naviga(`#/sessione/${sessione.id}`);

  return () => { vivo = false; };
}
