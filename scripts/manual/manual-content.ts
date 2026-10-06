/**
 * Contenuto HTML del manuale di gioco (stampato in PDF da build-manual.ts).
 * Valori numerici e testi delle opzioni vengono dal codice del gioco, così il manuale resta allineato.
 */
import {
  EVENT_WEEKS,
  PLACEMENT_POINTS,
  PRIZE_SHARE,
  SEASON_WEEKS,
  TIER_INFO,
  TIER_POINT_SCALE,
  TOUR_END_WEEK,
  TOUR_START_WEEK,
} from '../../src/data/world';
import { NATIONALITIES } from '../../src/data/names';
import {
  MAX_SPONSORS,
  NEGATIVE_CUT_WEEKS,
  NEGATIVE_FIRED_WEEKS,
  NEGATIVE_WARNING_WEEKS,
  STARTING_BALANCE,
} from '../../src/engine/finance';
import {
  MAX_CONTRACT_YEARS,
  MAX_REFUSALS,
  MAX_ROSTER,
  SCOUT_COST,
  YOUTH_SEARCH_COST,
} from '../../src/engine/market';
import { TIERS, type Tier } from '../../src/engine/types';
import { it } from '../../src/i18n/it';

const eur = (n: number): string =>
  new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n);
const tierName = (t: Tier): string => it.tier[t];

type Img = (name: string) => string;

const figure = (img: Img, name: string, caption: string): string =>
  `<figure><img src="${img(name)}" alt="${caption}"><figcaption>${caption}</figcaption></figure>`;

const table = (head: string[], rows: (string | number)[][], cls = ''): string =>
  `<table class="${cls}"><thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows
    .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`)
    .join('')}</tbody></table>`;

const tip = (text: string): string => `<div class="tip"><strong>Consiglio.</strong> ${text}</div>`;

const CHAPTERS: { id: string; title: string; body: (img: Img) => string }[] = [
  {
    id: 'intro',
    title: 'Introduzione',
    body: (img) => `
<p><strong>Beach Volley Manager</strong> è un gioco manageriale ambientato nel mondo del beach volley. Guidi un club di coppie (si gioca 2 contro 2): le formi, le alleni, le iscrivi ai tornei del circuito e le accompagni stagione dopo stagione, dai tornei locali fino all'Elite Tour.</p>
<p>Il gioco si usa nel browser, non richiede installazione e funziona anche offline. I salvataggi restano nel browser del dispositivo; con l'esportazione in JSON puoi spostare la carriera altrove.</p>
${figure(img, 'home', 'Il menu principale: nuova carriera, importazione di un salvataggio, tutorial e caricamento delle partite salvate.')}
<p>Tutti i giocatori, i club, gli sponsor, le nazionalità e le località sono di fantasia. Le nazionalità del gioco sono: ${NATIONALITIES.map((n) => n.name).join(', ')}.</p>
<h3>Come è organizzato questo manuale</h3>
<p>I capitoli seguono il percorso di una carriera: dalla creazione del club alla gestione settimanale, dai tornei alla partita in diretta, fino alla fine della stagione. Le tabelle riportano i valori usati dal gioco. Per un'introduzione rapida è disponibile anche il <em>Tutorial</em> all'interno del gioco (capitolo 13).</p>`,
  },
  {
    id: 'start',
    title: 'Iniziare una carriera',
    body: (img) => `
