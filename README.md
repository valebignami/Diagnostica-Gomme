# Diagnostica Gomme

App per il parco assistenza: al furgone rilevi le temperature delle quattro
gomme con il termometro, segni le pressioni e come si è consumata la
superficie, e l'app ti dice cosa cambiare nell'assetto. I suggerimenti sono in
italiano e ragionano come si ragiona al banco: spalla interna più calda del
centro vuol dire troppo camber negativo, centro più caldo delle spalle vuol
dire pressione alta, un anteriore molto più caldo del posteriore vuol dire
sottosterzo. Per ogni prova ottieni una diagnosi divisa per mescola, assali,
lati e singola ruota, con l'intensità del problema (leggera, media, forte) e
l'azione proposta.

I dati restano solo sul telefono, dentro il browser: nessun account, nessuna
registrazione, nessun invio in rete. Funziona anche senza campo, che è la
condizione normale in una piazzola di riordino. Puoi duplicare una sessione per
il passaggio successivo (ti tiene intestazione e pressioni a freddo e azzera le
temperature), mettere due prove a confronto ruota per ruota, e condividere la
diagnosi come testo su WhatsApp o dove vuoi.

## Provarla sul PC

Serve Python installato. Apri il Prompt dei comandi nella cartella del
progetto e lancia:

```
python -m http.server 8765 --directory app
```

Poi apri il browser su **http://localhost:8765**. Per chiudere il server,
premi `Ctrl+C` nella finestra dei comandi.

Per vederla come si vede sul telefono: nel browser premi `F12`, poi l'icona
del telefonino in alto a sinistra del pannello che si apre.

## Installarla sul telefono

Il telefono ha bisogno che l'app stia su un indirizzo internet in `https`, non
basta il PC. Va bene un hosting statico gratuito:

- **Netlify Drop** (il più veloce): vai su `app.netlify.com/drop` e trascina la
  cartella `app` nella pagina. In pochi secondi ti dà un indirizzo.
- **GitHub Pages**: carica il progetto su GitHub, poi in *Settings → Pages*
  scegli il ramo e la cartella `app`.

Poi, dal telefono, apri quell'indirizzo e:

- **Android (Chrome)**: menu `⋮` → *Aggiungi a schermata Home*.
- **iPhone (Safari)**: tasto condividi → *Aggiungi a schermata Home*.

Da lì in poi si apre come una qualsiasi app, a schermo intero e anche senza
rete.

## Le soglie: da validare con il collaudatore

**I valori di partenza sono indicativi.** Sono numeri generici di riferimento,
non misure prese sulle gomme in uso: vanno provati e corretti con il collaudatore
prima di darli in mano ai piloti.

Si cambiano in due punti:

- **Dall'app**, schermata *Impostazioni*: soglie di camber, pressione, salita
  di temperatura, bilanciamento e asimmetria (separate per asfalto e terra),
  più la lista delle mescole con il loro intervallo di temperatura di lavoro.
  Le modifiche valgono solo su quel telefono. Il tasto *Ripristina soglie e
  mescole* riporta tutto ai valori di fabbrica senza toccare le sessioni.
- **Nel codice**, file `app/js/config.js`: sono i valori di fabbrica, quelli
  che trova chi installa l'app la prima volta. Quando le soglie saranno
  validate, è qui che vanno scritte, così tutti partono con quelle giuste.

## Backup

I dati stanno nel browser del telefono: se svuoti i dati del browser, cambi
telefono o disinstalli l'app, spariscono. Il backup è manuale:

- *Impostazioni → Esporta backup* scarica un file `.json` con tutte le
  sessioni, le soglie e le mescole. Salvalo dove vuoi (email a te stesso, drive,
  chiavetta).
- *Impostazioni → Importa backup* ricarica quel file, anche su un altro
  telefono. L'importazione **sostituisce** i dati presenti, non li aggiunge.

Conviene esportare a fine gara.

## Test

Serve Node.js. Dalla cartella del progetto:

```
node --test app/test/
```

Verificano il motore di regole, il salvataggio dei dati e la formattazione dei
numeri. Devono essere tutti verdi prima di pubblicare una modifica.

## Com'è fatta la cartella

```
app/                 l'applicazione (è questa che si pubblica)
  index.html         la pagina, unica: le schermate si alternano dentro
  manifest.json      nome e icona per l'installazione sulla home
  sw.js              fa funzionare l'app senza rete
  icon.svg           l'icona
  css/style.css      l'aspetto
  js/
    config.js        soglie di fabbrica e mescole  ← si toccano queste
    rules.js         il motore che genera i suggerimenti
    store.js         salvataggio dei dati sul telefono
    format.js        numeri e date all'italiana
    ui.js            pezzi di interfaccia condivisi
    app.js           navigazione tra le schermate
    views/           una schermata per file (sessioni, sessione, diagnosi,
                     confronto, impostazioni)
  test/              i test automatici
docs/                specifica di progetto e piano di lavoro
```

Non usa librerie esterne né compilazione: i file che leggi sono esattamente
quelli che girano nel browser, si modificano con un editor di testo e si
ripubblicano ricaricando la cartella `app`.
