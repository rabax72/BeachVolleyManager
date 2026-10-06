/**
 * Motore di simulazione della partita, punto per punto.
 *
 * Ogni rally: servizio → ricezione → alzata → attacco → muro/difesa → eventuale transizione.
 * Lo stato è interamente serializzabile (compreso lo stato del RNG), quindi la partita è
 * deterministica dato il seed e la sequenza di comandi (cambi tattici, timeout).
 */
import { createRng, type Rng } from './rng';
import { matchWinner, isSideSwitch, setPointFor, setTarget, setWinner } from './scoring';
import type { AttributeKey, Attributes, Conditions, Gender, Role, Tactics } from './types';
import { clamp } from './player';

export type TeamIndex = 0 | 1;

export interface MatchPlayer {
  id: string;
  name: string;
  role: Role;
  gender: Gender;
  heightCm: number;
  attrs: Attributes;
  morale: number;
  form: number;
  fatigue: number;
}

export interface MatchTeam {
  pairId: string;
  players: [MatchPlayer, MatchPlayer];
  /** 0–100 */
  chemistry: number;
  /** 0–1 */
  synergy: number;
  tactics: Tactics;
  /** Bonus tattico da staff (analista video), 0–1. */
  analystBonus: number;
}

export interface MatchSetup {
  id: string;
  teams: [MatchTeam, MatchTeam];
  conditions: Conditions;
  seed: number;
}

export interface PlayerMatchStats {
  serves: number;
  aces: number;
  serveErrors: number;
  receptions: number;
  goodReceptions: number;
  receptionErrors: number;
  attacks: number;
  kills: number;
  attackErrors: number;
  blockedAttacks: number;
  blocks: number;
  digs: number;
  setErrors: number;
  points: number;
}

export type PointCause = 'ace' | 'serveError' | 'kill' | 'block' | 'attackError' | 'setError';

export type MatchEvent =
  | {
      kind: 'point';
      rally: number;
      setIndex: number;
      team: TeamIndex;
      cause: PointCause;
      /** Giocatore protagonista (chi fa il punto o chi sbaglia). */
      playerId: string;
      /** Eventuale avversario coinvolto (es. chi subisce l'ace). */
      otherId?: string;
      touches: number;
      score: [number, number];
      setPoint: TeamIndex | null;
      highlight: boolean;
    }
  | { kind: 'sideSwitch'; setIndex: number; score: [number, number] }
  | { kind: 'setEnd'; setIndex: number; score: [number, number]; winner: TeamIndex }
  | { kind: 'matchEnd'; winner: TeamIndex; sets: [number, number][] }
  | { kind: 'timeout'; team: TeamIndex; setIndex: number; score: [number, number] }
  | { kind: 'tactics'; team: TeamIndex; setIndex: number; score: [number, number] };

export interface MatchState {
  setup: MatchSetup;
  rngState: number;
  /** Punteggi dei set; l'ultimo è quello in corso. */
  sets: [number, number][];
  setIndex: number;
  setsWon: [number, number];
  servingTeam: TeamIndex;
  /** Indice dell'ultimo battitore per squadra (-1 = nessuno nel set). */
  lastServer: [number, number];
  /** Indice del primo battitore per squadra (ordine di servizio). */
  serveOrder: [number, number];
  currentServer: number;
  firstServingTeam: TeamIndex;
  /** Energia in partita 0–100 per giocatore. */
  energy: [[number, number], [number, number]];
  /** Positivo = slancio per squadra 0, negativo per squadra 1. Range -3..3. */
  momentum: number;
  timeoutsUsed: [boolean, boolean];
  /** Squadra che ha il sole di fronte. */
  sunFacing: TeamIndex;
  tactics: [Tactics, Tactics];
  stats: [[PlayerMatchStats, PlayerMatchStats], [PlayerMatchStats, PlayerMatchStats]];
  events: MatchEvent[];
  rallyCount: number;
  finished: boolean;
  winner: TeamIndex | null;
}

export interface MatchResult {
  id: string;
  winner: TeamIndex;
  sets: [number, number][];
  stats: MatchState['stats'];
  rallies: number;
  /** Energia finale, usata per la fatica post-partita. */
  energy: MatchState['energy'];
}

