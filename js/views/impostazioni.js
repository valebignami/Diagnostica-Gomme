/**
 * Schermata 5 — Impostazioni.
 *
 * Tre cose, nell'ordine in cui servono: le soglie che il motore usa per
 * decidere quando parlare (diverse per asfalto e terra), la finestra di
 * lavoro delle mescole, e il backup dei dati. Le soglie di fabbrica sono
 * indicative: qui si adattano alla macchina e al collaudatore.
 *
 * Come nella schermata di sessione, ogni modifica si salva da sola 300 ms
 * dopo l'ultima digitazione. Un valore non numerico non entra mai
 * nell'oggetto delle soglie: al massimo torna quello di prima.
 */

import { SOGLIE_DEFAULT } from '../config.js';
import { fmtNum } from '../format.js';
import { nuovoId, oggi } from '../store.js';
import {
  escapeHtml, parseNumero, impostaPercorso, leggiPercorso,
  FONDI, ICONA_CESTINO,
} from '../ui.js';

const VERSIONE_APP = '1.0';

/* --- Gruppi di soglie ----------------------------------------------------- */

const TRIS = [['leggera', 'Leggera'], ['media', 'Media'], ['forte', 'Forte']];

/**
 * Ogni gruppo diventa una card. `tris` significa i tre livelli di intensità
 * (e quindi il controllo leggera ≤ media ≤ forte); altrimenti i campi sono
 * elencati a mano con il loro percorso dentro le soglie del fondo.
 */
const GRUPPI = [
  {
    chiave: 'camber', titolo: 'Camber', unita: '°C', dec: 0, tris: true,
    spiegazione: 'Quanti gradi di differenza fra spalla interna ed esterna servono prima di suggerire una correzione di camber.',
  },
  {
    chiave: 'pressione', titolo: 'Pressione', unita: '°C', dec: 0, tris: true,
    spiegazione: 'Scarto fra il centro del battistrada e la media delle spalle che segnala pressione alta o bassa.',
  },
  {
    chiave: 'passoPressione', titolo: 'Passo pressione', unita: 'bar', dec: 2, tris: true,
    spiegazione: 'Di quanto correggere la pressione a freddo per ogni livello di intensità.',
  },
  {
    chiave: 'salita', titolo: 'Salita di temperatura', unita: '°C', dec: 0,
    campi: [['salita', 'Soglia']],
    spiegazione: 'Aumento di temperatura fra inizio e fine prova oltre il quale la gomma sta lavorando troppo.',
  },
  {
    chiave: 'bilanciamento', titolo: 'Bilanciamento', unita: '°C', dec: 0, tris: true,
    spiegazione: 'Differenza di temperatura fra assale anteriore e posteriore: sottosterzo o sovrasterzo.',
  },
  {
    chiave: 'asimmetria', titolo: 'Asimmetria', unita: '°C', dec: 0, tris: true,
    spiegazione: 'Differenza di temperatura fra lato sinistro e lato destro della macchina.',
  },
  {
    chiave: 'asfalto', titolo: 'Asfalto', unita: '°C', dec: 0,
    campi: [['asfaltoFreddo', 'Freddo'], ['asfaltoCaldo', 'Caldo']],
    spiegazione: 'Sotto la soglia fredda o sopra quella calda il motore suggerisce di rivedere mescola e pressioni di partenza.',
  },
];

/** Percorsi ed etichette dei campi di un gruppo. */
const campiDi = (g) =>
  (g.tris ? TRIS.map(([k, et]) => [`${g.chiave}.${k}`, et]) : g.campi);

const NOTA_ORDINE = 'Le soglie dovrebbero crescere: leggera ≤ media ≤ forte';

/**
 * Soglie che misurano uno scarto: zero o meno non vuol dire niente (farebbe
 * scattare il suggerimento sempre). Le temperature dell'asfalto invece possono
 * benissimo essere zero o sotto zero.
 */
const SOGLIE_POSITIVE = new Set(['camber', 'pressione', 'passoPressione', 'bilanciamento', 'asimmetria', 'salita']);
const vuolePositivo = (percorso) => SOGLIE_POSITIVE.has(String(percorso).split('.')[0]);

/** Nota da mostrare sotto un gruppo a tre livelli, vuota se l'ordine è giusto. */
function notaOrdine(soglieFondo, g) {
  if (!g.tris) return '';
  const v = TRIS.map(([k]) => leggiPercorso(soglieFondo, `${g.chiave}.${k}`));
  if (!v.every((x) => typeof x === 'number' && Number.isFinite(x))) return '';
  return v[0] <= v[1] && v[1] <= v[2] ? '' : NOTA_ORDINE;
}

