/** Tipi di dominio del gioco. Tutti serializzabili in JSON. */

export type Gender = 'M' | 'F';
export type CircuitChoice = 'M' | 'F' | 'mixed';
export type Difficulty = 'easy' | 'normal' | 'hard';
export type Role = 'blocker' | 'defender';
export type Hand = 'right' | 'left';

export const ATTRIBUTE_KEYS = [
  'serve',
  'reception',
  'setting',
  'attack',
  'block',
  'defense',
  'reading',
  'stamina',
  'speed',
  'jump',
  'mentality',
  'consistency',
] as const;
export type AttributeKey = (typeof ATTRIBUTE_KEYS)[number];
/** Valori 1–20, memorizzati con decimali per la progressione graduale. */
export type Attributes = Record<AttributeKey, number>;

export const TECHNICAL_KEYS: AttributeKey[] = [
  'serve',
  'reception',
  'setting',
  'attack',
  'block',
  'defense',
];
export const PHYSICAL_KEYS: AttributeKey[] = ['stamina', 'speed', 'jump'];
export const MENTAL_KEYS: AttributeKey[] = ['reading', 'mentality', 'consistency'];

export type Character = 'leader' | 'calm' | 'fiery' | 'introvert' | 'professional' | 'volatile';

export interface HiddenAttributes {
  /** Valutazione complessiva massima raggiungibile (1–20). */
  potential: number;
  /** 1–20: più alto = più soggetto a infortuni. */
  injuryProneness: number;
  character: Character;
  /** 1–20: quanto conta la competitività del club nelle trattative. */
  ambition: number;
}

export interface Injury {
  key: InjuryKey;
  weeksLeft: number;
}

export type InjuryKey =
  | 'ankleSprain'
  | 'shoulderStrain'
  | 'kneeTendinitis'
  | 'backPain'
  | 'fingerSprain'
  | 'calfStrain'
  | 'heatStroke'
  | 'abdominalStrain';

export interface Contract {
  clubId: string | null;
  /** Stipendio settimanale. */
  salary: number;
  /** Ultima stagione coperta dal contratto (inclusa). */
  untilSeason: number;
}

export interface SeasonStats {
  matches: number;
  wins: number;
  aces: number;
  kills: number;
  blocks: number;
  digs: number;
  serveErrors: number;
  tournaments: number;
  titles: number;
}

export interface CareerSeasonRecord extends SeasonStats {
  season: number;
  points: number;
  rank: number | null;
}

export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  nationality: string;
  gender: Gender;
  age: number;
  heightCm: number;
  hand: Hand;
  role: Role;
  attrs: Attributes;
  hidden: HiddenAttributes;
  contract: Contract;
  /** 0–100 */
  morale: number;
  /** 0–100: condizione di forma (rendimento). */
  form: number;
  /** 0–100: fatica accumulata. */
  fatigue: number;
  injury: Injury | null;
  /** Punti ranking della stagione in corso. */
  points: number;
  /** Punti della stagione precedente (contano al 50% per l'ingresso nei tornei). */
  prevPoints: number;
  season: SeasonStats;
  career: CareerSeasonRecord[];
  retired: boolean;
  /** Rifiuti consecutivi nelle trattative di questa stagione. */
  refusals: number;
}

export interface Pair {
  id: string;
  playerIds: [string, string];
  gender: Gender;
  /** 0–100 */
  chemistry: number;
  matchesTogether: number;
  active: boolean;
  createdSeason: number;
}

export interface Club {
  id: string;
  name: string;
  isUser: boolean;
  /** 1–5: influenza sponsor e trattative. */
  reputation: number;
  city: string;
}

// ---------------------------------------------------------------- Staff

export type StaffRole = 'coach' | 'fitness' | 'physio' | 'analyst';

export interface StaffMember {
  id: string;
  name: string;
  role: StaffRole;
  /** 1–5 */
  level: number;
  weeklySalary: number;
}

// ---------------------------------------------------------------- Allenamento

export type TrainingFocus =
  | 'balanced'
  | 'serve'
  | 'reception'
  | 'setting'
  | 'attack'
  | 'block'
  | 'defense'
  | 'physical'
  | 'mental'
  | 'rest';
export type TrainingIntensity = 'low' | 'medium' | 'high';

export interface TrainingPlan {
  focus: TrainingFocus;
  intensity: TrainingIntensity;
}

// ---------------------------------------------------------------- Condizioni e tattiche

export type SandType = 'soft' | 'medium' | 'hard';
export interface Conditions {
  /** 0 = assente, 1 = leggero, 2 = moderato, 3 = forte */
  wind: 0 | 1 | 2 | 3;
  /** 0 = coperto, 1 = variabile, 2 = sole pieno */
  sun: 0 | 1 | 2;
  temperature: number;
  sand: SandType;
}

export type ServeRisk = 'safe' | 'normal' | 'aggressive';
export type ServeTarget = 'balanced' | 'weaker' | 'blocker' | 'defender';
export type BlockStyle = 'zone' | 'read';
export type AttackRisk = 'low' | 'medium' | 'high';
export type EnergyPlan = 'conserve' | 'normal' | 'push';

export interface Tactics {
  serveRisk: ServeRisk;
  serveTarget: ServeTarget;
  blockStyle: BlockStyle;
  attackRisk: AttackRisk;
  energy: EnergyPlan;
}