// ---------------------------------------------------------------- Setup

export const emptyStats = (): PlayerMatchStats => ({
  serves: 0,
  aces: 0,
  serveErrors: 0,
  receptions: 0,
  goodReceptions: 0,
  receptionErrors: 0,
  attacks: 0,
  kills: 0,
  attackErrors: 0,
  blockedAttacks: 0,
  blocks: 0,
  digs: 0,
  setErrors: 0,
  points: 0,
});

export const DEFAULT_TACTICS: Tactics = {
  serveRisk: 'normal',
  serveTarget: 'balanced',
  blockStyle: 'zone',
  attackRisk: 'medium',
  energy: 'normal',
};

/** Tattica scelta automaticamente (AI) in base ai punti di forza propri e altrui. */
export function autoTactics(
  own: MatchTeam['players'],
  opp: MatchTeam['players'],
  conditions: Conditions,
): Tactics {
  const recDiff = Math.abs(opp[0].attrs.reception - opp[1].attrs.reception);
  const bestServe = Math.max(own[0].attrs.serve, own[1].attrs.serve);
  const blocker = own[0].role === 'blocker' ? own[0] : own[1];
  return {
    serveTarget: recDiff >= 1.5 ? 'weaker' : 'balanced',
    serveRisk:
      conditions.wind >= 2 || bestServe < 9 ? 'safe' : bestServe >= 14 ? 'aggressive' : 'normal',
    blockStyle: blocker.attrs.reading >= 13 ? 'read' : 'zone',
    attackRisk: 'medium',
    energy: 'normal',
  };
}

/** Il battitore iniziale è quello con il servizio migliore. */
const bestServerIndex = (team: MatchTeam): number =>
  team.players[0].attrs.serve >= team.players[1].attrs.serve ? 0 : 1;

export function createMatch(setup: MatchSetup): MatchState {
  const rng = createRng(setup.seed);
  const firstServingTeam: TeamIndex = rng.chance(0.5) ? 0 : 1;
  const sunFacing: TeamIndex = rng.chance(0.5) ? 0 : 1;
  const startEnergy = (p: MatchPlayer): number => clamp(100 - p.fatigue * 0.45, 35, 100);
  const order: [number, number] = [
    bestServerIndex(setup.teams[0]),
    bestServerIndex(setup.teams[1]),
  ];
  return {
    setup,
    rngState: rng.getState(),
    sets: [[0, 0]],
    setIndex: 0,
    setsWon: [0, 0],
    servingTeam: firstServingTeam,
    lastServer: [-1, -1],
    serveOrder: order,
    currentServer: order[firstServingTeam],
    firstServingTeam,
    energy: [
      [startEnergy(setup.teams[0].players[0]), startEnergy(setup.teams[0].players[1])],
      [startEnergy(setup.teams[1].players[0]), startEnergy(setup.teams[1].players[1])],
    ],
    momentum: 0,
    timeoutsUsed: [false, false],
    sunFacing,
    tactics: [setup.teams[0].tactics, setup.teams[1].tactics],
    stats: [
      [emptyStats(), emptyStats()],
      [emptyStats(), emptyStats()],
    ],
    events: [],
    rallyCount: 0,
    finished: false,
    winner: null,
  };
}

// ---------------------------------------------------------------- Modello

const logistic = (x: number): number => 1 / (1 + Math.exp(-x));

/** Costanti di bilanciamento (pendenze delle curve logistiche). */
export const BALANCE = {
  aceBase: -3.2,
  aceSlope: 0.11,
  receptionSlope: 0.025,
  blockBase: -3.0,
  blockSlope: 0.1,
  killBase: 0.45,
  killSlope: 0.085,
  digSlope: 0.02,
  errSkill: 0.0025,
};
const other = (t: TeamIndex): TeamIndex => (t === 0 ? 1 : 0);

