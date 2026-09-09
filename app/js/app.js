/**
 * STUB — sostituito dal Task 5.
 *
 * Registra il service worker e disegna una vetrina statica di tutti i
 * componenti del tema, solo per verificare a occhio il CSS. Il Task 5
 * riscrive questo file con il router a hash e le schermate vere.
 */

/* --- Service worker ------------------------------------------------------ */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {
      /* offline non disponibile: l'app funziona lo stesso */
    });
  });
}

/* --- Icone ---------------------------------------------------------------- */
const chevron = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 5l7 7-7 7"/></svg>`;

const iconaVuoto = `<svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
  <circle cx="32" cy="32" r="26"/><circle cx="32" cy="32" r="11"/>
  <path d="M32 6v10M32 48v10M6 32h10M48 32h10M13.6 13.6l7 7M43.4 43.4l7 7M50.4 13.6l-7 7M20.6 43.4l-7 7"/>
</svg>`;

/* Silhouette dell'auto vista dall'alto, dietro le quattro ruote. */
const silhouette = `<svg class="auto-silhouette" viewBox="0 0 100 200" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
  <path d="M50 4C40 6 34 12 32 22L28 42C20 47 16 58 16 76L16 150C16 164 18 172 24 178L26 186C28 195 36 198 50 198C64 198 72 195 74 186L76 178C82 172 84 164 84 150L84 76C84 58 80 47 72 42L68 22C66 12 60 6 50 4Z" fill="#252a34" stroke="#3a4150" stroke-width="1.6"/>
  <path d="M34 60H66L63 80H37Z" fill="#12151b"/>
  <rect x="36" y="84" width="28" height="40" rx="5" fill="#1b1f27"/>
  <path d="M37 128H63L66 148H34Z" fill="#12151b"/>
  <path d="M50 84V124" stroke="#ff3b1f" stroke-width="4" stroke-opacity=".6"/>
  <rect x="20" y="179" width="60" height="9" rx="3" fill="#1b1f27" stroke="#3a4150" stroke-width="1.6"/>
  <rect x="34" y="14" width="12" height="6" rx="3" fill="#454d5e"/>
  <rect x="54" y="14" width="12" height="6" rx="3" fill="#454d5e"/>
</svg>`;

const ruota = (codice, stato, temp, press) => `
  <button type="button" class="tyre ${stato}">
    <span class="tyre-code">${codice}</span>
    <span class="tyre-temp">${temp}<small>°</small></span>
    <span class="tyre-press">${press}</span>
  </button>`;

const diagnosi = (livello, etichetta, titolo, testo) => `
  <div class="diagnosi-item">
    <div class="diagnosi-head">
      <span class="diagnosi-titolo">${titolo}</span>
      <span class="badge badge-${livello}">${etichetta}</span>
    </div>
    <p class="diagnosi-testo">${testo}</p>
  </div>`;

