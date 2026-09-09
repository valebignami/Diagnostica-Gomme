/**
 * Schermata 2 — Sessione (compilazione).
 *
 * Intestazione della prova, le quattro ruote disposte come la macchina vista
 * dall'alto e un pannello dal basso per i dati di ogni gomma. Tutto si salva
 * da solo 300 ms dopo l'ultima digitazione: al parco assistenza nessuno ha
 * voglia di cercare il tasto "salva".
 */

import { RUOTE, ETICHETTE_RUOTE, DEGRADO } from '../config.js';
import { fmtNum } from '../format.js';
import { sessioneIntatta } from '../store.js';
import {
  escapeHtml, parseNumero, valoreCampo, impostaPercorso,
  mediaFine, mescolaDi, statoRuota,
  BADGE_STATO, ETICHETTA_STATO,
  FONDI, CONDIZIONI,
  tyreRuota, autoRuote,
} from '../ui.js';

/* --- Frammenti di markup -------------------------------------------------- */

const segmented = (azione, etichetta, opzioni, attivo) => `
  <div class="field">
    <span class="field-label">${escapeHtml(etichetta)}</span>
    <div class="segmented" role="group" aria-label="${escapeHtml(etichetta)}">
      ${opzioni.map((o) => `<button type="button" class="${o.valore === attivo ? 'active' : ''}"
        data-azione="${azione}" data-val="${o.valore}" aria-pressed="${o.valore === attivo}">${escapeHtml(o.etichetta)}</button>`).join('')}
    </div>
  </div>`;

const campoNum = (id, etichetta, percorso, valore, extra = '') => `
  <div class="field">
    <label for="${id}">${escapeHtml(etichetta)}</label>
    <input id="${id}" type="text" inputmode="decimal" autocomplete="off"
           data-campo="${percorso}" data-tipo="num" value="${escapeHtml(valoreCampo(valore))}"${extra}>
  </div>`;

const opzioniMescola = (mescole, fondo, scelta) =>
  mescole
    .filter((m) => m.fondo === fondo)
    .map((m) => `<option value="${escapeHtml(m.id)}"${m.id === scelta ? ' selected' : ''}>${escapeHtml(m.nome)} · ${escapeHtml(m.min)}–${escapeHtml(m.max)} °C</option>`)
    .join('');

/* --- Vista ---------------------------------------------------------------- */