<p>Dal menu principale scegli <em>Nuova carriera</em> e compila il modulo.</p>
${figure(img, 'newgame', 'La creazione di una nuova carriera.')}
${table(
  ['Campo', 'Significato'],
  [
    ['Nome del manager e del club', "Compaiono nell'intestazione e nelle notizie."],
    [
      'Circuito',
      'Maschile, femminile o misto. Nel misto gestisci una coppia maschile e una femminile.',
    ],
    [
      'Difficoltà',
      'Influisce su budget iniziale, forza della rosa, contributi della dirigenza e trattative.',
    ],
    ['Seed', 'Facoltativo. Lo stesso seed genera lo stesso mondo e gli stessi risultati.'],
  ],
)}
${table(
  ['Difficoltà', 'Budget iniziale', 'Note'],
  [
    [it.difficulty.easy, eur(STARTING_BALANCE.easy), it.newGame.difficultyHelp.easy],
    [it.difficulty.normal, eur(STARTING_BALANCE.normal), it.newGame.difficultyHelp.normal],
    [it.difficulty.hard, eur(STARTING_BALANCE.hard), it.newGame.difficultyHelp.hard],
  ],
)}
<p>Si parte con due coppie (una per genere nel circuito misto), un giovane promettente senza partner e uno staff essenziale. Il gioco salva automaticamente a ogni settimana.</p>`,
  },
  {
    id: 'ui',
    title: "L'interfaccia e la Dashboard",
    body: (img) => `
<p>A sinistra c'è il menu delle sezioni; in alto il nome del club, la stagione, la settimana, il saldo e il pulsante <em>Avanza settimana</em>. Su tablet il menu si apre con il pulsante in alto a sinistra.</p>
${figure(img, 'dashboard', 'La Dashboard: tornei della settimana, prossimi eventi, avvisi, finanze, coppie e notizie.')}
${table(
  ['Sezione', 'A cosa serve'],
  [
    ['Dashboard', 'Riepilogo della settimana, avvisi e notizie.'],
    [
      'Rosa',
      'Elenco dei tuoi giocatori e di tutti i giocatori del circuito, con filtri e ordinamento.',
    ],
    ['Coppie', 'Formare e sciogliere coppie, impostare la tattica predefinita.'],
    ['Allenamento', 'Piani settimanali per ogni giocatore.'],
    ['Staff', 'Allenatore, preparatore, fisioterapista, analista video.'],
    ['Calendario', 'Tornei della stagione e iscrizioni.'],
    ['Partita', 'La partita in diretta in corso.'],
    ['Mercato', 'Ricerca giocatori, scouting, offerte e rinnovi.'],
    ['Finanze', 'Saldo, sponsor, obiettivi e movimenti.'],
    ['Ranking', "Classifiche individuali e d'ingresso delle coppie."],
    ['Storico', "Albo d'oro, classifiche passate, storia del club."],
    ['Tutorial', 'Le lezioni introduttive, consultabili in ogni momento.'],
    ['Impostazioni', 'Salvataggi, esportazione e importazione, lingua, velocità delle partite.'],
  ],
)}
<p>Gli <strong>avvisi</strong> segnalano ciò che richiede attenzione: infortuni, contratti in scadenza, fatica e morale, giocatori senza coppia, sponsor da firmare, ruoli scoperti nello staff, bilancio in rosso. Ogni avviso porta alla pagina giusta.</p>`,
  },
  {
    id: 'season',
    title: 'La settimana e la stagione',
    body: (img) => `
<p>Il tempo avanza di una settimana alla volta. Una stagione dura <strong>${SEASON_WEEKS} settimane</strong>:</p>
${table(
  ['Settimane', 'Periodo', 'Cosa succede'],
  [
    [`1–${TOUR_START_WEEK - 1}`, 'Precampionato', 'Sponsor, mercato, allenamento.'],
    [
      `${TOUR_START_WEEK}–${TOUR_END_WEEK}`,
      'Circuito',
      `${Object.keys(EVENT_WEEKS).length} settimane con due tornei paralleli per genere.`,
    ],
    [
      `${TOUR_END_WEEK + 1}–${SEASON_WEEKS}`,
      'Pausa invernale',
      'Stagione indoor: solo allenamento.',
    ],
  ],
)}
<p>Premendo <em>Avanza settimana</em> il gioco:</p>
<ol>
<li>completa i tornei della settimana, simulando le partite non ancora giocate;</li>
<li>applica allenamento, recupero, crescita e infortuni;</li>
<li>paga stipendi e staff e incassa gli sponsor;</li>
<li>può generare un evento casuale (una polemica in coppia, un'influenza, un'intervista, una donazione…);</li>
<li>passa alla settimana successiva e sorteggia i nuovi tornei.</li>
</ol>
${figure(img, 'calendar', 'Il calendario: per ogni torneo livello, montepremi, costi, condizioni previste e iscrizioni.')}
${tip('Prima di avanzare controlla gli avvisi e le iscrizioni delle settimane successive.')}`,
  },
  {
    id: 'players',
    title: 'Giocatori',
    body: (img) => `
