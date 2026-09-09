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
const bar = (v) => v.toFixed(1).replace('.', ',');
const gradi = (v) => v.toFixed(0);

// --- degrado -----------------------------------------------------------------

const PER_CODICE = Object.fromEntries(DEGRADO.map((d) => [d.codice, d]));

// Suggerimenti della stessa ruota che il degrado osservato conferma: la loro
// intensità sale di una tacca.
const RAFFORZA = {
  spallaInt: [{ area: 'camber', titolo: /troppo/i }],
  spallaEst: [{ area: 'camber', titolo: /insufficiente/i }, { area: 'pressione', titolo: /bassa/i }],
  blistering: [{ area: 'pressione', titolo: /alta/i }],
};

const AZIONE = {
  graining: 'Provare una mescola più morbida o far lavorare di più la gomma con pressioni di partenza un po’ più alte.',
  blistering: 'Provare una mescola più dura o abbassare le pressioni di partenza.',
  spallaInt: 'Ridurre il camber negativo.',
  spallaEst: 'Aumentare il camber negativo o alzare la pressione.',
  chunking: 'Passare a una mescola più dura, più adatta a questo fondo.',
  vetrificata: 'Alzare le pressioni di partenza o scegliere una mescola più morbida.',
};

function applicaDegrado(codice, codiceDegrado, out) {
  const d = PER_CODICE[codiceDegrado];
  if (!d || d.codice === 'regolare') return;
  const bersagli = RAFFORZA[d.codice] || [];
  for (const sug of out) {
    if (sug.ambito !== codice) continue;
    if (bersagli.some((b) => b.area === sug.area && b.titolo.test(sug.titolo))) sug.intensita = alza(sug.intensita);
  }
  out.push({ ambito: codice, area: 'degrado', intensita: 'media', titolo: d.etichetta,
    testo: `${ETICHETTE_RUOTE[codice]}: ${d.descrizione} ${AZIONE[d.codice]}` });
}

// --- regole per singola ruota ------------------------------------------------

function regoleRuota(codice, r, s, out) {
  const { int, cen, est } = r.fine;
  const nome = ETICHETTE_RUOTE[codice];
  const dCamber = int - est;
  let liv = livello(Math.abs(dCamber), s.camber);
  if (liv) {
    const troppo = dCamber > 0;
    out.push({ ambito: codice, area: 'camber', intensita: liv,
      titolo: troppo ? 'Troppo camber negativo' : 'Camber insufficiente',
      testo: `${nome}: spalla ${troppo ? 'interna' : 'esterna'} più calda di ${gradi(Math.abs(dCamber))} °C. ` +
             `Conviene ${troppo ? 'ridurre' : 'aumentare'} il camber negativo.` });
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
  applicaDegrado(codice, r.degrado, out);
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
        ? `Anteriore più caldo di ${gradi(d)} °C: tendenza al sottosterzo. Ammorbidire l'anteriore o irrigidire il posteriore, oppure alzare leggermente le pressioni anteriori.`
        : `Posteriore più caldo di ${gradi(-d)} °C: tendenza al sovrasterzo. Ammorbidire il posteriore o irrigidire l'anteriore.` });
  }
  if (sx !== null && dx !== null) {
    const d = sx - dx;
    const liv = livello(Math.abs(d), s.asimmetria);
    if (liv) out.push({ ambito: d > 0 ? 'sinistra' : 'destra', area: 'asimmetria', intensita: liv,
      titolo: d > 0 ? 'Lato sinistro sovraccarico' : 'Lato destro sovraccarico',
      testo: `Il lato ${d > 0 ? 'sinistro' : 'destro'} lavora di più: ${gradi(Math.abs(d))} °C in più dell'altro lato. ` +
             `Controllare la simmetria di assetto e pressioni e la ripartizione dei pesi.` });
  }
}

// --- regole di mescola e di asfalto ------------------------------------------

const SOGLIE_MESCOLA = { leggera: 0, media: 8, forte: 15 };

function regoleMescola(sessione, mediaAuto, m, s, degradi, out) {
  let sug = null;
  if (mediaAuto < m.min) {
    sug = { ambito: 'auto', area: 'mescola', intensita: livello(m.min - mediaAuto, SOGLIE_MESCOLA),
      titolo: 'Mescola troppo dura',
      testo: `Media gomme ${gradi(mediaAuto)} °C, sotto la finestra ${m.min}-${m.max} °C di ${m.nome}. ` +
             `Provare una mescola più morbida per far salire le temperature.` };
    if (degradi.has('graining')) sug.intensita = alza(sug.intensita);
  } else if (mediaAuto > m.max) {
    sug = { ambito: 'auto', area: 'mescola', intensita: livello(mediaAuto - m.max, SOGLIE_MESCOLA),
      titolo: 'Mescola troppo morbida',
      testo: `Media gomme ${gradi(mediaAuto)} °C, sopra la finestra ${m.min}-${m.max} °C di ${m.nome}. ` +
             `Provare una mescola più dura per contenere le temperature.` };
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
    regoleRuota(codice, r, s, suggerimenti);
  }
  regoleGruppo(medie, s, suggerimenti);
  const complete = RUOTE.map((c) => medie[c]).filter(num);
  const m = mescole.find((x) => x.id === sessione.mescola);
  if (m && complete.length) {
    const mediaAuto = complete.reduce((a, b) => a + b, 0) / complete.length;
    regoleMescola(sessione, mediaAuto, m, s, degradi, suggerimenti);
  }
  return { suggerimenti, avvisi };
}
