import { RUOTE, ETICHETTE_RUOTE, DEGRADO, MESCOLE_DEFAULT, SOGLIE_DEFAULT } from './config.js';

export function livello(valore, soglie) {
  if (valore >= soglie.forte) return 'forte';
  if (valore >= soglie.media) return 'media';
  if (valore >= soglie.leggera) return 'leggera';
  return null;
}

const ORDINE = ['leggera', 'media', 'forte'];
const alza = (i) => ORDINE[Math.min(ORDINE.indexOf(i) + 1, 2)];
const num = (v) => typeof v === 'number' && Number.isFinite(v);
const completa = (r) => r && r.fine && num(r.fine.int) && num(r.fine.cen) && num(r.fine.est);
const media3 = (t) => (t.int + t.cen + t.est) / 3;
// Due decimali, senza zeri finali inutili: 0,15 resta 0,15 e 0,20 diventa 0,2.
const bar = (v) => v.toFixed(2).replace(/0+$/, '').replace(/\.$/, '').replace('.', ',');
const gradi = (v) => v.toFixed(0);
// "i 5 °C" ma "gli 8 °C": in italiano l'articolo cambia davanti ai numeri che
// si leggono con una vocale iniziale (otto, undici, ottanta e i suoi).
const articolo = (n) => (/^(8|11|8\d)$/.test(n) ? 'gli' : 'i');

// --- degrado -----------------------------------------------------------------

const PER_CODICE = Object.fromEntries(DEGRADO.map((d) => [d.codice, d]));

// Suggerimenti della stessa ruota che il degrado osservato conferma: la loro
// intensità sale di una tacca.
const RAFFORZA = {
  spallaInt: [{ area: 'camber', titolo: /troppo/i }],
  spallaEst: [{ area: 'camber', titolo: /insufficiente/i }, { area: 'pressione', titolo: /bassa/i }],
  blistering: [{ area: 'pressione', titolo: /alta/i }],
};

/**
 * Convenzione su tutta l'app: una pressione di partenza più bassa lascia
 * flettere di più la carcassa, quindi la gomma scalda di più; una pressione
 * più alta la fa lavorare meno e scaldare meno.
 */
const AZIONE = {
  graining: 'Provare una mescola più morbida, oppure abbassare le pressioni di partenza di 0,1-0,2 bar per farla scaldare di più.',
  blistering: 'Provare una mescola più dura. Se il centro del battistrada è la zona più calda la pressione è troppo alta e va abbassata; altrimenti alzarla di 0,1-0,2 bar per far lavorare meno la gomma.',
  spallaInt: 'Ridurre il camber negativo.',
  spallaEst: 'Aumentare il camber negativo o alzare la pressione.',
  chunking: 'Passare a una mescola più dura, più adatta a questo fondo.',
  vetrificata: 'Abbassare le pressioni di partenza o scegliere una mescola più morbida.',
};

/** Sul fondo sterrato gli strappi pesano di più: la mescola è chiaramente sbagliata. */
const intensitaDegrado = (codice, fondo) =>
  (codice === 'chunking' ? (fondo === 'terra' ? 'forte' : 'media') : 'media');

function applicaDegrado(codice, codiceDegrado, fondo, out) {
  const d = PER_CODICE[codiceDegrado];
  if (!d || d.codice === 'regolare') return;
  const bersagli = RAFFORZA[d.codice] || [];
  for (const sug of out) {
    if (sug.ambito !== codice) continue;
    if (bersagli.some((b) => b.area === sug.area && b.titolo.test(sug.titolo))) sug.intensita = alza(sug.intensita);
  }
  out.push({ ambito: codice, area: 'degrado', intensita: intensitaDegrado(d.codice, fondo), titolo: d.etichetta,
    testo: `${ETICHETTE_RUOTE[codice]}: ${d.descrizione} ${AZIONE[d.codice]}` });
}

// --- regole per singola ruota ------------------------------------------------