<p>Ogni giocatore ha <strong>12 attributi</strong> su una scala da 1 a 20. La valutazione complessiva (VAL) pesa gli attributi in base al ruolo.</p>
${table(
  ['Gruppo', 'Attributi'],
  [
    [
      'Tecnici',
      [
        it.attr.serve,
        it.attr.reception,
        it.attr.setting,
        it.attr.attack,
        it.attr.block,
        it.attr.defense,
      ].join(', '),
    ],
    ['Fisici', [it.attr.stamina, it.attr.speed, it.attr.jump].join(', ')],
    ['Mentali', [it.attr.reading, it.attr.mentality, it.attr.consistency].join(', ')],
  ],
)}
<p><strong>Ruoli.</strong> Il <em>bloccatore</em> gioca a rete: contano muro, attacco e salto. Il <em>difensore</em> copre il campo: contano ricezione, difesa, alzata e velocità.</p>
<p><strong>Stato.</strong> <em>Morale</em>, <em>forma</em> e <em>fatica</em> cambiano ogni settimana e influiscono sul rendimento in partita. La fatica cresce con le partite e l'allenamento intenso, cala con il riposo.</p>
<p><strong>Attributi nascosti.</strong> Potenziale, propensione agli infortuni, carattere e ambizione. Per i tuoi giocatori il potenziale è noto; per gli altri è una stima che lo scouting rende più precisa.</p>
${figure(img, 'squad', 'La rosa: attributi principali, morale, forma, fatica, stipendio e contratto. Le colonne sono ordinabili.')}
${figure(img, 'player', 'La scheda di un giocatore, con grafico radar degli attributi, profilo, stato e carriera.')}
<p><strong>Avatar.</strong> Ogni giocatore ha un ritratto in stile cartoon. L'espressione segue il morale (dal sorriso al broncio) e un cerotto indica un infortunio.</p>`,
  },
  {
    id: 'pairs',
    title: 'Coppie, chimica e sinergia',
    body: (img) => `
<p>Ai tornei partecipano le coppie. Nella pagina <em>Coppie</em> puoi formarne di nuove tra i giocatori senza partner, scioglierle e impostarne la tattica predefinita.</p>
${figure(img, 'pairs', "La gestione delle coppie con chimica, sinergia, ranking d'ingresso e tattica predefinita.")}
<ul>
<li><strong>Sinergia</strong>: dipende dalla complementarità dei ruoli (bloccatore + difensore è l'ideale) e dalla compatibilità di carattere.</li>
<li><strong>Chimica</strong>: cresce con le partite giocate insieme e migliora il gioco della coppia.</li>
<li>Sciogliere una coppia fa calare il morale e annulla le iscrizioni future (con rimborso della quota). Se due ex compagni tornano insieme recuperano parte della chimica.</li>
<li>Un giocatore senza coppia non partecipa ai tornei.</li>
</ul>`,
  },
  {
    id: 'tournaments',
    title: 'Tornei e ranking',
    body: (img) => `
<p>Il circuito ha quattro livelli. In ogni settimana di gare si giocano due tornei paralleli per genere.</p>
${table(
  ['Livello', 'Accesso', 'Montepremi', 'Iscrizione', 'Punti al vincitore'],
  [...TIERS]
    .reverse()
    .map((t) => [
      tierName(t),
      TIER_INFO[t].minRankEntry
        ? `prime ${TIER_INFO[t].minRankEntry} coppie del ranking d'ingresso`
        : 'libero',
      eur(TIER_INFO[t].prizePool),
      eur(TIER_INFO[t].entryFee),
      Math.round(PLACEMENT_POINTS[1] * TIER_POINT_SCALE[t]),
    ]),
)}
<p><strong>Iscrizioni.</strong> Dal calendario, solo per le settimane future. Ogni coppia gioca al massimo un torneo a settimana. La quota si paga all'iscrizione, il viaggio nella settimana del torneo. Se una coppia si infortuna o viene sciolta, l'iscrizione è annullata e la quota rimborsata.</p>
<p><strong>Formato.</strong> 16 coppie divise in 4 gironi da 4 (tutti contro tutti). Le prime due di ogni girone vanno ai quarti, poi semifinali e finale. Le teste di serie sono assegnate in base al ranking d'ingresso.</p>
${figure(img, 'tournament', 'Il tabellone di un torneo: gironi con classifica e risultati, poi la fase a eliminazione diretta.')}
${table(
  ['Piazzamento', 'Punti (Elite Tour)', 'Quota del montepremi'],
  Object.keys(PLACEMENT_POINTS)
    .map(Number)
    .sort((a, b) => a - b)
    .map((p) => [
      it.tournament.placement[p as keyof typeof it.tournament.placement],
      PLACEMENT_POINTS[p],
      `${Math.round(PRIZE_SHARE[p] * 100)}%`,
    ]),
)}
<p>Negli altri livelli i punti sono scalati: Challenger ${TIER_POINT_SCALE.challenger * 100}%, Nazionale ${TIER_POINT_SCALE.national * 100}%, Open ${TIER_POINT_SCALE.open * 100}%.</p>
<p><strong>Ranking.</strong> Ogni giocatore accumula punti nella stagione. Il <em>ranking d'ingresso</em> di una coppia somma i punti dei due giocatori: quelli della stagione in corso più metà di quelli della precedente. Decide l'accesso ai Challenger e all'Elite Tour.</p>
${figure(img, 'ranking', "Il ranking: classifica individuale, ranking d'ingresso delle coppie e migliori della stagione.")}`,
  },
  {
    id: 'match',
    title: 'La partita',
    body: (img) => `