const SERVE_RISK = {
  safe: { err: 0.035, power: -1.6 },
  normal: { err: 0.075, power: 0 },
  aggressive: { err: 0.14, power: 2.1 },
} as const;
const ATTACK_RISK = {
  low: { err: 0.045, power: -1.1 },
  medium: { err: 0.075, power: 0 },
  high: { err: 0.125, power: 1.4 },
} as const;
const ENERGY_PLAN = {
  conserve: { bonus: -0.35, drain: 0.7 },
  normal: { bonus: 0, drain: 1 },
  push: { bonus: 0.45, drain: 1.35 },
} as const;

interface Ctx {
  s: MatchState;
  rng: Rng;
  pressure: boolean;
}

/** Altezza relativa alla media del genere, in decine di cm. */
const heightAdv = (p: MatchPlayer): number => (p.heightCm - (p.gender === 'M' ? 192 : 180)) / 10;

/** Valore efficace di un attributo nel contesto del rally corrente. */
function eff(ctx: Ctx, team: TeamIndex, idx: number, key: AttributeKey): number {
  const { s, rng } = ctx;
  const t = s.setup.teams[team];
  const p = t.players[idx];
  const energy = s.energy[team][idx];
  let v = p.attrs[key];
  v *= 0.8 + 0.2 * (energy / 100);
  v *= 0.95 + 0.1 * (p.morale / 100);
  v *= 0.93 + 0.14 * (p.form / 100);
  v += (t.chemistry / 100) * 0.9 * t.synergy;
  v += ENERGY_PLAN[s.tactics[team].energy].bonus;
  const mom = team === 0 ? s.momentum : -s.momentum;
  if (mom > 0) v += mom * 0.12;
  if (ctx.pressure) v += (p.attrs.mentality - 10) * 0.07;
  if (key === 'reading') v += t.analystBonus * 1.2;
  const sand = s.setup.conditions.sand;
  if (key === 'speed' || key === 'jump') v += sand === 'soft' ? -0.5 : sand === 'hard' ? 0.3 : 0;
  if ((key === 'reception' || key === 'defense') && s.sunFacing === team) {
    v -= s.setup.conditions.sun * 0.45;
  }
  // La costanza riduce la variabilità del rendimento punto per punto.
  v += rng.normal(0, 0.35 + (20 - p.attrs.consistency) * 0.06);
  return v;
}

function blockerIndex(team: MatchTeam): number {
  const [a, b] = team.players;
  if (a.role !== b.role) return a.role === 'blocker' ? 0 : 1;
  return a.attrs.block >= b.attrs.block ? 0 : 1;
}

function chooseReceiver(ctx: Ctx, serving: TeamIndex): number {
  const recv = other(serving);
  const team = ctx.s.setup.teams[recv];
  const target = ctx.s.tactics[serving].serveTarget;
  const [a, b] = team.players;
  if (target === 'weaker') {
    const weaker = a.attrs.reception <= b.attrs.reception ? 0 : 1;
    return ctx.rng.chance(0.8) ? weaker : 1 - weaker;
  }
  if (target === 'blocker' || target === 'defender') {
    const idx =
      a.role === target
        ? 0
        : b.role === target
          ? 1
          : a.attrs.reception <= b.attrs.reception
            ? 0
            : 1;
    return ctx.rng.chance(0.85) ? idx : 1 - idx;
  }
  return ctx.rng.chance(0.5) ? 0 : 1;
}

function drain(ctx: Ctx, team: TeamIndex, idx: number, amount: number): void {
  const { s } = ctx;
  const p = s.setup.teams[team].players[idx];
  const c = s.setup.conditions;
  const sandMult = c.sand === 'soft' ? 1.2 : c.sand === 'hard' ? 0.9 : 1;
  const tempMult = 1 + Math.max(0, c.temperature - 28) * 0.04;
  const staminaMult = 1.75 - p.attrs.stamina / 20;
  const planMult = ENERGY_PLAN[s.tactics[team].energy].drain;
  s.energy[team][idx] = clamp(
    s.energy[team][idx] - amount * sandMult * tempMult * staminaMult * planMult,
    0,
    100,
  );
}

interface PointOutcome {
  team: TeamIndex;
  cause: PointCause;
  playerId: string;
  otherId?: string;
  touches: number;
}

/**
 * Fase d'attacco della squadra `att`, dopo un primo tocco (ricezione o difesa) di qualità q (0–1)
 * eseguito dal giocatore `first`. Restituisce l'esito del punto, oppure null se la palla viene
 * difesa (in quel caso aggiorna il contesto per la transizione).
 */
