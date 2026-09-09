# Diagnostica Gomme

App per il parco assistenza: al furgone rilevi le temperature delle quattro
gomme con il termometro, segni le pressioni e come si è consumata la
superficie, e l'app ti dice cosa cambiare nell'assetto. I suggerimenti sono in
italiano e ragionano come si ragiona al banco: la spalla interna più calda
dell'**esterna** oltre la differenza attesa vuol dire troppo camber negativo,
il centro più caldo delle spalle vuol dire pressione alta, un anteriore molto
più caldo del posteriore vuol dire sottosterzo. Per ogni prova ottieni una
diagnosi divisa per mescola, assali, lati e singola ruota, con l'intensità del
problema (leggera, media, forte) e l'azione proposta.

Sul camber il riferimento non è lo zero: con il camber statico giusto la
spalla interna finisce la prova più calda dell'esterna, di partenza di 8 °C su
asfalto e 4 °C su terra. Il motore segnala lo scarto da quel valore, non la
differenza in sé; la differenza attesa si cambia in *Impostazioni → Camber*.

Sulle pressioni la convenzione è una sola, in tutta l'app: **pressione di
partenza più bassa = la gomma scalda di più** (la carcassa flette di più),
pressione più alta = la gomma lavora e scalda di meno.

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
basta il PC. Va bene un hosting statico gratuito.

**Netlify Drop, il modo più semplice.** Vai su `app.netlify.com/drop` e trascina
dentro la pagina la cartella `app`. In pochi secondi ti dà un indirizzo
`https`, senza registrarti e senza altri passaggi. È la strada consigliata.

**GitHub Pages**, se preferisci tenere tutto su GitHub. Attenzione: Pages non
sa pubblicare una sottocartella qualsiasi, può servire solo la radice del
repository oppure una cartella che si chiama esattamente `docs`. Quindi scegli
una delle due:

- copia il **contenuto** di `app` (non la cartella: i file che ci sono dentro)
  nella radice del repository, e in *Settings → Pages* scegli il ramo e
  `/ (root)`;
- oppure copia lo stesso contenuto in una cartella `docs`, e in
  *Settings → Pages* scegli il ramo e `/docs`.

Poi, dal telefono, apri quell'indirizzo e:

- **Android (Chrome)**: menu `⋮` → *Aggiungi a schermata Home*.
- **iPhone (Safari)**: tasto condividi → *Aggiungi a schermata Home*.

Da lì in poi si apre come una qualsiasi app, a schermo intero e anche senza
rete.

## Quando pubblichi una modifica

L'app tiene una copia di sé stessa sul telefono per funzionare senza rete.
Finché quella copia ha lo stesso nome, il telefono continua a usarla e le
modifiche non si vedono. Perciò, **ogni volta che pubblichi**, apri il file
`app/sw.js` e cambia la stringa nella riga in cima:

```
const VERSIONE = 'gomme-2026-09-09-1';
```

L'unica cosa che conta è che risulti **diversa dalla volta prima**: metti la
data del giorno (per esempio `gomme-2026-10-14-1`) e, se pubblichi una seconda
volta nello stesso giorno, alza il numero finale (`-2`, `-3`, …). Ripubblica: al
primo avvio con un po' di rete i telefoni scaricano i file nuovi.

La stessa stringa va copiata in `app/js/views/impostazioni.js` (riga
`const VERSIONE_CACHE = …`), che la mostra nella schermata Impostazioni: così,
al telefono, si vede quale copia sta usando un pilota.

La stessa stringa va scritta anche in `app/js/views/impostazioni.js`, nella
costante `VERSIONE_CACHE` in cima al file: è quella che la schermata
*Impostazioni → Informazioni* mostra come "copia offline", così dal telefono
si vede quale versione sta girando. Le due righe si cambiano insieme: sono
l'unica cosa da ricordarsi a ogni pubblicazione.

## Le soglie: da validare con il collaudatore

**I valori di partenza sono indicativi.** Sono numeri generici di riferimento,
non misure prese sulle gomme in uso: vanno provati e corretti con il collaudatore
prima di darli in mano ai piloti.

Si cambiano in due punti:

- **Dall'app**, schermata *Impostazioni*: soglie di camber (compresa la
  differenza attesa fra spalla interna ed esterna), pressione, salita di
  temperatura, bilanciamento e asimmetria (separate per asfalto e terra),
  più la lista delle mescole con il loro intervallo di temperatura di lavoro.
  Le finestre delle mescole crescono con la durezza: la morbida lavora più
  fredda e va sopra temperatura prima, la dura ha bisogno di più calore.
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
  chiavetta). Su iPhone, se il telefono lo permette, apre direttamente il menu
  di condivisione; se il download non riesce, l'app mostra il backup come testo
  con un tasto *Copia negli appunti*, così i dati si portano via lo stesso.
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
  sw.js              fa funzionare l'app senza rete  ← la stringa in cima si
                     cambia a ogni pubblicazione
  icon.svg           l'icona
  icon-180.png       l'icona per la home di iPhone
  icon-192.png       le icone per l'installazione su Android
  icon-512.png
  css/style.css      l'aspetto
  fonts/             i caratteri, ospitati qui dentro: nessuna richiesta in rete
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