<p>Ogni punto è simulato nel dettaglio: servizio, ricezione, alzata, attacco, muro e difesa, con eventuali scambi prolungati. Contano gli attributi, la fatica, il morale, la chimica, le condizioni e la tattica.</p>
<h3>Regole</h3>
<ul>
<li>Al meglio dei 3 set: i primi due a 21 punti, il terzo a 15, sempre con almeno 2 punti di scarto.</li>
<li>Cambio di campo ogni 7 punti (ogni 5 nel terzo set).</li>
<li>Nessuna sostituzione: la rotazione riguarda solo l'ordine al servizio.</li>
<li>Un timeout per set per squadra.</li>
</ul>
${figure(img, 'match', 'La partita in diretta: punteggio, chi è al servizio, controlli e campo di gioco; più in basso telecronaca, tattica, energia e statistiche.')}
<h3>Controlli</h3>
<p>Dal tabellone del torneo premi <em>Gioca in diretta</em>. Puoi avviare e mettere in pausa, avanzare di un punto, scegliere la velocità (lenta, normale, veloce, istantanea) o simulare fino alla fine. Con <em>Solo punti salienti</em> la telecronaca mostra solo i momenti chiave. A fine partita registri il risultato e torni al tabellone. In alternativa <em>Simula la fase</em> fa giocare in automatico tutte le partite della fase.</p>
<h3>Il campo</h3>
<p>Sotto i controlli il campo, visto dall'alto, mostra i quattro giocatori con i loro avatar (in blu il tuo club, in rosso gli avversari) e la palla che ripercorre l'ultimo scambio: battuta, ricezione, alzata, attacco, muro e difesa, con l'ombra che ne indica l'altezza. Il giocatore che tocca la palla è evidenziato e sotto il campo una didascalia descrive l'azione; a fine scambio compare l'esito (ace, muro punto, attacco fuori…) nella metà campo di chi fa il punto.</p>
${figure(img, 'court', 'Il campo durante uno scambio: il muratore a rete, il difensore in fondo e la palla in volo.')}
<ul>
<li>Le squadre cambiano lato a ogni cambio campo; se c'è sole, è disegnato nell'angolo del campo.</li>
<li>La velocità regola anche l'animazione; con <em>Istantanea</em> il campo mostra subito la posizione finale. Con <em>Avvia</em> il punto successivo parte quando l'animazione è finita.</li>
<li><em>Rivedi il punto</em> ripete l'ultimo scambio; <em>Mostra campo</em> nasconde o mostra il campo, e la scelta viene ricordata.</li>
</ul>
<h3>Tattiche</h3>
${table(
  ['Opzione', 'Scelte', 'Effetto'],
  (['serveRisk', 'serveTarget', 'blockStyle', 'attackRisk', 'energy'] as const).map((k) => [
    it.tactics[k],
    Object.values(it.tactics.options[k]).join(', '),
    it.tactics.help[k],
  ]),
)}
<p>Il <strong>timeout</strong> interrompe l'inerzia degli avversari e fa recuperare un po' di energia ai tuoi giocatori.</p>
<h3>Condizioni</h3>
${table(
  ['Condizione', 'Effetto'],
  [
    ['Vento', 'Aumenta gli errori al servizio e in attacco, soprattutto con servizi aggressivi.'],
    ['Sole', 'Chi ha il sole di fronte riceve e difende peggio; si alterna a ogni cambio campo.'],
    ['Temperatura', "Con il caldo l'energia cala più in fretta."],
    [
      'Sabbia',
      'La sabbia morbida stanca di più e frena salto e velocità; quella compatta li favorisce.',
    ],
  ],
)}
<p>Le statistiche finali riportano ace, errori al servizio, percentuale di ricezione positiva, attacchi vincenti, muri, difese ed errori non forzati, per squadra e per giocatore.</p>`,
  },
  {
    id: 'training',
    title: 'Allenamento e staff',
    body: (img) => `