function attackSequence(
  ctx: Ctx,
  att: TeamIndex,
  first: number,
  q: number,
): { outcome: PointOutcome | null; digger: number; digQ: number } {
  const { s, rng } = ctx;
  const def = other(att);
  const setter = 1 - first;
  const attacker = first;
  const attTeam = s.setup.teams[att];
  const defTeam = s.setup.teams[def];
  const aStats = s.stats[att];
  const dStats = s.stats[def];
  const wind = s.setup.conditions.wind;

  // Alzata
  drain(ctx, att, setter, 0.45);
  const settingSkill = eff(ctx, att, setter, 'setting');
  const pSetErr = clamp(
    0.012 + (1 - q) * 0.035 - (settingSkill - 10) * 0.002 + wind * 0.004,
    0.003,
    0.12,
  );
  if (rng.chance(pSetErr)) {
    aStats[setter].setErrors++;
    return {
      outcome: { team: def, cause: 'setError', playerId: attTeam.players[setter].id, touches: 0 },
      digger: 0,
      digQ: 0,
    };
  }
  const setQ = clamp(
    q * 0.5 + (settingSkill / 20) * 0.4 + (attTeam.chemistry / 100) * 0.1 + rng.normal(0, 0.1),
    0,
    1,
  );

  // Attacco
  drain(ctx, att, attacker, 0.6);
  aStats[attacker].attacks++;
  const risk = ATTACK_RISK[s.tactics[att].attackRisk];
  const attackPower =
    eff(ctx, att, attacker, 'attack') * 0.6 +
    eff(ctx, att, attacker, 'jump') * 0.25 +
    eff(ctx, att, attacker, 'reading') * 0.15 +
    (setQ - 0.55) * 4 +
    risk.power +
    heightAdv(attTeam.players[attacker]) * 0.35;
  const attackerCons = attTeam.players[attacker].attrs.consistency;
  const pAttErr = clamp(
    risk.err +
      wind * 0.012 +
      (1 - setQ) * 0.05 -
      (attackerCons - 10) * BALANCE.errSkill -
      (attTeam.players[attacker].attrs.attack - 10) * BALANCE.errSkill * 0.5,
    0.015,
    0.35,
  );
  if (rng.chance(pAttErr)) {
    aStats[attacker].attackErrors++;
    return {
      outcome: {
        team: def,
        cause: 'attackError',
        playerId: attTeam.players[attacker].id,
        touches: 0,
      },
      digger: 0,
      digQ: 0,
    };
  }

  // Muro
  const bIdx = blockerIndex(defTeam);
  const dIdx = 1 - bIdx;
  drain(ctx, def, bIdx, 0.4);
  const style = s.tactics[def].blockStyle;
  const attackerReading = attTeam.players[attacker].attrs.reading;
  const styleAdj =
    style === 'read'
      ? (defTeam.players[bIdx].attrs.reading - attackerReading) * 0.15
      : 0.55 - (attackerReading - 10) * 0.08;
  const blockSkill =
    eff(ctx, def, bIdx, 'block') * 0.6 +
    eff(ctx, def, bIdx, 'jump') * 0.25 +
    eff(ctx, def, bIdx, 'reading') * 0.15 +
    styleAdj +
    heightAdv(defTeam.players[bIdx]) * 0.45;
  const pBlock = logistic(BALANCE.blockBase + (blockSkill - attackPower) * BALANCE.blockSlope);
  if (rng.chance(pBlock)) {
    dStats[bIdx].blocks++;
    dStats[bIdx].points++;
    aStats[attacker].blockedAttacks++;
    return {
      outcome: {
        team: def,
        cause: 'block',
        playerId: defTeam.players[bIdx].id,
        otherId: attTeam.players[attacker].id,
        touches: 0,
      },
      digger: 0,
      digQ: 0,
    };
  }

  // Difesa: lo stile a lettura aiuta il difensore se il muratore legge bene l'attaccante.
  drain(ctx, def, dIdx, 0.55);
  const coverAdj = style === 'read' ? styleAdj * 0.5 : 0;
  const digSkill =
    eff(ctx, def, dIdx, 'defense') * 0.6 +
    eff(ctx, def, dIdx, 'speed') * 0.2 +
    eff(ctx, def, dIdx, 'reading') * 0.2 +
    coverAdj;
  const pKill = logistic(BALANCE.killBase + (attackPower - digSkill) * BALANCE.killSlope);
  if (rng.chance(pKill)) {
    aStats[attacker].kills++;
    aStats[attacker].points++;
    return {
      outcome: { team: att, cause: 'kill', playerId: attTeam.players[attacker].id, touches: 0 },
      digger: 0,
      digQ: 0,
    };
  }
  dStats[dIdx].digs++;
  const digQ = clamp(0.35 + (digSkill - attackPower) * BALANCE.digSlope + rng.normal(0, 0.2), 0, 1);
  return { outcome: null, digger: dIdx, digQ };
}