function regoleRuota(codice, r, s, fondo, out) {
  const { int, cen, est } = r.fine;
  const nome = ETICHETTE_RUOTE[codice];
  // Con il camber statico giusto la spalla interna finisce la prova più calda
  // dell'esterna: il riferimento non è lo zero, è `camberTarget`.
  const dCamber = int - est;
  const atteso = num(s.camberTarget) ? s.camberTarget : 0;
  const scarto = dCamber - atteso;
  let liv = livello(Math.abs(scarto), s.camber);
  if (liv) {
    const troppo = scarto > 0;
    const lato = dCamber >= 0 ? 'interna' : 'esterna';
    const teso = gradi(atteso);
    out.push({ ambito: codice, area: 'camber', intensita: liv,
      titolo: troppo ? 'Troppo camber negativo' : 'Camber insufficiente',
      testo: `${nome}: spalla ${lato} più calda di ${gradi(Math.abs(dCamber))} °C, ` +
             `contro ${articolo(teso)} ${teso} °C attesi: ${troppo ? 'ridurre' : 'aumentare'} il camber negativo.` });
  }
  const dPress = cen - (int + est) / 2;
  liv = livello(Math.abs(dPress), s.pressione);
  if (liv) {
    const alta = dPress > 0;
    out.push({ ambito: codice, area: 'pressione', intensita: liv,
      titolo: alta ? 'Pressione alta' : 'Pressione bassa',
      testo: `${nome}: centro ${alta ? 'più caldo' : 'più freddo'} delle spalle di ${gradi(Math.abs(dPress))} °C. ` +
             `${alta ? 'Abbassare' : 'Alzare'} la pressione di circa ${bar(s.passoPressione[liv])} bar.` });
  }
  if (r.inizio && num(r.inizio.int) && num(r.inizio.cen) && num(r.inizio.est)) {
    const salita = media3(r.fine) - media3(r.inizio);
    if (salita >= s.salita) {
      out.push({ ambito: codice, area: 'pressione', intensita: 'media', titolo: 'Salita di temperatura eccessiva',
        testo: `${nome}: +${gradi(salita)} °C tra inizio e fine prova. ` +
               `La gomma lavora troppo: verificare pressione di partenza e mescola.` });
    }
  }
  applicaDegrado(codice, r.degrado, fondo, out);
}

// --- regole di assale e di lato ----------------------------------------------

function regoleGruppo(medie, s, out) {
  const gruppo = (a, b) => (num(medie[a]) && num(medie[b])) ? (medie[a] + medie[b]) / 2 : null;
  const ant = gruppo('AS', 'AD'), post = gruppo('PS', 'PD'), sx = gruppo('AS', 'PS'), dx = gruppo('AD', 'PD');
  if (ant !== null && post !== null) {
    const d = ant - post;
    const liv = livello(Math.abs(d), s.bilanciamento);
    if (liv) out.push({ ambito: d > 0 ? 'anteriore' : 'posteriore', area: 'bilanciamento', intensita: liv,
      titolo: d > 0 ? 'Anteriore sovraccarico' : 'Posteriore sovraccarico',
      testo: d > 0
        ? `Anteriore più caldo di ${gradi(d)} °C: tendenza al sottosterzo. Ammorbidire l'anteriore o irrigidire il posteriore.`
        : `Posteriore più caldo di ${gradi(-d)} °C: tendenza al sovrasterzo. Ammorbidire il posteriore o irrigidire l'anteriore.` });
  }
  if (sx !== null && dx !== null) {
    const d = sx - dx;
    const liv = livello(Math.abs(d), s.asimmetria);
    if (liv) out.push({ ambito: d > 0 ? 'sinistra' : 'destra', area: 'asimmetria', intensita: liv,
      titolo: d > 0 ? 'Lato sinistro sovraccarico' : 'Lato destro sovraccarico',
      testo: `Il lato ${d > 0 ? 'sinistro' : 'destro'} lavora di più: ${gradi(Math.abs(d))} °C in più dell'altro lato. ` +
             `È tipico di percorsi con curve prevalenti in un verso; se il percorso era equilibrato, ` +
             `controllare la simmetria di assetto e pressioni e la ripartizione dei pesi.` });
  }
}

// --- regole di mescola e di asfalto ------------------------------------------

const SOGLIE_MESCOLA = { leggera: 0, media: 8, forte: 15 };

/**
 * La mescola dello stesso fondo la cui finestra contiene già la media misurata,
 * così il suggerimento può fare un nome invece di dire solo "più morbida".
 * A parità vince quella con il centro finestra più vicino alla media.
 */
