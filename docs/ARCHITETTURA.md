# Architettura

## Principi

1. **Il motore è puro.** `src/engine` non importa React né lo store. Ogni funzione pubblica riceve uno stato e ne restituisce uno nuovo. Le funzioni con suffisso `...Mut` mutano una bozza e si usano solo dentro `produce()` (in `season.ts`), che lavora su un `structuredClone`.
2. **Il gioco è deterministico.** Tutta la casualità passa da `rng.ts` (mulberry32). I seed si derivano con `hashSeed(seedPartita, contesto…)`, ad esempio `hashSeed(seed, season, matchId)` per una partita. A parità di seed e di comandi (cambi tattici, timeout) il risultato è identico; i test lo verificano.
3. **Lo stato è serializzabile.** `GameState` (in `types.ts`) è solo JSON. Anche lo stato di una partita in corso (`MatchState`) contiene lo stato del RNG, quindi si può mettere in pausa e riprendere.
4. **Il motore produce chiavi, non testi.** Notizie ed eventi contengono una chiave i18n e dei parametri; la UI li traduce (`ui/text.ts`, `features/match/commentary.ts`).

## Moduli del motore

| File | Responsabilità |
|---|---|
| `rng.ts` | RNG con seed, helper (`int`, `pick`, `weighted`, `normal`, `shuffle`) |
| `types.ts` | Tipi di dominio e `GameState` |
| `scoring.ts` | Regole: set a 21/21/15, scarto di 2, cambio campo ogni 7/5, set point |
| `match.ts` | Simulazione rally per rally, tattiche, timeout, AI in partita, statistiche |
| `matchSetup.ts` | Da coppia e giocatori all'input del motore partita |
| `player.ts` | Valutazione, sinergia, chimica, stipendi, valore di mercato |
| `generation.ts` | Generazione procedurale di giocatori e staff |
| `newGame.ts` | Creazione del mondo e della carriera |
| `pairs.ts` | Formazione e scioglimento delle coppie, riaccoppiamento AI |
| `tournament.ts` | Gironi, classifiche, tabellone, piazzamenti |
| `calendar.ts` | Calendario stagionale |
| `ranking.ts` | Punti e classifiche |
| `training.ts` | Allenamento, progressione, invecchiamento, fatica, infortuni |
| `finance.ts` | Transazioni, sponsor, obiettivi |
| `market.ts` | Trattative, indennizzi, scouting |
| `events.ts` | Eventi casuali narrati |
| `season.ts` | Iscrizioni, sorteggi, settimana, fine stagione (`advanceWeek`) |
| `actions.ts` | Azioni del manager invocate dalla UI |

### Il rally

`playRallyMut` in `match.ts` esegue, in ordine:

1. **Servizio**: probabilità di errore e di ace in base a rischio, vento e differenza tra potenza del servizio e abilità in ricezione.
2. **Ricezione**: produce una qualità da 0 a 1.
3. **Alzata**: produce una qualità; c'è una piccola probabilità di errore.
4. **Attacco**: possibile errore; poi muro (stile a zona o a lettura), poi difesa.
5. **Transizione**: se la palla viene difesa, attacca l'altra squadra partendo dalla qualità della difesa, e si riparte dal punto 3.

Ogni valore usato nel rally passa da `eff()`, che combina attributo, energia, morale, forma, chimica × sinergia, inerzia, pressione (mentalità), sole, sabbia e una varianza che diminuisce con la costanza.

Le pendenze delle curve logistiche sono raccolte in `BALANCE`. Il test statistico in `__tests__/match.test.ts` verifica che una coppia nettamente superiore vinca tra il 75% e il 95% di 1000 partite.

### La settimana (`advanceWeek`)

1. `finishWeekMut`: completa i tornei, applica allenamento e infortuni, finanze, eventi e avvisi.
2. Se la settimana è l'ultima della stagione, `endSeasonMut`: ranking, sponsor, dirigenza, invecchiamento, ritiri, contratti, nuovi talenti, pulizia dei dati.
3. `startWeekMut`: riaccoppia le coppie AI e sorteggia i tornei. Prima entrano le iscrizioni del manager, poi le coppie AI scelte per ranking e fatica.