/* --- Frammenti di markup -------------------------------------------------- */

const idCampo = (fondo, percorso) => `sg-${fondo}-${percorso.replace(/\./g, '-')}`;

/** Valore da mettere in un campo: virgola come separatore, o campo vuoto. */
const mostraValore = (v, dec = 0) =>
  (typeof v === 'number' && Number.isFinite(v) ? fmtNum(v, dec) : '');

function campoSoglia(fondo, soglieFondo, g, [percorso, etichetta]) {
  const id = idCampo(fondo, percorso);
  const valore = leggiPercorso(soglieFondo, percorso);
  return `
    <div class="field">
      <label for="${id}">${escapeHtml(etichetta)} (${escapeHtml(g.unita)})</label>
      <input id="${id}" type="text" inputmode="decimal" autocomplete="off"
             data-soglia="${escapeHtml(percorso)}" data-dec="${g.dec}"
             value="${escapeHtml(mostraValore(valore, g.dec))}">
    </div>`;
}

function cardGruppo(fondo, soglieFondo, g) {
  const campi = campiDi(g).map((c) => campoSoglia(fondo, soglieFondo, g, c)).join('');
  const nota = notaOrdine(soglieFondo, g);
  return `
    <section class="card">
      <h2 class="card-title">${escapeHtml(g.titolo)}</h2>
      <p class="card-sub">${escapeHtml(g.spiegazione)}</p>
      <div class="soglie-riga">${campi}</div>
      ${g.tris ? `<p class="field-hint nota-ordine" id="nota-${g.chiave}">${escapeHtml(nota)}</p>` : ''}
    </section>`;
}

