export const RUOTE = ['AS', 'AD', 'PS', 'PD'];
export const ETICHETTE_RUOTE = { AS: 'Anteriore sinistra', AD: 'Anteriore destra', PS: 'Posteriore sinistra', PD: 'Posteriore destra' };
export const DEGRADO = [
  { codice: 'regolare', etichetta: 'Usura regolare', descrizione: 'Superficie uniforme, nessun segnale.' },
  { codice: 'graining', etichetta: 'Graining', descrizione: 'Grana o filamenti: gomma sotto temperatura o mescola troppo dura.' },
  { codice: 'blistering', etichetta: 'Blistering', descrizione: 'Bolle o crateri: gomma sopra temperatura o mescola troppo morbida.' },
  { codice: 'spallaInt', etichetta: 'Spalla interna consumata', descrizione: 'Troppo camber negativo.' },
  { codice: 'spallaEst', etichetta: 'Spalla esterna consumata', descrizione: 'Camber insufficiente o pressione bassa.' },
  { codice: 'chunking', etichetta: 'Strappi / chunking', descrizione: 'Pezzi di gomma strappati: mescola troppo morbida per il fondo.' },
  { codice: 'vetrificata', etichetta: 'Vetrificata', descrizione: 'Superficie lucida: la gomma non è mai andata in temperatura.' },
];
export const MESCOLE_DEFAULT = [
  { id: 'asf-soft', nome: 'Asfalto Soft', fondo: 'asfalto', min: 75, max: 100 },
  { id: 'asf-medium', nome: 'Asfalto Medium', fondo: 'asfalto', min: 65, max: 95 },
  { id: 'asf-hard', nome: 'Asfalto Hard', fondo: 'asfalto', min: 60, max: 90 },
  { id: 'ter-soft', nome: 'Terra Soft', fondo: 'terra', min: 50, max: 80 },
  { id: 'ter-medium', nome: 'Terra Medium', fondo: 'terra', min: 45, max: 75 },
  { id: 'ter-hard', nome: 'Terra Hard', fondo: 'terra', min: 40, max: 70 },
];
export const SOGLIE_DEFAULT = {
  asfalto: {
    camber: { leggera: 5, media: 10, forte: 15 },
    pressione: { leggera: 4, media: 8, forte: 12 },
    passoPressione: { leggera: 0.1, media: 0.2, forte: 0.3 },
    salita: 25,
    bilanciamento: { leggera: 8, media: 15, forte: 22 },
    asimmetria: { leggera: 8, media: 15, forte: 22 },
    asfaltoFreddo: 15,
    asfaltoCaldo: 40,
  },
  terra: {
    camber: { leggera: 8, media: 14, forte: 20 },
    pressione: { leggera: 5, media: 10, forte: 15 },
    passoPressione: { leggera: 0.1, media: 0.15, forte: 0.2 },
    salita: 30,
    bilanciamento: { leggera: 10, media: 18, forte: 26 },
    asimmetria: { leggera: 10, media: 18, forte: 26 },
    asfaltoFreddo: 10,
    asfaltoCaldo: 35,
  },
};