## Store e UI

- `store/gameStore.ts` (Zustand) contiene `game`, la partita in diretta `live`, le impostazioni e i salvataggi. `update(fn)` applica una funzione pura del motore. Il salvataggio automatico avviene dopo ogni settimana e dopo ogni partita giocata in diretta.
- `store/persistence.ts` gestisce gli slot in `localStorage` (compressi con lz-string), l'indice dei salvataggi, l'export/import JSON e le migrazioni.
- `features/*` contiene una schermata per area; `ui/*` i componenti condivisi (`DataTable` ordinabile e paginata, `Radar` SVG, `Modal`, `Meter`, `ErrorBoundary`).

## Come estendere

### Aggiungere una tattica

1. Aggiungi il campo o il nuovo valore in `Tactics` (`engine/types.ts`).
2. Usalo nel motore (`match.ts`): ad esempio una nuova voce in `SERVE_RISK`/`ATTACK_RISK`, oppure una correzione dentro `attackSequence` o `playRallyMut`.
3. Aggiorna `DEFAULT_TACTICS` e `autoTactics` (le scelte dell'AI).
4. Aggiungi l'opzione in `features/match/TacticsForm.tsx` (`FIELDS`) e le etichette in `i18n/it.ts` (`tactics.options.*` e `tactics.help.*`).
5. Se il campo è nuovo, aggiungi una migrazione (vedi sotto), perché i salvataggi esistenti non lo hanno in `state.tactics`.
6. Verifica il bilanciamento con `npx tsx src/engine/dev/calibrate.ts` e `npm test`.

### Aggiungere tornei o livelli

- **Località**: aggiungi una voce in `VENUES` (`data/world.ts`), con profilo di vento, sole, temperatura, sabbia e distanza.
- **Calendario**: `EVENT_WEEKS` associa a ogni settimana i due livelli di torneo in programma.
- **Nuovo livello**: estendi `Tier` e `TIERS` (`types.ts`), poi `TIER_INFO`, `TIER_POINT_SCALE` (`data/world.ts`), `tierOrder` (`calendar.ts`) e le chiavi `tier.*`/`tierDesc.*` in i18n.
- **Formato diverso**: `tournament.ts` è indipendente dal resto e ha i suoi test. Un nuovo formato richiede nuove fasi (`TournamentPhase`) e la gestione corrispondente in `advancePhase`.

### Aggiungere una lingua

1. Crea `src/i18n/en.ts` con la stessa struttura di `it.ts`.
2. Registrala in `DICTIONARIES` e `LANGUAGES` (`src/i18n/index.ts`). Le chiavi mancanti ricadono sull'italiano.
3. Il test `i18n.test.ts` controlla che tutte le chiavi letterali usate nel codice esistano.

### Cambiare il formato dei salvataggi

1. Incrementa `SAVE_VERSION` in `engine/newGame.ts`.
2. Aggiungi in `MIGRATIONS` (`store/persistence.ts`) la funzione che porta un salvataggio dalla versione precedente alla nuova.
3. Aggiungi un test in `store/persistence.test.ts`.

## Test

| File | Cosa verifica |
|---|---|
| `scoring.test.ts` | Regole di punteggio e cambio campo |
| `match.test.ts` | Determinismo, regole nei set simulati, rotazione del servizio, timeout, tattiche, effetto del vento, test statistici su 1000 partite |
| `tournament.test.ts` | Gironi, classifiche, tabellone, piazzamenti |
| `season.test.ts` | Generazione del mondo (almeno 120 giocatori), progressione e invecchiamento, iscrizioni, stagione completa con controllo dei tempi, determinismo, 10 stagioni consecutive, azioni del manager |
| `persistence.test.ts` | Compressione, export/import, ripresa identica, migrazione v1→v2 |
| `i18n.test.ts` | Copertura delle chiavi di traduzione |