function mescolaCheContiene(mediaAuto, m, mescole) {
  const centro = (x) => (x.min + x.max) / 2;
  return (Array.isArray(mescole) ? mescole : [])
    .filter((x) => x && x.id !== m.id && x.fondo === m.fondo && num(x.min) && num(x.max) &&
                   mediaAuto >= x.min && mediaAuto <= x.max && typeof x.nome === 'string' && x.nome !== '')
    .sort((a, b) => Math.abs(centro(a) - mediaAuto) - Math.abs(centro(b) - mediaAuto))[0] ?? null;
}

function regoleMescola(sessione, mediaAuto, m, s, degradi, out, mescole) {
  let sug = null;
  const dentro = mescolaCheContiene(mediaAuto, m, mescole);
  const nominata = (generico) =>
    (dentro ? `A ${gradi(mediaAuto)} °C rientri nella finestra di ${dentro.nome}.` : generico);
  if (mediaAuto < m.min) {
    sug = { ambito: 'auto', area: 'mescola', intensita: livello(m.min - mediaAuto, SOGLIE_MESCOLA),
      titolo: 'Mescola troppo dura',
      testo: `Media gomme ${gradi(mediaAuto)} °C, sotto la finestra ${m.min}-${m.max} °C di ${m.nome}. ` +
             nominata('Provare una mescola più morbida per far salire le temperature.') };
    if (degradi.has('graining')) sug.intensita = alza(sug.intensita);
  } else if (mediaAuto > m.max) {
    sug = { ambito: 'auto', area: 'mescola', intensita: livello(mediaAuto - m.max, SOGLIE_MESCOLA),
      titolo: 'Mescola troppo morbida',
      testo: `Media gomme ${gradi(mediaAuto)} °C, sopra la finestra ${m.min}-${m.max} °C di ${m.nome}. ` +
             nominata('Provare una mescola più dura per contenere le temperature.') };
    if (degradi.has('blistering')) sug.intensita = alza(sug.intensita);
  }
  if (sug) out.push(sug);

  if (!num(sessione.tempAsfalto)) return;
  if (sessione.tempAsfalto < s.asfaltoFreddo && mediaAuto < m.min) {
    out.push({ ambito: 'auto', area: 'mescola', intensita: 'media', titolo: 'Asfalto freddo',
      testo: `Con asfalto a ${gradi(sessione.tempAsfalto)} °C la gomma fatica ad entrare in temperatura: ` +
             `partire con pressioni più basse di 0,1-0,2 bar o usare una mescola più morbida.` });
  } else if (sessione.tempAsfalto > s.asfaltoCaldo && mediaAuto > m.max) {
    out.push({ ambito: 'auto', area: 'mescola', intensita: 'media', titolo: 'Asfalto caldo',
      testo: `Con asfalto a ${gradi(sessione.tempAsfalto)} °C la gomma va facilmente sopra temperatura: ` +
             `partire con pressioni più alte di 0,1-0,2 bar o usare una mescola più dura.` });
  }
}

// --- diagnosi ----------------------------------------------------------------

export function diagnosi(sessione, soglie = SOGLIE_DEFAULT, mescole = MESCOLE_DEFAULT) {
  const s = soglie[sessione.fondo] || soglie.asfalto;
  const suggerimenti = [];
  const avvisi = [];
  const medie = {};
  const degradi = new Set();
  for (const codice of RUOTE) {
    const r = sessione.ruote?.[codice];
    if (!completa(r)) { avvisi.push(`${ETICHETTE_RUOTE[codice]}: mancano le temperature di fine prova.`); continue; }
    medie[codice] = media3(r.fine);
    if (r.degrado) degradi.add(r.degrado);
    regoleRuota(codice, r, s, sessione.fondo, suggerimenti);
  }
  regoleGruppo(medie, s, suggerimenti);
  const complete = RUOTE.map((c) => medie[c]).filter(num);
  const m = mescole.find((x) => x.id === sessione.mescola) ?? null;
  if (!m) {
    // Senza finestra di lavoro non si puo dire se la gomma e fredda o calda:
    // meglio dirlo che restituire una diagnosi tutta verde.
    avvisi.push('Mescola non trovata: controlla le impostazioni. Regole su mescola e asfalto saltate.');
  } else if (complete.length) {
    const mediaAuto = complete.reduce((a, b) => a + b, 0) / complete.length;
    regoleMescola(sessione, mediaAuto, m, s, degradi, suggerimenti, mescole);
  }
  if (!num(sessione.tempAsfalto)) avvisi.push('Temperatura asfalto mancante: regole su asfalto saltate.');
  return { suggerimenti, avvisi };
}