<p>Per ogni giocatore scegli un <strong>focus</strong> e un'<strong>intensità</strong>. Nelle settimane di torneo il carico è ridotto automaticamente.</p>
${figure(img, 'training', 'I piani di allenamento, con fatica e forma di ogni giocatore.')}
${table(
  ['Focus', 'Cosa allena'],
  [
    [it.training.focusOptions.balanced, 'Tutti gli attributi, poco alla volta.'],
    [
      `${it.training.focusOptions.serve}, ${it.training.focusOptions.reception}, ${it.training.focusOptions.setting}, ${it.training.focusOptions.attack}, ${it.training.focusOptions.block}, ${it.training.focusOptions.defense}`,
      'Il fondamentale scelto (più un attributo collegato).',
    ],
    [it.training.focusOptions.physical, 'Resistenza, velocità e salto.'],
    [it.training.focusOptions.mental, 'Lettura del gioco, mentalità e costanza.'],
    [it.training.focusOptions.rest, 'Nessuna crescita, recupero rapido della fatica.'],
  ],
)}
<ul>
<li>L'intensità alta accelera la crescita ma aumenta fatica e rischio di infortuni. Con la fatica oltre 70 si va in sovrallenamento e il morale cala.</li>
<li>I giovani crescono molto più dei veterani; dopo i 30 anni gli attributi fisici calano. La crescita rallenta avvicinandosi al potenziale.</li>
</ul>
${figure(img, 'staff', 'Lo staff tecnico e i candidati disponibili.')}
${table(
  ['Ruolo', 'Effetto'],
  (['coach', 'fitness', 'physio', 'analyst'] as const).map((k) => [
    it.staff.roles[k],
    it.staff.effects[k],
  ]),
)}
<p>Lo staff ha un livello da 1 a 5: più è alto, più è efficace e costoso. Assumere un nuovo membro costa due settimane di stipendio, e il predecessore riceve una buonuscita di quattro settimane.</p>`,
  },
  {
    id: 'finance',
    title: 'Finanze e sponsor',
    body: (img) => `
