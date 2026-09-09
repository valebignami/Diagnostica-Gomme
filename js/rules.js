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

function regoleRuota(codice, r, s, out) {
  const { int, cen, est } = r.fine;
  const nome = ETICHETTE_RUOTE[codice];
  const dCamber = int - est;
  let liv = livello(Math.abs(dCamber), s.camber);
  if (liv) {
    const troppo = dCamber > 0;
    out.push({ ambito: codice, area: 'camber', intensita: liv,
      titolo: troppo ? 'Troppo camber negativo' : 'Camber insufficiente',
      testo: `${nome}: spalla ${troppo ? 'interna' : 'esterna'} più calda di ${Math.abs(dCamber).toFixed(0)} °C. ` +
             `Conviene ${troppo ? 'ridurre' : 'aumentare'} il camber negativo.` });
  }
  const dPress = cen - (int + est) / 2;
  liv = livello(Math.abs(dPress), s.pressione);
  if (liv) {
    const alta = dPress > 0;
    out.push({ ambito: codice, area: 'pressione', intensita: liv,
      titolo: alta ? 'Pressione alta' : 'Pressione bassa',
      testo: `${nome}: centro ${alta ? 'più caldo' : 'più freddo'} delle spalle di ${Math.abs(dPress).toFixed(0)} °C. ` +
             `${alta ? 'Abbassare' : 'Alzare'} la pressione di circa ${bar(s.passoPressione[liv])} bar.` });
  }
}

export function diagnosi(sessione, soglie = SOGLIE_DEFAULT, mescole = MESCOLE_DEFAULT) {
  const s = soglie[sessione.fondo] || soglie.asfalto;
  const suggerimenti = [];
  const avvisi = [];
  for (const codice of RUOTE) {
    const r = sessione.ruote?.[codice];
    if (!completa(r)) { avvisi.push(`${ETICHETTE_RUOTE[codice]}: mancano le temperature di fine prova.`); continue; }
    regoleRuota(codice, r, s, suggerimenti);
  }
  return { suggerimenti, avvisi };
}
