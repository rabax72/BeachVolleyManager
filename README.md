# Beach Volley Manager

Gioco manageriale di beach volley giocabile nel browser, ispirato a Football Manager. Gestisci un club di coppie 2 contro 2: le alleni, le iscrivi ai tornei del circuito, segui le partite punto per punto e le fai crescere stagione dopo stagione.

Funziona interamente offline dopo la build: non c'è backend e i salvataggi restano nel `localStorage` del browser.

**Gioca online:** https://rabax72.github.io/BeachVolleyManager/

## Requisiti

- Node.js 20 o superiore (sviluppato con Node 24)
- npm 10 o superiore

## Comandi

```bash
npm install        # installa le dipendenze
npm run dev        # avvia il gioco in sviluppo (http://localhost:5173)
npm run build      # typecheck (tsc -b) + build di produzione in dist/
npm run preview    # serve la build di produzione
npm test           # test Vitest (regole, motore, tornei, stagioni, salvataggi, i18n)
npm run lint       # ESLint
npm run format     # Prettier
```

La build usa percorsi relativi e il routing a hash, quindi `dist/` si può aprire da qualsiasi cartella statica.

Script di sviluppo (non fanno parte dei test):

```bash
npx tsx src/engine/dev/calibrate.ts   # bilanciamento del motore: % vittorie, ace, side-out
npx tsx src/engine/dev/economy.ts     # andamento economico su più stagioni
```

## Pubblicazione

Il workflow [.github/workflows/deploy.yml](.github/workflows/deploy.yml) esegue lint, test e build a ogni push su `main` e pubblica `dist/` su GitHub Pages (Settings → Pages → Source: **GitHub Actions**).

## Stack

Vite, React 19, TypeScript in modalità strict, Zustand, React Router (HashRouter), Tailwind CSS 4, Vitest, ESLint e Prettier, lucide-react per le icone, lz-string per comprimere i salvataggi.

## Struttura

```
src/
  engine/      logica di gioco pura e deterministica (nessun React)
  data/        dati statici: nomi, località, tornei, sponsor (tutti fittizi)
  store/       store Zustand e persistenza (slot, migrazioni, export/import)
  features/    schermate, una cartella per area funzionale
  ui/          componenti condivisi (tabelle, radar, layout, modali)
  i18n/        dizionari di traduzione e funzione t()
public/brand/  logo e icone generati (non modificare a mano)
design/        immagine originale del logo
scripts/       build-icons.py: rigenera logo e icone da design/logo.png
docs/
  GUIDA.md         guida al gioco
  ARCHITETTURA.md  note di architettura ed estensione
```

## Documentazione

- [Guida al gioco](docs/GUIDA.md)
- [Architettura e come estendere il gioco](docs/ARCHITETTURA.md) (nuove tattiche, tornei, lingue, migrazioni)

## Logo e icone

L'originale è in `design/logo.png`. Dopo averlo sostituito, rigenera le versioni ottimizzate (richiede Python con Pillow):

```bash
python scripts/build-icons.py
```

Vengono creati in `public/brand/` il logo completo con sfondo trasparente (home) e l'icona del pallone in più formati (favicon, barra laterale, icona per smartphone).

## Note

Tutti i nomi di giocatori, club, sponsor, nazionalità e località sono inventati. Le icone sono di lucide-react; gli avatar dei giocatori sono disegnati in SVG dal codice.