function playRallyMut(s: MatchState): void {
  if (s.finished) return;
  const rng = createRng(s.rngState);
  const score = s.sets[s.setIndex];
  const target = setTarget(s.setIndex);
  const pressure =
    setPointFor(score[0], score[1], s.setIndex) !== null ||
    Math.min(score[0], score[1]) >= target - 3;
  const ctx: Ctx = { s, rng, pressure };
  const serving = s.servingTeam;
  const receiving = other(serving);
  const server = s.currentServer;
  const servTeam = s.setup.teams[serving];
  const recvTeam = s.setup.teams[receiving];
  const wind = s.setup.conditions.wind;
  let outcome: PointOutcome | null = null;
  let touches = 1;

  // Servizio
  s.stats[serving][server].serves++;
  drain(ctx, serving, server, 0.35);
  const risk = SERVE_RISK[s.tactics[serving].serveRisk];
  const serverP = servTeam.players[server];
  const riskMult =
    s.tactics[serving].serveRisk === 'aggressive'
      ? 1.6
      : s.tactics[serving].serveRisk === 'safe'
        ? 0.6
        : 1;
  const pServeErr = clamp(
    risk.err +
      wind * 0.014 * riskMult -
      (serverP.attrs.serve - 10) * BALANCE.errSkill -
      (serverP.attrs.consistency - 10) * BALANCE.errSkill,
    0.01,
    0.35,
  );
  if (rng.chance(pServeErr)) {
    s.stats[serving][server].serveErrors++;
    outcome = { team: receiving, cause: 'serveError', playerId: serverP.id, touches };
  } else {
    const recv = chooseReceiver(ctx, serving);
    const servePower =
      eff(ctx, serving, server, 'serve') +
      risk.power +
      (serverP.attrs.jump - 10) * 0.08 +
      wind * 0.25 * riskMult;
    const recSkill =
      eff(ctx, receiving, recv, 'reception') * 0.75 + eff(ctx, receiving, recv, 'reading') * 0.25;
    const diff = servePower - recSkill;
    s.stats[receiving][recv].receptions++;
    drain(ctx, receiving, recv, 0.45);
    touches++;
    if (rng.chance(logistic(BALANCE.aceBase + diff * BALANCE.aceSlope))) {
      s.stats[serving][server].aces++;
      s.stats[serving][server].points++;
      s.stats[receiving][recv].receptionErrors++;
      outcome = {
        team: serving,
        cause: 'ace',
        playerId: serverP.id,
        otherId: recvTeam.players[recv].id,
        touches,
      };
    } else {
      const q = clamp(0.55 - diff * BALANCE.receptionSlope + rng.normal(0, 0.18), 0, 1);
      if (q >= 0.5) s.stats[receiving][recv].goodReceptions++;
      // Scambio: si alternano le fasi d'attacco finché qualcuno fa punto.
      let att: TeamIndex = receiving;
      let first = recv;
      let quality = q;
      for (let exchange = 0; exchange < 40 && !outcome; exchange++) {
        touches += 2;
        const r = attackSequence(ctx, att, first, quality);
        if (r.outcome) {
          outcome = { ...r.outcome, touches };
        } else {
          touches++;
          att = other(att);
          first = r.digger;
          quality = r.digQ;
        }
      }
      if (!outcome) {
        // Limite di sicurezza: scambio infinito risolto a caso.
        const t: TeamIndex = rng.chance(0.5) ? 0 : 1;
        outcome = { team: t, cause: 'kill', playerId: s.setup.teams[t].players[0].id, touches };
      }
    }
  }

  // Recupero leggero per tutti tra un punto e l'altro
  for (const t of [0, 1] as const) for (const i of [0, 1]) drain(ctx, t, i, 0.12);

  s.rngState = rng.getState();
  applyPoint(s, outcome);
}