<p><strong>Uscite:</strong> stipendi dei giocatori e dello staff, quote d'iscrizione, viaggi, mercato e scouting. <strong>Entrate:</strong> sponsor, premi dei tornei, contributo annuale della dirigenza ed eventuali eventi.</p>
${figure(img, 'finance', 'Finanze: saldo, costi ed entrate settimanali, sponsor, obiettivi e movimenti.')}
<ul>
<li>Puoi avere al massimo <strong>${MAX_SPONSORS} sponsor</strong>. Ognuno paga ogni settimana e ha un obiettivo stagionale con un bonus se viene raggiunto.</li>
<li>La dirigenza fissa un obiettivo stagionale in base alla reputazione del club. Raggiungerlo aumenta la reputazione, e con essa sponsor migliori e trattative più facili.</li>
</ul>
${table(
  ['Settimane consecutive in rosso', 'Conseguenza'],
  [
    [NEGATIVE_WARNING_WEEKS, 'Richiamo della dirigenza.'],
    [NEGATIVE_CUT_WEEKS, 'La dirigenza svincola il giocatore più pagato e il morale cala.'],
    [NEGATIVE_FIRED_WEEKS, 'Esonero del manager: la carriera termina.'],
  ],
)}
${tip('Firma due sponsor fin dalla prima settimana e scegli obiettivi alla tua portata.')}`,
  },
  {
    id: 'market',
    title: 'Mercato e scouting',
    body: (img) => `
<p>Il <em>Mercato</em> ha tre schede: ricerca, giocatori osservati e contratti della tua rosa (per i rinnovi).</p>
${figure(img, 'market', 'Il mercato: filtri di ricerca, stima del potenziale, stipendio richiesto e indennizzo.')}
<ul>
<li><strong>Osserva</strong> (${eur(SCOUT_COST)}): aumenta la conoscenza di un giocatore e restringe la stima del potenziale; oltre il 60% rivela il carattere. L'analista video rende lo scouting più efficace.</li>
<li><strong>Cerca giovani talenti</strong> (${eur(YOUTH_SEARCH_COST)}): scova 3 giovani promesse, già osservate.</li>
<li><strong>Offerte</strong>: scegli stipendio settimanale e durata (fino a ${MAX_CONTRACT_YEARS} stagioni). Gli svincolati costano solo lo stipendio; per chi ha un contratto con un altro club serve un indennizzo.</li>
<li>Un'offerta può essere rifiutata per stipendio basso (con controproposta), per poca ambizione del club rispetto a quella del giocatore o, nei rinnovi, per morale troppo basso. Dopo ${MAX_REFUSALS} rifiuti il giocatore non tratta più per il resto della stagione.</li>
<li>La rosa può contenere al massimo ${MAX_ROSTER} giocatori. Svincolare un giocatore costa una parte dello stipendio residuo.</li>
</ul>`,
  },
  {
    id: 'seasons',
    title: 'Fine stagione e carriera',
    body: (img) => `
<p>Dopo la settimana ${SEASON_WEEKS} la stagione si chiude:</p>
<ul>
<li>il ranking viene archiviato e l'albo d'oro registra i vincitori di ogni torneo;</li>
<li>sponsor e dirigenza valutano gli obiettivi; la reputazione del club cambia in base a risultati e obiettivi;</li>
<li>i giocatori invecchiano, alcuni veterani si ritirano e arrivano nuovi giovani;</li>
<li>i contratti scaduti terminano: chi non è stato rinnovato lascia il club;</li>
<li>la dirigenza versa il contributo per la nuova stagione e arrivano nuove offerte di sponsor.</li>
</ul>
${figure(img, 'history', "Lo Storico: albo d'oro, classifiche delle stagioni passate e storia del club.")}
${tip('Investi su qualche giovane di talento: in due o tre stagioni può diventare il tuo giocatore di punta.')}`,
  },
  {
    id: 'tutorial',
    title: 'Tutorial, salvataggi e impostazioni',
    body: (img) => `
<p>Il <strong>Tutorial</strong> spiega le basi in ${Object.keys(it.tutorial.items).length} lezioni brevi, ognuna con una schermata, i punti chiave e un consiglio. Si apre dal menu principale (anche senza una carriera) o dalla voce <em>Tutorial</em> del menu di gioco. Il pulsante <em>Prova ora</em> porta alla schermata della lezione; il gioco ricorda le lezioni già lette.</p>
${figure(img, 'tutorial', 'Il tutorial integrato nel gioco.')}
<p>Dalle <strong>Impostazioni</strong> puoi salvare nello slot corrente o in uno nuovo, caricare o eliminare i salvataggi, esportare e importare la carriera in JSON, attivare o disattivare il salvataggio automatico, scegliere la velocità predefinita delle partite e la lingua.</p>
${figure(img, 'settings', 'Impostazioni e gestione dei salvataggi.')}`,
  },
  {
    id: 'tips',
    title: 'Consigli rapidi',
    body: () => `