// ---------------------------------------------------------------- Tornei

export type Tier = 'open' | 'national' | 'challenger' | 'elite';
export const TIERS: Tier[] = ['open', 'national', 'challenger', 'elite'];

export interface TournamentDef {
  id: string;
  name: string;
  location: string;
  tier: Tier;
  gender: Gender;
  week: number;
  /** Montepremi totale per il tabellone maschile/femminile. */
  prizePool: number;
  entryFee: number;
  travelCost: number;
  conditions: Conditions;
}

export interface MatchSummary {
  id: string;
  pairIds: [string, string];
  /** null finché non giocata */
  winner: 0 | 1 | null;
  sets: [number, number][];
  /** Etichetta di fase: 'G-A-1', 'QF', 'SF', 'F' */
  stage: string;
}

export interface GroupStanding {
  pairId: string;
  played: number;
  wins: number;
  setsWon: number;
  setsLost: number;
  pointsWon: number;
  pointsLost: number;
}

export interface Group {
  name: string;
  pairIds: string[];
  matches: MatchSummary[];
}

export type TournamentPhase = 'group1' | 'group2' | 'group3' | 'QF' | 'SF' | 'F' | 'done';

export interface Tournament {
  defId: string;
  phase: TournamentPhase;
  entries: string[];
  groups: Group[];
  knockout: MatchSummary[];
  /** pairId -> piazzamento finale (1, 2, 3, 5, 9, 13) */
  placements: Record<string, number>;
}

// ---------------------------------------------------------------- Economia

export interface SponsorObjective {
  kind: 'titles' | 'semifinals' | 'rankTop' | 'tierEntries';
  target: number;
  tier?: Tier;
}

export interface Sponsor {
  id: string;
  name: string;
  weeklyIncome: number;
  bonus: number;
  objective: SponsorObjective;
  untilSeason: number;
}

export interface Transaction {
  season: number;
  week: number;
  kind:
    | 'salary'
    | 'staff'
    | 'sponsor'
    | 'sponsorBonus'
    | 'prize'
    | 'entry'
    | 'travel'
    | 'transfer'
    | 'scouting'
    | 'event'
    | 'board';
  amount: number;
  label: string;
}

export interface BoardObjective {
  kind: 'rankTop' | 'titleTier' | 'finance' | 'tierEntries';
  target: number;
  tier?: Tier;
}

// ---------------------------------------------------------------- Notizie

export interface NewsItem {
  id: string;
  season: number;
  week: number;
  /** Chiave i18n + parametri: il testo è generato dalla UI. */
  key: string;
  params: Record<string, string | number>;
  important: boolean;
}

// ---------------------------------------------------------------- Storico

export interface HonourEntry {
  season: number;
  tournamentName: string;
  tier: Tier;
  gender: Gender;
  winnerNames: string;
  winnerPairId: string;
  userClub: boolean;
}

export interface SeasonRankingSnapshot {
  season: number;
  gender: Gender;
  top: { playerId: string; name: string; points: number }[];
}

// ---------------------------------------------------------------- Stato di gioco

export interface ManagerInfo {
  name: string;
  clubId: string;
  circuit: CircuitChoice;
  difficulty: Difficulty;
}

export interface Finance {
  balance: number;
  /** Settimane consecutive con saldo negativo. */
  negativeWeeks: number;
  transactions: Transaction[];
}

export interface ScoutingReport {
  /** 0–100: precisione della stima del potenziale. */
  knowledge: number;
}

export interface Negotiation {
  playerId: string;
  attempts: number;
}

export interface ClubSeasonStats {
  titles: Record<Tier, number>;
  semifinals: number;
  entries: Record<Tier, number>;
  prizeMoney: number;
}

export interface GameState {
  saveVersion: number;
  seed: number;
  createdAt: string;
  manager: ManagerInfo;
  season: number;
  /** Prima stagione (anno) della carriera. */
  startYear: number;
  week: number;
  players: Record<string, Player>;
  pairs: Record<string, Pair>;
  clubs: Record<string, Club>;
  staff: StaffMember[];
  staffMarket: StaffMember[];
  training: Record<string, TrainingPlan>;
  /** Tattiche predefinite per coppia del club. */
  tactics: Record<string, Tactics>;
  calendar: TournamentDef[];
  tournaments: Record<string, Tournament>;
  /** tournamentDefId -> pairIds del club iscritte */
  registrations: Record<string, string[]>;
  finance: Finance;
  sponsors: Sponsor[];
  sponsorOffers: Sponsor[];
  boardObjective: BoardObjective;
  clubSeason: ClubSeasonStats;
  /** Reputazione: storico per stagione. */
  clubHistory: {
    season: number;
    reputation: number;
    bestRank: number | null;
    titles: number;
    balance: number;
  }[];
  scouting: Record<string, ScoutingReport>;
  negotiations: Record<string, Negotiation>;
  news: NewsItem[];
  honours: HonourEntry[];
  rankingHistory: SeasonRankingSnapshot[];
  /** Coppie (chiave id-ordinati) -> chimica storica, per riformare coppie. */
  chemistryMemory: Record<string, number>;
  /** Contatore per id univoci. */
  nextId: number;
  gameOver: boolean;
}