function applyPoint(s: MatchState, o: PointOutcome): void {
  s.rallyCount++;
  const score = s.sets[s.setIndex];
  score[o.team]++;
  // Slancio
  const sign = o.team === 0 ? 1 : -1;
  if (Math.sign(s.momentum) === sign) s.momentum = clamp(s.momentum + sign, -3, 3);
  else s.momentum = sign;

  const sp = setPointFor(score[0], score[1], s.setIndex);
  const highlight = o.cause === 'ace' || o.cause === 'block' || o.touches >= 7 || sp !== null;
  s.events.push({
    kind: 'point',
    rally: s.rallyCount,
    setIndex: s.setIndex,
    team: o.team,
    cause: o.cause,
    playerId: o.playerId,
    otherId: o.otherId,
    touches: o.touches,
    score: [score[0], score[1]],
    setPoint: sp,
    highlight,
  });

  // Rotazione del servizio: se la squadra in ricezione vince lo scambio, conquista il servizio
  // e batte il giocatore successivo nel suo ordine.
  if (o.team !== s.servingTeam) {
    s.lastServer[s.servingTeam] = s.currentServer;
    s.servingTeam = o.team;
    const last = s.lastServer[o.team];
    s.currentServer = last === -1 ? s.serveOrder[o.team] : 1 - last;
  }

  const sw = setWinner(score[0], score[1], s.setIndex);
  if (sw !== null) {
    s.setsWon[sw]++;
    s.events.push({
      kind: 'setEnd',
      setIndex: s.setIndex,
      score: [score[0], score[1]],
      winner: sw,
    });
    const mw = matchWinner(s.setsWon);
    if (mw !== null) {
      s.finished = true;
      s.winner = mw;
      s.events.push({ kind: 'matchEnd', winner: mw, sets: s.sets.map((x) => [x[0], x[1]]) });
      return;
    }
    // Nuovo set: si alterna chi serve per primo, si azzerano slancio e timeout,
    // breve recupero di energia.
    s.setIndex++;
    s.sets.push([0, 0]);
    const first: TeamIndex = s.setIndex === 1 ? other(s.firstServingTeam) : s.firstServingTeam;
    s.servingTeam = first;
    s.lastServer = [-1, -1];
    s.currentServer = s.serveOrder[first];
    s.momentum = 0;
    s.timeoutsUsed = [false, false];
    for (const t of [0, 1] as const)
      for (const i of [0, 1]) s.energy[t][i] = clamp(s.energy[t][i] + 6, 0, 100);
    return;
  }
  if (isSideSwitch(score[0], score[1], s.setIndex)) {
    s.sunFacing = other(s.sunFacing);
    s.events.push({ kind: 'sideSwitch', setIndex: s.setIndex, score: [score[0], score[1]] });
  }
}

// ---------------------------------------------------------------- API pubblica

const cloneState = (s: MatchState): MatchState => structuredClone(s);

/** Gioca un rally e restituisce il nuovo stato (funzione pura). */
export function playRally(state: MatchState): MatchState {
  const s = cloneState(state);
  playRallyMut(s);
  return s;
}

/** Il timeout è consentito una volta per set per squadra. */
export function canCallTimeout(state: MatchState, team: TeamIndex): boolean {
  return !state.finished && !state.timeoutsUsed[team];
}

function timeoutMut(s: MatchState, team: TeamIndex): void {
  s.timeoutsUsed[team] = true;
  // Il timeout spezza lo slancio avversario e concede un breve recupero.
  const oppMomentum = team === 0 ? s.momentum < 0 : s.momentum > 0;
  if (oppMomentum) s.momentum = 0;
  for (const i of [0, 1]) s.energy[team][i] = clamp(s.energy[team][i] + 3, 0, 100);
  const score = s.sets[s.setIndex];
  s.events.push({ kind: 'timeout', team, setIndex: s.setIndex, score: [score[0], score[1]] });
}