<ol>
${it.tutorial.items.firstSeason.points
  .split('|')
  .map((p) => `<li>${p}</li>`)
  .join('')}
<li>Dopo un torneo impegnativo metti a riposo i giocatori più stanchi.</li>
<li>Con vento forte preferisci un servizio sicuro; contro un ricevitore debole, batti su di lui.</li>
<li>Rinnova per tempo i contratti dei giocatori migliori.</li>
</ol>`,
  },
];

const STYLE = `
@page { size: A4; }
* { box-sizing: border-box; }
body { font-family: 'Segoe UI', Roboto, Arial, sans-serif; color: #2b2214; font-size: 10.5pt; line-height: 1.5; margin: 0; }
h1, h2, h3 { color: #0b3640; line-height: 1.2; }
h2 { font-size: 20pt; margin: 0 0 4mm; padding-bottom: 2mm; border-bottom: 2px solid #e5ca93; }
h2 .num { color: #c29446; margin-right: 3mm; }
h3 { font-size: 12.5pt; margin: 5mm 0 2mm; break-after: avoid; }
p:has(+ figure), p:has(+ table) { break-after: avoid; }
p, ul, ol { margin: 0 0 3mm; }
li { margin-bottom: 1mm; }
.chapter { break-before: page; }
figure { margin: 4mm 0; break-inside: avoid; }
figure img { width: 100%; border: 1px solid #e5ca93; border-radius: 4px; }
figcaption { font-size: 9pt; color: #7c5a22; margin-top: 1.5mm; font-style: italic; }
table { width: 100%; border-collapse: collapse; margin: 3mm 0 4mm; font-size: 9.5pt; break-inside: avoid; }
th { background: #f8f0de; color: #7c5a22; text-align: left; padding: 1.5mm 2mm; border-bottom: 2px solid #e5ca93; }
td { padding: 1.5mm 2mm; border-bottom: 1px solid #f0e0bd; vertical-align: top; }
.tip { background: #ecfbfd; border-left: 4px solid #0e7a8f; padding: 2.5mm 3.5mm; margin: 4mm 0; break-inside: avoid; }
.cover { height: 260mm; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;
  background: linear-gradient(#cff3f8, #fdfaf3 55%, #f0e0bd); border-radius: 6mm; }
.cover img { width: 120mm; }
.cover h1 { font-size: 30pt; margin: 8mm 0 2mm; }
.cover p { font-size: 13pt; color: #7c5a22; }
.toc { break-before: page; }
.toc ol { font-size: 12pt; line-height: 2; }
.toc a { color: #0b3640; text-decoration: none; }
`;

export function manualHtml(img: Img, logoUrl: string): string {
  const today = new Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' }).format(
    new Date(),
  );
  return `<!doctype html><html lang="it"><head><meta charset="utf-8"><title>Beach Volley Manager — Manuale di gioco</title><style>${STYLE}</style></head><body>
<section class="cover">
  <img src="${logoUrl}" alt="Beach Volley Manager">
  <h1>Manuale di gioco</h1>
  <p>Tutto quello che serve per guidare il tuo club, dai tornei Open all'Elite Tour.</p>
  <p style="font-size:10pt">${today}</p>
</section>
<section class="toc">
  <h2>Indice</h2>
  <ol>${CHAPTERS.map((c) => `<li><a href="#${c.id}">${c.title}</a></li>`).join('')}</ol>
</section>
${CHAPTERS.map((c, i) => `<section class="chapter" id="${c.id}"><h2><span class="num">${i + 1}</span>${c.title}</h2>${c.body(img)}</section>`).join('\n')}
</body></html>`;
}