/* --- Vetrina ------------------------------------------------------------- */
document.getElementById('vista').innerHTML = `
  <p class="section-title">Anteprima del tema</p>

  <!-- scheda sessione -->
  <section class="card">
    <h2 class="card-title">Rally del Ciocco <span class="badge badge-media">Media</span></h2>
    <p class="card-sub">09/09/2026 · PS3 Careggine · asfalto asciutto</p>
    <div class="card-stats">
      <div class="stat"><span class="stat-label">Aria</span><span class="stat-value">18<small>°C</small></span></div>
      <div class="stat"><span class="stat-label">Asfalto</span><span class="stat-value">31<small>°C</small></span></div>
      <div class="stat"><span class="stat-label">Mescola</span><span class="stat-value">Soft</span></div>
    </div>
    <hr class="sep">
    <div class="list">
      <div class="list-item">
        <div class="list-item-main">
          <div class="list-item-title">Camber anteriore</div>
          <div class="list-item-sub">−2,5° · differenza interna/esterna 12 °C</div>
        </div>
        <span class="list-item-chevron">${chevron}</span>
      </div>
      <div class="list-item">
        <div class="list-item-main">
          <div class="list-item-title">Pressioni a freddo</div>
          <div class="list-item-sub">1,95 / 1,95 / 1,90 / 1,90 bar</div>
        </div>
        <span class="list-item-chevron">${chevron}</span>
      </div>
    </div>
  </section>

  <!-- auto vista dall'alto -->
  <section class="card">
    <h2 class="card-title">Temperature medie</h2>
    <div class="auto">
      ${silhouette}
      ${ruota('AS', 'tyre-calda', '104', '2,05 bar')}
      ${ruota('AD', 'tyre-ok', '86', '2,05 bar')}
      ${ruota('PS', 'tyre-fredda', '62', '1,90 bar')}
      ${ruota('PD', 'tyre-vuota', '–', 'da rilevare')}
    </div>
    <div class="auto-legenda">
      <span style="color:var(--cold)"><i></i>Fredda</span>
      <span style="color:var(--ok)"><i></i>In range</span>
      <span style="color:var(--forte)"><i></i>Calda</span>
      <span><i></i>Senza dati</span>
    </div>
  </section>

  <!-- diagnosi -->
  <section class="card">
    <h2 class="card-title">Diagnosi</h2>
    ${diagnosi('forte', 'Forte', 'Anteriore sinistra sopra temperatura', 'Media 104 °C, oltre il range della mescola. Alza la pressione a freddo di 0,15 bar o passa a una mescola più dura.')}
    ${diagnosi('media', 'Media', 'Camber anteriore eccessivo', 'La spalla interna è più calda di 14 °C rispetto alla esterna: riduci il camber negativo di mezzo grado.')}
    ${diagnosi('leggera', 'Leggera', 'Assale posteriore freddo', 'Il posteriore lavora 20 °C sotto l’anteriore: valuta una pressione più bassa dietro.')}
    ${diagnosi('ok', 'Ok', 'Anteriore destra in finestra', 'Temperature e degrado regolari, nessuna correzione necessaria.')}
  </section>

  <!-- campi -->
  <section class="card">
    <h2 class="card-title">Dati della sessione</h2>
    <div class="field-row">
      <div class="field">
        <label for="d-aria">Temp. aria (°C)</label>
        <input id="d-aria" type="number" inputmode="decimal" value="18">
      </div>
      <div class="field">
        <label for="d-asfalto">Temp. asfalto (°C)</label>
        <input id="d-asfalto" type="number" inputmode="decimal" value="31">
      </div>
    </div>
    <div class="field">
      <label for="d-mescola">Mescola</label>
      <select id="d-mescola">
        <option>Asfalto Soft · 75–100 °C</option>
        <option>Asfalto Medium · 65–95 °C</option>
      </select>
    </div>
    <div class="field">
      <label>Fondo</label>
      <div class="segmented">
        <button type="button" class="active">Asfalto</button>
        <button type="button">Terra</button>
      </div>
    </div>
    <div class="field">
      <label>Condizioni</label>
      <div class="chips">
        <button type="button" class="chip active">Asciutto</button>
        <button type="button" class="chip">Umido</button>
        <button type="button" class="chip">Bagnato</button>
      </div>
    </div>
  </section>

  <!-- griglia temperature -->
  <section class="card">
    <h2 class="card-title">Ruota AS <span class="badge badge-forte">Calda</span></h2>
    <div class="temps-grid">
      <span></span>
      <span class="temps-head">Interna</span>
      <span class="temps-head">Centro</span>
      <span class="temps-head">Esterna</span>
      <span class="temps-label">Inizio</span>
      <input type="number" inputmode="decimal" value="98">
      <input type="number" inputmode="decimal" value="92">
      <input type="number" inputmode="decimal" value="88">
      <span class="temps-label">Fine</span>
      <input type="number" inputmode="decimal" value="112">
      <input type="number" inputmode="decimal" value="104">
      <input type="number" inputmode="decimal" value="98">
    </div>
    <p class="field-hint">Tre punti per terna: interna, centro, esterna.</p>
  </section>

  <!-- tasti -->
  <section class="card">
    <h2 class="card-title">Azioni</h2>
    <button type="button" class="btn btn-primary btn-block" id="apri-sheet">Apri pannello ruota</button>
    <div class="btn-row">
      <button type="button" class="btn btn-ghost" id="mostra-toast">Condividi</button>
      <button type="button" class="btn btn-danger">Elimina</button>
    </div>
  </section>

  <!-- stato vuoto -->
  <p class="section-title">Stato vuoto</p>
  <div class="empty">
    ${iconaVuoto}
    <p class="empty-title">Nessuna sessione</p>
    <p class="empty-sub">Tocca il tasto + per registrare la prima prova del weekend.</p>
  </div>
`;

/* --- Pannello dal basso e toast ------------------------------------------ */
const backdrop = document.createElement('div');
backdrop.className = 'sheet-backdrop';

const sheet = document.createElement('div');
sheet.className = 'sheet';
sheet.innerHTML = `
  <div class="sheet-handle"></div>
  <h2 class="sheet-title">Anteriore sinistra <span class="badge badge-forte">Calda</span></h2>
  <div class="field-row">
    <div class="field">
      <label for="s-fredda">Freddo (bar)</label>
      <input id="s-fredda" type="text" inputmode="decimal" value="1,95">
    </div>
    <div class="field">
      <label for="s-calda">Caldo (bar)</label>
      <input id="s-calda" type="text" inputmode="decimal" value="2,05">
    </div>
  </div>
  <div class="field">
    <label for="s-degrado">Degrado</label>
    <select id="s-degrado">
      <option>Usura regolare</option>
      <option selected>Blistering</option>
    </select>
  </div>
  <button type="button" class="btn btn-primary btn-block" id="chiudi-sheet">Salva ruota</button>
`;
document.body.append(backdrop, sheet);

const apri = () => { backdrop.classList.add('open'); sheet.classList.add('open'); };
const chiudi = () => { backdrop.classList.remove('open'); sheet.classList.remove('open'); };
document.getElementById('apri-sheet').addEventListener('click', apri);
document.getElementById('chiudi-sheet').addEventListener('click', chiudi);
backdrop.addEventListener('click', chiudi);

const toast = document.getElementById('toast');
let timerToast;
document.getElementById('mostra-toast').addEventListener('click', () => {
  toast.textContent = 'Diagnosi copiata negli appunti';
  toast.classList.add('show');
  clearTimeout(timerToast);
  timerToast = setTimeout(() => toast.classList.remove('show'), 2600);
});

/* --- Tab attiva ----------------------------------------------------------- */
function segnaTab() {
  const rotta = (location.hash || '#/sessioni').slice(2).split('/')[0];
  for (const a of document.querySelectorAll('.tabbar a')) {
    a.classList.toggle('active', a.dataset.tab === rotta);
  }
}
window.addEventListener('hashchange', segnaTab);
segnaTab();