function rigaMescola(m) {
  const base = `me-${m.id}`;
  return `
    <div class="mescola" data-riga="${escapeHtml(m.id)}">
      <div class="mescola-top">
        <div class="field">
          <label for="${escapeHtml(base)}-nome">Nome</label>
          <input id="${escapeHtml(base)}-nome" type="text" autocomplete="off"
                 data-mescola="${escapeHtml(m.id)}" data-campo="nome"
                 value="${escapeHtml(m.nome ?? '')}">
        </div>
        <button type="button" class="icon-btn" data-azione="elimina-mescola" data-id="${escapeHtml(m.id)}"
                aria-label="Elimina la mescola ${escapeHtml(m.nome ?? '')}">${ICONA_CESTINO}</button>
      </div>
      <div class="mescola-campi">
        <div class="field">
          <label for="${escapeHtml(base)}-fondo">Fondo</label>
          <select id="${escapeHtml(base)}-fondo" data-mescola="${escapeHtml(m.id)}" data-campo="fondo">
            ${FONDI.map((f) => `<option value="${f.valore}"${f.valore === m.fondo ? ' selected' : ''}>${escapeHtml(f.etichetta)}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label for="${escapeHtml(base)}-min">Min (°C)</label>
          <input id="${escapeHtml(base)}-min" type="text" inputmode="decimal" autocomplete="off"
                 data-mescola="${escapeHtml(m.id)}" data-campo="min" data-dec="0"
                 value="${escapeHtml(mostraValore(m.min))}">
        </div>
        <div class="field">
          <label for="${escapeHtml(base)}-max">Max (°C)</label>
          <input id="${escapeHtml(base)}-max" type="text" inputmode="decimal" autocomplete="off"
                 data-mescola="${escapeHtml(m.id)}" data-campo="max" data-dec="0"
                 value="${escapeHtml(mostraValore(m.max))}">
        </div>
      </div>
    </div>`;
}

/* --- Vista ---------------------------------------------------------------- */

/** Fondo mostrato nelle soglie, ricordato fra una visita e l'altra. */
let fondoAttivo = 'asfalto';

export function render(ctx) {
  const { store, azioni, toast } = ctx;

  let soglie = store.getSoglie();
  let mescole = store.getMescole();
  if (!FONDI.some((f) => f.valore === fondoAttivo)) fondoAttivo = 'asfalto';

  /**
   * Le soglie del fondo mostrato. Un backup a cui manca del tutto un fondo non
   * deve lasciare la schermata senza campi: si riparte dai valori di fabbrica.
   */
  function soglieDelFondo() {
    const s = soglie[fondoAttivo];
    if (s && typeof s === 'object') return s;
    soglie[fondoAttivo] = structuredClone(SOGLIE_DEFAULT[fondoAttivo] ?? SOGLIE_DEFAULT.asfalto);
    return soglie[fondoAttivo];
  }

  let vivo = true;
  const daSalvare = { soglie: false, mescole: false };
  let timerSalva = null;
  let ultimoToast = 0;
  /** Timer e URL temporanei dell'esportazione, da ripulire allo smontaggio. */
  const timers = new Set();
  const urlTemporanei = new Set();

  const avvisa = (messaggio) => { if (vivo) toast(messaggio); };

  /* --- Salvataggio automatico -------------------------------------------- */

  function salvaOra(conToast = true) {
    clearTimeout(timerSalva);
    timerSalva = null;
    if (!daSalvare.soglie && !daSalvare.mescole) return;
    try {
      if (daSalvare.soglie) { store.setSoglie(soglie); daSalvare.soglie = false; }
      if (daSalvare.mescole) { store.setMescole(mescole); daSalvare.mescole = false; }
    } catch (errore) {
      toast(errore.message);
      return;
    }
    if (conToast && Date.now() - ultimoToast > 2400) {
      ultimoToast = Date.now();
      toast('Salvato');
    }
  }

  function pianifica(cosa) {
    daSalvare[cosa] = true;
    clearTimeout(timerSalva);
    timerSalva = setTimeout(() => salvaOra(true), 300);
  }

  /* --- Disegno ------------------------------------------------------------ */

  const htmlSoglie = () =>
    GRUPPI.map((g) => cardGruppo(fondoAttivo, soglieDelFondo(), g)).join('');

  const htmlMescole = () =>
    (mescole.length === 0
      ? '<p class="field-hint">Nessuna mescola: aggiungine almeno una per fondo.</p>'
      : mescole.map(rigaMescola).join(''));

  function htmlVista() {
    return `
    <section class="card">
      <h2 class="card-title">Soglie del motore</h2>
      <p class="card-sub">Quanto deve essere grande uno scarto prima che la diagnosi lo segnali. Valori separati per fondo.</p>
      <div class="segmented" role="group" aria-label="Fondo delle soglie">
        ${FONDI.map((f) => `<button type="button" class="${f.valore === fondoAttivo ? 'active' : ''}"
          data-azione="fondo" data-val="${f.valore}" aria-pressed="${f.valore === fondoAttivo}">${escapeHtml(f.etichetta)}</button>`).join('')}
      </div>
    </section>

    <div id="soglie-corpo">${htmlSoglie()}</div>

    <section class="card">
      <h2 class="card-title">Mescole</h2>
      <p class="card-sub">Finestra di lavoro di ogni mescola: sotto il minimo la gomma è fredda, sopra il massimo è calda.</p>
      <div class="mescole" id="mescole-corpo">${htmlMescole()}</div>
      <button type="button" class="btn btn-ghost btn-block" data-azione="aggiungi-mescola">Aggiungi mescola</button>
    </section>

    <section class="card">
      <h2 class="card-title">Dati</h2>
      <p class="card-sub">Il backup contiene sessioni, soglie e mescole in un unico file JSON.</p>
      <button type="button" class="btn btn-ghost btn-block" data-azione="esporta">Esporta backup</button>
      <button type="button" class="btn btn-ghost btn-block" data-azione="importa">Importa backup</button>
      <button type="button" class="btn btn-danger btn-block" data-azione="ripristina">Ripristina soglie e mescole</button>
    </section>

    <section class="card">
      <h2 class="card-title">Informazioni</h2>
      <p class="card-sub">Diagnostica Gomme · versione ${escapeHtml(VERSIONE_APP)}</p>
      <p class="field-hint">Le soglie iniziali sono indicative: adattale con il collaudatore.</p>
      <p class="field-hint">I dati restano solo su questo dispositivo, dentro il browser: nessun account e nessun invio in rete. Per portarli altrove usa "Esporta backup".</p>
    </section>`;
  }

  function disegna() {
    ctx.render(htmlVista());
  }

  const disegnaSoglie = () => {
    const el = document.getElementById('soglie-corpo');
    if (el) el.innerHTML = htmlSoglie();
  };

  const disegnaMescole = () => {
    const el = document.getElementById('mescole-corpo');
    if (el) el.innerHTML = htmlMescole();
  };

  /** Rilegge tutto dallo store: dopo un'importazione o un ripristino. */
  function ricarica() {
    clearTimeout(timerSalva);
    timerSalva = null;
    daSalvare.soglie = false;
    daSalvare.mescole = false;
    soglie = store.getSoglie();
    mescole = store.getMescole();
    disegna();
  }

  disegna();

  /* --- Campi delle soglie ------------------------------------------------- */

  function aggiornaNota(percorso) {
    const chiave = String(percorso).split('.')[0];
    const g = GRUPPI.find((x) => x.chiave === chiave);
    if (!g?.tris) return;
    const el = document.getElementById(`nota-${chiave}`);
    if (el) el.textContent = notaOrdine(soglieDelFondo(), g);
  }

  const mescolaDiId = (id) => mescole.find((m) => m.id === id) ?? null;

  function suInput(ev) {
    const soglia = ev.target?.closest?.('[data-soglia]');
    if (soglia) {
      const numero = parseNumero(soglia.value);
      if (numero === null) return; // valore incompleto: non si scrive niente
      if (vuolePositivo(soglia.dataset.soglia) && numero <= 0) return;
      impostaPercorso(soglieDelFondo(), soglia.dataset.soglia, numero);
      aggiornaNota(soglia.dataset.soglia);
      pianifica('soglie');
      return;
    }

    const campo = ev.target?.closest?.('[data-mescola]');
    if (!campo) return;
    const m = mescolaDiId(campo.dataset.mescola);
    if (!m) return;
    const nome = campo.dataset.campo;

    if (nome === 'nome') {
      m.nome = String(campo.value);
      pianifica('mescole');
      return;
    }
    if (nome === 'fondo') {
      const prossimo = campo.value;
      if (prossimo === m.fondo) return;
      // La stessa regola dell'eliminazione: nessun fondo può restare scoperto.
      if (mescole.filter((x) => x.fondo === m.fondo).length <= 1) {
        campo.value = m.fondo;
        toast('Serve almeno una mescola per fondo');
        return;
      }
      m.fondo = prossimo;
      pianifica('mescole');
      return;
    }
    const numero = parseNumero(campo.value);
    if (numero === null) return;
    // Finestra rovesciata: non si scrive, così il valore di prima resta
    // recuperabile all'uscita dal campo.
    if (finestraRovesciata(m, nome, numero)) return;
    m[nome] = numero;
    pianifica('mescole');
  }

  /** Vera se scrivere `numero` in `nome` (min o max) rovescerebbe la finestra. */
  function finestraRovesciata(m, nome, numero) {
    const min = nome === 'min' ? numero : m.min;
    const max = nome === 'max' ? numero : m.max;
    return typeof min === 'number' && typeof max === 'number' && min >= max;
  }

  /**
   * All'uscita dal campo: un valore non numerico non entra nei dati, si
   * rimette quello salvato. Un valore buono viene arrotondato ai decimali del
   * campo, così quello che si legge è esattamente quello che è stato scritto.
   */
  function suFocusout(ev) {
    const soglia = ev.target?.closest?.('[data-soglia]');
    if (soglia) {
      const dec = Number(soglia.dataset.dec) || 0;
      const percorso = soglia.dataset.soglia;
      const numero = parseNumero(soglia.value);
      if (numero === null || (vuolePositivo(percorso) && numero <= 0)) {
        toast('Valore non valido');
      } else {
        const arrotondato = Number(numero.toFixed(dec));
        if (arrotondato !== leggiPercorso(soglieDelFondo(), percorso)) {
          impostaPercorso(soglieDelFondo(), percorso, arrotondato);
          aggiornaNota(percorso);
          pianifica('soglie');
        }
      }
      soglia.value = mostraValore(leggiPercorso(soglieDelFondo(), percorso), dec);
      return;
    }

    const campo = ev.target?.closest?.('[data-mescola]');
    if (!campo || (campo.dataset.campo !== 'min' && campo.dataset.campo !== 'max')) return;
    const m = mescolaDiId(campo.dataset.mescola);
    if (!m) return;
    const nome = campo.dataset.campo;
    const numero = parseNumero(campo.value);
    if (numero === null) {
      toast('Valore non valido');
    } else if (finestraRovesciata(m, nome, Math.round(numero))) {
      toast('Il minimo deve essere sotto il massimo');
    } else if (Math.round(numero) !== m[nome]) {
      m[nome] = Math.round(numero);
      pianifica('mescole');
    }
    campo.value = mostraValore(m[nome]);
  }

  document.addEventListener('input', suInput);
  document.addEventListener('change', suInput);
  document.addEventListener('focusout', suFocusout);

  const salvaSubito = () => salvaOra(false);
  window.addEventListener('pagehide', salvaSubito);
  document.addEventListener('visibilitychange', salvaSubito);

  /* --- Importazione ------------------------------------------------------- */

  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = 'application/json,.json';
  fileInput.hidden = true;
  document.body.append(fileInput);

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    let testo;
    try {
      testo = await file.text();
    } catch {
      fileInput.value = '';
      avvisa('Impossibile leggere il file');
      return;
    }
    fileInput.value = '';
    if (!vivo) return;
    if (!confirm('Sostituire tutti i dati con il backup?')) return;
    let esito;
    try {
      esito = store.importa(testo);
    } catch (errore) {
      avvisa(errore.message);
      return;
    }
    ricarica();
    const scartate = esito.scartate > 0 ? `, ${esito.scartate} scartate` : '';
    avvisa(`Backup importato: ${esito.importate} session${esito.importate === 1 ? 'e' : 'i'}${scartate}`);
  });

  /* --- Azioni ------------------------------------------------------------- */

  azioni.fondo = (el) => {
    const valore = el.dataset.val;
    if (valore === fondoAttivo) return;
    fondoAttivo = valore;
    for (const b of document.querySelectorAll('.segmented [data-azione="fondo"]')) {
      const attivo = b.dataset.val === valore;
      b.classList.toggle('active', attivo);
      b.setAttribute('aria-pressed', String(attivo));
    }
    disegnaSoglie();
  };

  azioni['aggiungi-mescola'] = () => {
    mescole.push({
      id: nuovoId(),
      nome: 'Nuova mescola',
      fondo: fondoAttivo,
      min: 60,
      max: 90,
    });
    daSalvare.mescole = true;
    salvaOra(false);
    disegnaMescole();
    toast('Mescola aggiunta');
  };

  azioni['elimina-mescola'] = (el) => {
    const m = mescolaDiId(el.dataset.id);
    if (!m) return;
    if (mescole.filter((x) => x.fondo === m.fondo).length <= 1) {
      toast('Serve almeno una mescola per fondo');
      return;
    }
    const usi = store.elencaSessioni().filter((s) => s.mescola === m.id).length;
    const quante = usi === 1 ? '1 sessione la usa' : `${usi} sessioni la usano`;
    const avvertenza = usi > 0
      ? ` ${quante}: quelle sessioni resteranno senza finestra di lavoro.`
      : '';
    if (!confirm(`Eliminare la mescola "${m.nome}"?${avvertenza}`)) return;
    mescole = mescole.filter((x) => x.id !== m.id);
    daSalvare.mescole = true;
    salvaOra(false);
    disegnaMescole();
    toast('Mescola eliminata');
  };

  azioni.esporta = () => {
    salvaOra(false);
    let url;
    try {
      url = URL.createObjectURL(new Blob([store.esporta()], { type: 'application/json' }));
    } catch {
      toast('Esportazione non riuscita');
      return;
    }
    urlTemporanei.add(url);
    const a = document.createElement('a');
    a.href = url;
    a.download = `diagnostica-gomme-${oggi()}.json`;
    document.body.append(a);
    a.click();
    a.remove();
    // Revoca ritardata: alcuni browser leggono il Blob dopo il click.
    const t = setTimeout(() => {
      timers.delete(t);
      urlTemporanei.delete(url);
      URL.revokeObjectURL(url);
    }, 60000);
    timers.add(t);
    toast('Backup esportato');
  };

  azioni.importa = () => {
    salvaOra(false);
    fileInput.click();
  };

  azioni.ripristina = () => {
    if (!confirm('Ripristinare soglie e mescole ai valori di fabbrica? Le sessioni restano.')) return;
    try {
      store.ripristinaDefault();
    } catch (errore) {
      toast(errore.message);
      return;
    }
    ricarica();
    toast('Soglie e mescole ripristinate');
  };

  /* --- Smontaggio --------------------------------------------------------- */

  return () => {
    vivo = false;
    salvaOra(false);
    clearTimeout(timerSalva);
    for (const t of timers) clearTimeout(t);
    timers.clear();
    for (const url of urlTemporanei) URL.revokeObjectURL(url);
    urlTemporanei.clear();
    document.removeEventListener('input', suInput);
    document.removeEventListener('change', suInput);
    document.removeEventListener('focusout', suFocusout);
    window.removeEventListener('pagehide', salvaSubito);
    document.removeEventListener('visibilitychange', salvaSubito);
    fileInput.remove();
  };
}