export function callTimeout(state: MatchState, team: TeamIndex): MatchState {
  if (!canCallTimeout(state, team)) return state;
  const s = cloneState(state);
  timeoutMut(s, team);
  return s;
}

export function setTactics(state: MatchState, team: TeamIndex, tactics: Tactics): MatchState {
  const s = cloneState(state);
  s.tactics[team] = { ...tactics };
  const score = s.sets[s.setIndex];
  s.events.push({ kind: 'tactics', team, setIndex: s.setIndex, score: [score[0], score[1]] });
  return s;
}

/**
 * Logica AI durante la partita: timeout quando l'avversario ha uno slancio di 3 punti
 * consecutivi, e attacco più rischioso quando si è sotto di molto.
 */
function aiDecisionsMut(s: MatchState, team: TeamIndex): void {
  const oppRun = team === 0 ? -s.momentum : s.momentum;
  const score = s.sets[s.setIndex];
  if (!s.timeoutsUsed[team] && oppRun >= 3 && score[0] + score[1] >= 8) timeoutMut(s, team);
  const deficit = score[other(team)] - score[team];
  const wanted = deficit >= 5 ? 'high' : 'medium';
  if (s.tactics[team].attackRisk !== wanted && s.tactics[team].attackRisk !== 'low') {
    s.tactics[team] = { ...s.tactics[team], attackRisk: wanted };
  }
}

export function aiDecisions(state: MatchState, team: TeamIndex): MatchState {
  const s = cloneState(state);
  aiDecisionsMut(s, team);
  return s;
}

export function toResult(s: MatchState): MatchResult {
  if (!s.finished || s.winner === null) throw new Error('Partita non conclusa');
  return {
    id: s.setup.id,
    winner: s.winner,
    sets: s.sets.map((x) => [x[0], x[1]]),
    stats: s.stats,
    rallies: s.rallyCount,
    energy: s.energy,
  };
}

/**
 * Simulazione rapida completa. Entrambe le squadre usano la logica AI per timeout e rischio,
 * salvo `aiControl` diverso.
 */
export function simulateMatch(
  setup: MatchSetup,
  opts: { aiControl?: [boolean, boolean]; keepEvents?: boolean } = {},
): { result: MatchResult; state: MatchState } {
  const ai = opts.aiControl ?? [true, true];
  const s = createMatch(setup);
  // Lo setup viene condiviso: la simulazione rapida non lo modifica.
  s.tactics = [{ ...setup.teams[0].tactics }, { ...setup.teams[1].tactics }];
  let guard = 0;
  while (!s.finished && guard++ < 1000) {
    if (ai[0]) aiDecisionsMut(s, 0);
    if (ai[1]) aiDecisionsMut(s, 1);
    playRallyMut(s);
    if (!opts.keepEvents && s.events.length > 64) s.events.length = 0;
  }
  return { result: toResult(s), state: s };
}

/** Completa una partita già iniziata (es. "simula il resto" dalla vista live). */
export function finishMatch(state: MatchState, aiControl: [boolean, boolean]): MatchState {
  const s = cloneState(state);
  let guard = 0;
  while (!s.finished && guard++ < 1000) {
    if (aiControl[0]) aiDecisionsMut(s, 0);
    if (aiControl[1]) aiDecisionsMut(s, 1);
    playRallyMut(s);
  }
  return s;
}

/** Statistiche aggregate per squadra (per la UI). */
export function teamTotals(stats: [PlayerMatchStats, PlayerMatchStats]): PlayerMatchStats {
  const out = emptyStats();
  for (const p of stats) {
    for (const k of Object.keys(out) as (keyof PlayerMatchStats)[]) out[k] += p[k];
  }
  return out;
}

/** Errori non forzati: errori al servizio, in attacco e in alzata. */
export const unforcedErrors = (s: PlayerMatchStats): number =>
  s.serveErrors + s.attackErrors + s.setErrors;