export function render(ctx) {
  const { store, params, azioni, naviga, toast } = ctx;

  let sessione = store.getSessione(params.id);
  if (!sessione) {
    ctx.render('');
    toast('Sessione non trovata');
    naviga('#/sessioni', { sostituisci: true });
    return;
  }

  const mescole = store.getMescole();
  let ruotaAperta = null;
  /** Elemento che aveva il fuoco prima di aprire il pannello. */
  let fuocoPrec = null;
  let eliminata = false;
  let daSalvare = false;
  let timerSalva = null;
  let ultimoToast = 0;

  /* --- Salvataggio automatico -------------------------------------------- */

  function salvaOra(conToast = true) {
    clearTimeout(timerSalva);
    timerSalva = null;
    if (!daSalvare || eliminata) return;
    try {
      sessione = store.salvaSessione(sessione);
      // Il segnale si spegne solo a scrittura riuscita: se fallisce, il
      // prossimo salvataggio (o l'uscita dalla schermata) ci riprova.
      daSalvare = false;
    } catch (errore) {
      toast(errore.message);
      return;
    }
    if (conToast && Date.now() - ultimoToast > 2400) {
      ultimoToast = Date.now();
      toast('Salvato');
    }
  }

  function pianifica() {
    daSalvare = true;
    clearTimeout(timerSalva);
    timerSalva = setTimeout(() => salvaOra(true), 300);
  }

  /* --- Coerenza mescola / fondo ------------------------------------------ */

  /** Se la mescola scelta non appartiene al fondo, passa alla prima buona. */
  function allineaMescola() {
    const attuale = mescolaDi(sessione, mescole);
    if (attuale && attuale.fondo === sessione.fondo) return false;
    const prima = mescole.find((m) => m.fondo === sessione.fondo);
    if (!prima || prima.id === sessione.mescola) return false;
    sessione.mescola = prima.id;
    return true;
  }

  if (allineaMescola()) pianifica();

  /* --- Ruote -------------------------------------------------------------- */

  const htmlRuota = (codice) =>
    tyreRuota(sessione, codice, mescolaDi(sessione, mescole), { interattiva: true });

  function aggiornaRuote() {
    for (const codice of RUOTE) {
      const el = document.getElementById(`tyre-${codice}`);
      if (el) el.outerHTML = htmlRuota(codice);
    }
  }

  /* --- Intestazione ------------------------------------------------------- */

  function htmlVista() {
    return `
    <section class="card">
      <h2 class="card-title">Intestazione</h2>

      <div class="field">
        <label for="f-data">Data</label>
        <input id="f-data" type="date" data-campo="data" data-tipo="testo" value="${escapeHtml(sessione.data ?? '')}">
      </div>

      <div class="field">
        <label for="f-evento">Evento</label>
        <input id="f-evento" type="text" autocomplete="off" placeholder="Rally del Ciocco"
               data-campo="evento" data-tipo="testo" value="${escapeHtml(sessione.evento ?? '')}">
      </div>

      <div class="field">
        <label for="f-prova">Prova</label>
        <input id="f-prova" type="text" autocomplete="off" placeholder="PS3 Careggine"
               data-campo="prova" data-tipo="testo" value="${escapeHtml(sessione.prova ?? '')}">
      </div>

      ${segmented('fondo', 'Fondo', FONDI, sessione.fondo)}
      ${segmented('condizioni', 'Condizioni', CONDIZIONI, sessione.condizioni)}

      <div class="field-row">
        ${campoNum('f-aria', 'Temp. aria (°C)', 'tempAria', sessione.tempAria)}
        ${campoNum('f-asfalto', 'Temp. asfalto (°C)', 'tempAsfalto', sessione.tempAsfalto)}
      </div>

      <div class="field" id="campo-mescola">
        <label for="f-mescola">Mescola</label>
        <select id="f-mescola" data-campo="mescola" data-tipo="testo">
          ${opzioniMescola(mescole, sessione.fondo, sessione.mescola)}
        </select>
      </div>

      <div class="field-row">
        ${campoNum('f-camber-ant', 'Camber ant. (°)', 'camber.ant', sessione.camber?.ant)}
        ${campoNum('f-camber-post', 'Camber post. (°)', 'camber.post', sessione.camber?.post)}
      </div>
      <p class="field-hint">Camber in gradi, con il segno meno per il camber negativo: es. -2,5.</p>

      <div class="field">
        <label for="f-note">Note</label>
        <textarea id="f-note" rows="3" placeholder="Sensazioni del pilota, meteo, modifiche provate…"
                  data-campo="note" data-tipo="testo">${escapeHtml(sessione.note ?? '')}</textarea>
      </div>
    </section>

    <section class="card">
      <h2 class="card-title">Ruote</h2>
      <p class="card-sub">Tocca una gomma per inserire pressioni, temperature e degrado.</p>
      ${autoRuote(sessione, mescole, { interattiva: true })}
    </section>

    <button type="button" class="btn btn-primary btn-block" data-azione="diagnosi">Vai alla diagnosi</button>
    <button type="button" class="btn btn-ghost btn-block" data-azione="duplica">Duplica per passaggio successivo</button>
    <button type="button" class="btn btn-danger btn-block" data-azione="elimina">Elimina</button>`;
  }

  ctx.render(htmlVista());

  /* --- Pannello della ruota ---------------------------------------------- */

  const backdrop = document.createElement('div');
  backdrop.className = 'sheet-backdrop';
  const sheet = document.createElement('div');
  sheet.className = 'sheet';
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.setAttribute('aria-label', 'Dati della ruota');
  // Il pannello stesso è messo a fuoco all'apertura: `aria-modal` senza fuoco
  // dentro il pannello lascerebbe il lettore di schermo sullo sfondo.
  sheet.setAttribute('tabindex', '-1');
  document.body.append(backdrop, sheet);

  const cellaTemp = (codice, fase, punto, etichetta) => {
    const valore = sessione.ruote?.[codice]?.[fase]?.[punto];
    return `<input type="text" inputmode="decimal" autocomplete="off"
      data-campo="ruote.${codice}.${fase}.${punto}" data-tipo="num"
      aria-label="${escapeHtml(etichetta)}" value="${escapeHtml(valoreCampo(valore))}">`;
  };

  function htmlDegrado(codice) {
    const attivo = sessione.ruote?.[codice]?.degrado ?? 'regolare';
    const voce = DEGRADO.find((d) => d.codice === attivo);
    return `
      <div class="chips" id="sheet-degrado">
        ${DEGRADO.map((d) => `<button type="button" class="chip ${d.codice === attivo ? 'active' : ''}"
          data-azione="degrado" data-cod="${d.codice}">${escapeHtml(d.etichetta)}</button>`).join('')}
      </div>
      <p class="field-hint" id="sheet-degrado-desc">${escapeHtml(voce?.descrizione ?? '')}</p>`;
  }

  function htmlSheet(codice) {
    const r = sessione.ruote?.[codice] ?? {};
    const stato = statoRuota(mediaFine(r), mescolaDi(sessione, mescole));
    const i = RUOTE.indexOf(codice);
    const prec = RUOTE[(i - 1 + RUOTE.length) % RUOTE.length];
    const succ = RUOTE[(i + 1) % RUOTE.length];

    return `
      <div class="sheet-handle"></div>
      <h2 class="sheet-title">${escapeHtml(ETICHETTE_RUOTE[codice])}
        <span class="badge ${BADGE_STATO[stato]}" id="sheet-badge">${ETICHETTA_STATO[stato]}</span>
      </h2>

      <div class="sheet-nav">
        <button type="button" class="btn btn-ghost" data-azione="vai-ruota" data-cod="${prec}"
                aria-label="Ruota precedente: ${escapeHtml(ETICHETTE_RUOTE[prec])}">← Prec. ${prec}</button>
        <button type="button" class="btn btn-ghost" data-azione="vai-ruota" data-cod="${succ}"
                aria-label="Ruota successiva: ${escapeHtml(ETICHETTE_RUOTE[succ])}">Succ. ${succ} →</button>
      </div>

      <div class="field-row">
        ${campoNum(`s-fredda-${codice}`, 'A freddo (bar)', `ruote.${codice}.pressFredda`, r.pressFredda)}
        ${campoNum(`s-calda-${codice}`, 'A caldo (bar)', `ruote.${codice}.pressCalda`, r.pressCalda)}
      </div>

      <p class="section-title">Temperature (°C)</p>
      <div class="temps-grid">
        <span></span>
        <span class="temps-head">Interna</span>
        <span class="temps-head">Centro</span>
        <span class="temps-head">Esterna</span>
        <span class="temps-label">Inizio</span>
        ${cellaTemp(codice, 'inizio', 'int', 'Inizio, interna')}
        ${cellaTemp(codice, 'inizio', 'cen', 'Inizio, centro')}
        ${cellaTemp(codice, 'inizio', 'est', 'Inizio, esterna')}
        <span class="temps-label">Fine</span>
        ${cellaTemp(codice, 'fine', 'int', 'Fine, interna')}
        ${cellaTemp(codice, 'fine', 'cen', 'Fine, centro')}
        ${cellaTemp(codice, 'fine', 'est', 'Fine, esterna')}
      </div>

      <p class="section-title">Degrado</p>
      ${htmlDegrado(codice)}

      <button type="button" class="btn btn-ghost btn-block" data-azione="copia-pressione">Copia pressione a freddo su tutte le ruote</button>
      <button type="button" class="btn btn-primary btn-block" data-azione="chiudi-sheet">Chiudi</button>`;
  }

  /* --- Fuoco -------------------------------------------------------------- */

  const SELETTORE_FUOCO = 'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])';

  /** Controlli del pannello raggiungibili con Tab, nell'ordine del documento. */
  function focusabili() {
    return Array.from(sheet.querySelectorAll(SELETTORE_FUOCO)).filter((el) => !el.disabled);
  }

  /** Tiene Tab e Shift+Tab dentro il pannello finché è aperto. */
  function trappolaFuoco(ev) {
    const elenco = focusabili();
    if (!elenco.length) {
      ev.preventDefault();
      sheet.focus();
      return;
    }
    const primo = elenco[0];
    const ultimo = elenco[elenco.length - 1];
    const attivo = document.activeElement;
    const dentro = attivo && attivo !== sheet && sheet.contains(attivo);
    if (ev.shiftKey) {
      if (!dentro || attivo === primo) {
        ev.preventDefault();
        ultimo.focus();
      }
    } else if (!dentro || attivo === ultimo) {
      ev.preventDefault();
      primo.focus();
    }
  }

  /**
   * Riporta il fuoco sulla gomma che ha aperto il pannello. Le mattonelle
   * vengono ridisegnate sostituendo l'`outerHTML`, quindi l'elemento memorizzato
   * può non essere più nel documento: si ritrova per id.
   */
  function ripristinaFuoco() {
    const prec = fuocoPrec;
    fuocoPrec = null;
    if (!prec) return;
    const perId = prec.id ? document.getElementById(prec.id) : null;
    const bersaglio = perId ?? (document.contains(prec) ? prec : null);
    if (bersaglio && typeof bersaglio.focus === 'function') bersaglio.focus();
  }

  /**
   * Porta il fuoco sul pannello. `.sheet.open` rende `visibility` immediata
   * proprio perché un elemento `hidden` non accetta il fuoco; se una vecchia
   * cache del foglio di stile dicesse altro, si riprova a transizione avviata.
   */
  function mettiFuoco() {
    sheet.focus();
    if (document.activeElement === sheet) return;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (ruotaAperta) sheet.focus();
    }));
  }

  function apriSheet(codice) {
    // Il cambio ruota con Prec./Succ. non deve perdere la gomma di partenza.
    if (!ruotaAperta) fuocoPrec = document.activeElement;
    ruotaAperta = codice;
    sheet.innerHTML = htmlSheet(codice);
    backdrop.classList.add('open');
    sheet.classList.add('open');
    sheet.scrollTop = 0;
    mettiFuoco();
  }

  function chiudiSheet() {
    if (!ruotaAperta) return;
    ruotaAperta = null;
    backdrop.classList.remove('open');
    sheet.classList.remove('open');
    salvaOra(false);
    aggiornaRuote();
    ripristinaFuoco();
  }

  /** Ricalcola il badge del pannello mentre si digitano le temperature. */
  function aggiornaBadgeSheet() {
    if (!ruotaAperta) return;
    const badge = sheet.querySelector('#sheet-badge');
    if (!badge) return;
    const stato = statoRuota(mediaFine(sessione.ruote?.[ruotaAperta]), mescolaDi(sessione, mescole));
    badge.className = `badge ${BADGE_STATO[stato]}`;
    badge.textContent = ETICHETTA_STATO[stato];
  }

  /* --- Campi -------------------------------------------------------------- */

  function suCampo(ev) {
    const el = ev.target?.closest?.('[data-campo]');
    if (!el) return;
    const percorso = el.dataset.campo;
    const valore = el.dataset.tipo === 'num' ? parseNumero(el.value) : String(el.value);
    impostaPercorso(sessione, percorso, valore);
    if (percorso === 'mescola' || percorso.startsWith('ruote.')) {
      aggiornaRuote();
      aggiornaBadgeSheet();
    }
    pianifica();
  }

  document.addEventListener('input', suCampo);
  document.addEventListener('change', suCampo);

  function suTasto(ev) {
    if (!ruotaAperta) return;
    if (ev.key === 'Escape') chiudiSheet();
    else if (ev.key === 'Tab') trappolaFuoco(ev);
  }
  document.addEventListener('keydown', suTasto);

  const salvaSubito = () => salvaOra(false);
  window.addEventListener('pagehide', salvaSubito);
  document.addEventListener('visibilitychange', salvaSubito);
  backdrop.addEventListener('click', chiudiSheet);

  /* --- Azioni ------------------------------------------------------------- */

  const aggiornaSegmented = (azione, valore) => {
    for (const b of document.querySelectorAll(`.segmented [data-azione="${azione}"]`)) {
      const attivo = b.dataset.val === valore;
      b.classList.toggle('active', attivo);
      b.setAttribute('aria-pressed', String(attivo));
    }
  };

  azioni.fondo = (el) => {
    const valore = el.dataset.val;
    if (sessione.fondo === valore) return;
    sessione.fondo = valore;
    allineaMescola();
    aggiornaSegmented('fondo', valore);
    const select = document.getElementById('f-mescola');
    if (select) select.innerHTML = opzioniMescola(mescole, sessione.fondo, sessione.mescola);
    aggiornaRuote();
    pianifica();
  };

  azioni.condizioni = (el) => {
    const valore = el.dataset.val;
    if (sessione.condizioni === valore) return;
    sessione.condizioni = valore;
    aggiornaSegmented('condizioni', valore);
    pianifica();
  };

  azioni.ruota = (el) => apriSheet(el.dataset.cod);
  azioni['vai-ruota'] = (el) => {
    salvaOra(false);
    aggiornaRuote(); // le mattonelle dietro al pannello restano allineate
    apriSheet(el.dataset.cod);
  };
  azioni['chiudi-sheet'] = () => chiudiSheet();

  azioni.degrado = (el) => {
    if (!ruotaAperta) return;
    const codice = el.dataset.cod;
    sessione.ruote[ruotaAperta].degrado = codice;
    for (const chip of sheet.querySelectorAll('#sheet-degrado .chip')) {
      chip.classList.toggle('active', chip.dataset.cod === codice);
    }
    const desc = sheet.querySelector('#sheet-degrado-desc');
    if (desc) desc.textContent = DEGRADO.find((d) => d.codice === codice)?.descrizione ?? '';
    pianifica();
  };

  azioni['copia-pressione'] = () => {
    if (!ruotaAperta) return;
    const valore = sessione.ruote[ruotaAperta].pressFredda;
    if (typeof valore !== 'number') {
      toast('Inserisci prima la pressione a freddo di questa ruota.');
      return;
    }
    for (const codice of RUOTE) sessione.ruote[codice].pressFredda = valore;
    for (const input of sheet.querySelectorAll('[data-campo$=".pressFredda"]')) input.value = valoreCampo(valore);
    daSalvare = true;
    salvaOra(false);
    aggiornaRuote();
    toast(`Pressione ${fmtNum(valore, 2)} bar copiata su tutte le ruote`);
  };

  azioni.diagnosi = () => {
    salvaOra(false);
    naviga(`#/diagnosi/${sessione.id}`);
  };

  azioni.duplica = () => {
    salvaOra(false);
    try {
      const copia = store.duplicaSessione(sessione.id);
      toast('Sessione duplicata');
      naviga(`#/sessione/${copia.id}`);
    } catch (errore) {
      toast(errore.message);
    }
  };

  azioni.elimina = () => {
    if (!confirm('Eliminare la sessione?')) return;
    try {
      store.eliminaSessione(sessione.id);
      eliminata = true;
      daSalvare = false;
      toast('Sessione eliminata');
      naviga('#/sessioni', { sostituisci: true });
    } catch (errore) {
      toast(errore.message);
    }
  };

  /* --- Smontaggio --------------------------------------------------------- */

  /**
   * "Nuova" crea subito la sessione, così la schermata ha qualcosa su cui
   * scrivere. Se però si esce senza aver scritto niente, quella riga vuota non
   * deve restare in elenco. Unica eccezione: si sta andando alla sua diagnosi.
   */
  function scartaSeIntatta() {
    if (eliminata) return;
    if (location.hash === `#/diagnosi/${sessione.id}`) return;
    if (!sessioneIntatta(sessione)) return;
    try {
      store.eliminaSessione(sessione.id);
      eliminata = true;
    } catch {
      /* se non si riesce a cancellare, la sessione vuota resta: nessun danno */
    }
  }

  return () => {
    salvaOra(false);
    scartaSeIntatta();
    clearTimeout(timerSalva);
    document.removeEventListener('input', suCampo);
    document.removeEventListener('change', suCampo);
    document.removeEventListener('keydown', suTasto);
    window.removeEventListener('pagehide', salvaSubito);
    document.removeEventListener('visibilitychange', salvaSubito);
    backdrop.remove();
    sheet.remove();
  };
}
