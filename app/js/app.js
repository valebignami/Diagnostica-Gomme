/**
 * Router a hash e aiutanti condivisi.
 *
 * `app.js` non disegna nessuna schermata: sceglie la vista dalla rotta, le
 * passa un contesto e le lascia il controllo di `#vista`. Ogni vista sta in
 * `js/views/` ed esporta una sola funzione:
 *
 *     export function render(ctx) { ctx.render('<section class="card">…</section>'); }
 *
 * dove `ctx` è `{ store, params, naviga, toast, render, azioni }` e il valore
 * di ritorno, se è una funzione, viene chiamato quando si lascia la vista
 * (smontaggio: pannelli aperti, timer, salvataggi in sospeso).
 *
 * Per aggiungere una schermata bastano due righe: l'import del modulo e la
 * voce corrispondente in `ROTTE`.
 */

import { creaStore, nuovaSessione } from './store.js';
import { escapeHtml } from './ui.js';
import * as vistaSessioni from './views/sessioni.js';
import * as vistaSessione from './views/sessione.js';

export { escapeHtml };

/* --- Service worker ------------------------------------------------------ */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {
      /* offline non disponibile: l'app funziona lo stesso */
    });
  });
}

/* --- Stato di modulo ------------------------------------------------------ */
const store = creaStore();
const vista = document.getElementById('vista');
const elToast = document.getElementById('toast');
const elTopbar = document.getElementById('topbar-azione');

/** Azioni della vista corrente: `data-azione="nome"` → funzione. */
let azioni = Object.create(null);
/** Smontaggio della vista corrente, se ne ha registrato uno. */
let smonta = null;

/* --- Aiutanti condivisi --------------------------------------------------- */

/** Sostituisce il contenuto di `#vista` e riporta la pagina in cima. */
export function render(html) {
  vista.innerHTML = html;
  window.scrollTo(0, 0);
}

let timerToast;
/** Messaggio breve in fondo allo schermo. */
export function toast(messaggio) {
  if (!elToast) return;
  elToast.textContent = String(messaggio ?? '');
  elToast.classList.add('show');
  clearTimeout(timerToast);
  timerToast = setTimeout(() => elToast.classList.remove('show'), 2600);
}

/** Cambia rotta; con `sostituisci` non lascia traccia nella cronologia. */
export function naviga(hash, { sostituisci = false } = {}) {
  const destinazione = hash.startsWith('#') ? hash : `#${hash}`;
  if (location.hash === destinazione) {
    disegna();
    return;
  }
  if (sostituisci) location.replace(destinazione);
  else location.hash = destinazione;
}

/* Delegazione unica: vale sia per `#vista` sia per i pannelli agganciati al body. */
document.addEventListener('click', (ev) => {
  const el = ev.target.closest('[data-azione]');
  if (!el) return;
  const fn = azioni[el.dataset.azione];
  if (!fn) return;
  ev.preventDefault();
  fn(el, ev);
});

/* --- Rotte ---------------------------------------------------------------- */

/** Segnaposto per le schermate dei Task 6 e 7. */
const inArrivo = (titolo, testo) => ({
  render(ctx) {
    ctx.render(`
      <section class="card">
        <h2 class="card-title">${escapeHtml(titolo)}</h2>
        <p class="card-sub">In arrivo</p>
        <p class="field-hint">${escapeHtml(testo)}</p>
      </section>`);
  },
});

/**
 * Ogni voce: `percorso` con segmenti `:nome` per i parametri, `tab` da
 * evidenziare nella barra in basso, `etichetta` per la topbar e `vista`
 * (un modulo con `render(ctx)`).
 */
const ROTTE = [
  { percorso: '/sessioni', tab: 'sessioni', etichetta: 'Sessioni', vista: vistaSessioni },
  { percorso: '/sessione/:id', tab: 'sessioni', etichetta: 'Sessione', vista: vistaSessione },
  // Task 6: sostituire con `import * as vistaDiagnosi from './views/diagnosi.js'`.
  { percorso: '/diagnosi/:id', tab: 'sessioni', etichetta: 'Diagnosi', vista: inArrivo('Diagnosi', 'I suggerimenti di assetto arrivano con il prossimo passaggio di lavoro.') },
  // Task 7: `./views/confronto.js` e `./views/impostazioni.js`.
  { percorso: '/confronto', tab: 'confronto', etichetta: 'Confronto', vista: inArrivo('Confronto', 'Il confronto fra due sessioni arriva con il prossimo passaggio di lavoro.') },
  { percorso: '/impostazioni', tab: 'impostazioni', etichetta: 'Impostazioni', vista: inArrivo('Impostazioni', 'Soglie, mescole, backup e ripristino arrivano con il prossimo passaggio di lavoro.') },
];

const ROTTA_DEFAULT = ROTTE[0];

/**
 * `decodeURIComponent` lancia su percentuali malformate (`%zz`): un hash
 * scritto a mano o troncato non deve buttare giù il router, quindi in quel caso
 * il segmento vale così com'è (nessun id reale lo eguaglierà).
 */
function decodifica(segmento) {
  try {
    return decodeURIComponent(segmento);
  } catch {
    return segmento;
  }
}

/** Confronta il percorso della rotta con quello corrente ed estrae i parametri. */
function abbina(percorso, segmenti) {
  const attesi = percorso.split('/').filter(Boolean);
  if (attesi.length !== segmenti.length) return null;
  const params = {};
  for (let i = 0; i < attesi.length; i++) {
    if (attesi[i].startsWith(':')) params[attesi[i].slice(1)] = decodifica(segmenti[i]);
    else if (attesi[i] !== segmenti[i]) return null;
  }
  return params;
}

function evidenziaTab(tab) {
  for (const a of document.querySelectorAll('.tabbar a')) {
    a.classList.toggle('active', a.dataset.tab === tab);
  }
}

/* --- Ciclo di disegno ----------------------------------------------------- */

function disegna() {
  if (!location.hash) {
    location.replace('#/sessioni');
    return;
  }
  const grezzo = location.hash.replace(/^#\/?/, '');
  const segmenti = grezzo.split('/').filter(Boolean);

  // Smonta la vista precedente prima di toccare il DOM.
  if (typeof smonta === 'function') {
    try { smonta(); } catch { /* uno smontaggio rotto non deve bloccare la navigazione */ }
  }
  smonta = null;
  azioni = Object.create(null);

  // Rotta speciale: crea una sessione e apre subito la sua schermata.
  if (segmenti.length === 1 && segmenti[0] === 'nuova') {
    evidenziaTab('nuova');
    try {
      const creata = store.salvaSessione(nuovaSessione());
      naviga(`#/sessione/${creata.id}`, { sostituisci: true });
    } catch (errore) {
      toast(errore.message);
      naviga('#/sessioni', { sostituisci: true });
    }
    return;
  }

  let scelta = null;
  let params = null;
  for (const rotta of ROTTE) {
    params = abbina(rotta.percorso, segmenti);
    if (params) { scelta = rotta; break; }
  }
  if (!scelta) { scelta = ROTTA_DEFAULT; params = {}; }

  evidenziaTab(scelta.tab);
  if (elTopbar) elTopbar.textContent = scelta.etichetta ?? '';

  const ctx = { store, params, naviga, toast, render, azioni };
  try {
    const risultato = scelta.vista.render(ctx);
    if (typeof risultato === 'function') smonta = risultato;
  } catch (errore) {
    // La vista precedente è già smontata: senza rete di sicurezza la pagina
    // resterebbe vuota fino a un ricaricamento.
    console.error(errore);
    toast('Errore nella pagina');
    // Se a rompersi è proprio l'elenco non si rimbalza all'infinito.
    if (scelta !== ROTTA_DEFAULT) naviga('#/sessioni', { sostituisci: true });
    else render('');
  }
}

window.addEventListener('hashchange', disegna);
disegna();
