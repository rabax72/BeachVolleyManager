/** Azioni del manager: funzioni pure che restituiscono il nuovo stato. */
import { addTransaction, MAX_SPONSORS } from './finance';
import { generatePlayer, pickNationality } from './generation';
import {
  evaluateOffer,
  MAX_CONTRACT_YEARS,
  releaseCost,
  SCOUT_COST,
  scoutGain,
  YOUTH_SEARCH_COST,
  type ContractOffer,
  type NegotiationResult,
} from './market';
import {
  activePairOf,
  canFormUserPair,
  dissolvePairMut,
  formPairMut,
  isUserPlayer,
  newId,
  SPLIT_MORALE_PENALTY,
} from './pairs';
import { clamp, fullName } from './player';
import { createRng, hashSeed } from './rng';
import { produce, pushNews, releasePlayerMut } from './season';
import { hiringFee, severance } from './staff';
import { staffLevels } from './training';
import type { GameState, Tactics, TrainingPlan } from './types';

export function setTraining(state: GameState, playerIds: string[], plan: TrainingPlan): GameState {
  return produce(state, (s) => {
    for (const id of playerIds)
      if (s.players[id] && isUserPlayer(s, s.players[id])) s.training[id] = { ...plan };
  });
}

export function setPairTactics(state: GameState, pairId: string, tactics: Tactics): GameState {
  return produce(state, (s) => {
    s.tactics[pairId] = { ...tactics };
  });
}

export function formPair(state: GameState, aId: string, bId: string): GameState {
  if (canFormUserPair(state, aId, bId)) return state;
  return produce(state, (s) => {
    const pair = formPairMut(s, s.players[aId], s.players[bId]);
    pushNews(s, 'news.pairFormed', {
      a: fullName(s.players[aId]),
      b: fullName(s.players[bId]),
      chemistry: pair.chemistry,
    });
  });
}

export function splitPair(state: GameState, pairId: string): GameState {
  const pair = state.pairs[pairId];
  if (!pair || !pair.active) return state;
  return produce(state, (s) => {
    dissolvePairMut(s, pairId);
    for (const id of pair.playerIds) {
      s.players[id].morale = clamp(s.players[id].morale - SPLIT_MORALE_PENALTY, 0, 100);
    }
    // Annulla le iscrizioni future (con rimborso)
    for (const [defId, regs] of Object.entries(s.registrations)) {
      if (!regs.includes(pairId)) continue;
      const def = s.calendar.find((d) => d.id === defId);
      if (def && def.week > s.week) {
        s.registrations[defId] = regs.filter((x) => x !== pairId);
        addTransaction(s, 'entry', def.entryFee, def.name);
      }
    }
    delete s.tactics[pairId];
  });
}

// ---------------------------------------------------------------- Staff

export function hireStaff(state: GameState, candidateId: string): GameState {
  const cand = state.staffMarket.find((m) => m.id === candidateId);
  if (!cand) return state;
  const current = state.staff.find((m) => m.role === cand.role);
  const cost = hiringFee(cand) + (current ? severance(current) : 0);
  if (state.finance.balance < cost) return state;
  return produce(state, (s) => {
    if (current) {
      addTransaction(s, 'staff', -severance(current), current.name);
      s.staff = s.staff.filter((m) => m.id !== current.id);
    }
    addTransaction(s, 'staff', -hiringFee(cand), cand.name);
    s.staff.push(cand);
    s.staffMarket = s.staffMarket.filter((m) => m.id !== cand.id);
    pushNews(s, 'news.staffHired', { name: cand.name, role: cand.role, level: cand.level });
  });
}

export function fireStaff(state: GameState, staffId: string): GameState {
  const m = state.staff.find((x) => x.id === staffId);
  if (!m) return state;
  return produce(state, (s) => {
    addTransaction(s, 'staff', -severance(m), m.name);
    s.staff = s.staff.filter((x) => x.id !== staffId);
  });
}

// ---------------------------------------------------------------- Sponsor

export function acceptSponsor(state: GameState, sponsorId: string): GameState {
  const sp = state.sponsorOffers.find((x) => x.id === sponsorId);
  if (!sp || state.sponsors.length >= MAX_SPONSORS) return state;
  return produce(state, (s) => {
    s.sponsors.push(sp);
    s.sponsorOffers = s.sponsorOffers.filter((x) => x.id !== sponsorId);
    pushNews(s, 'news.sponsorSigned', { sponsor: sp.name, weekly: sp.weeklyIncome });
  });
}

// ---------------------------------------------------------------- Mercato

export function makeOffer(
  state: GameState,
  playerId: string,
  offer: ContractOffer,
): { state: GameState; result: NegotiationResult } {
  const years = clamp(Math.round(offer.years), 1, MAX_CONTRACT_YEARS);
  const result = evaluateOffer(state, playerId, { ...offer, years });
  const next = produce(state, (s) => {
    const p = s.players[playerId];
    const neg = s.negotiations[playerId] ?? { playerId, attempts: 0 };
    neg.attempts++;
    s.negotiations[playerId] = neg;
    if (!result.accepted) {
      if (result.reason === 'lowSalary' || result.reason === 'lowAmbition') p.refusals++;
      return;
    }
    const own = p.contract.clubId === s.manager.clubId;
    if (result.transferFee > 0) addTransaction(s, 'transfer', -result.transferFee, fullName(p));
    if (!own) {
      // Lascia la coppia AI di cui faceva parte
      const pair = activePairOf(s, playerId);
      if (pair) dissolvePairMut(s, pair.id);
      p.morale = clamp(p.morale + 8, 0, 100);
    } else {
      p.morale = clamp(p.morale + 4, 0, 100);
    }
    // Un rinnovo decorre dalla scadenza attuale; un ingaggio nella pausa invernale dalla stagione successiva
    const startSeason = own
      ? Math.max(s.season, p.contract.untilSeason) + 1
      : s.week > 26
        ? s.season + 1
        : s.season;
    p.contract = {
      clubId: s.manager.clubId,
      salary: Math.round(offer.salary),
      untilSeason: startSeason + years - 1,
    };
    s.scouting[playerId] = { knowledge: 100 };
    pushNews(
      s,
      own ? 'news.renewed' : 'news.signed',
      { player: fullName(p), salary: p.contract.salary, until: p.contract.untilSeason },
      true,
    );
  });
  return { state: next, result };
}

export function releasePlayer(state: GameState, playerId: string): GameState {
  const p = state.players[playerId];
  if (!p || !isUserPlayer(state, p)) return state;
  const cost = releaseCost(p, state.season);
  return produce(state, (s) => {
    addTransaction(s, 'transfer', -cost, fullName(p));
    releasePlayerMut(s, playerId);
    pushNews(s, 'news.released', { player: fullName(p), cost });
  });
}

export function scoutPlayer(state: GameState, playerId: string): GameState {
  if (state.finance.balance < SCOUT_COST) return state;
  return produce(state, (s) => {
    const gain = scoutGain(staffLevels(s.staff).analyst);
    const cur = s.scouting[playerId]?.knowledge ?? 0;
    s.scouting[playerId] = { knowledge: clamp(cur + gain, 0, 100) };
    addTransaction(s, 'scouting', -SCOUT_COST, fullName(s.players[playerId]));
  });
}

/** Ricerca di giovani talenti: genera 3 nuovi giocatori svincolati già osservati. */
export function youthSearch(state: GameState, gender: 'M' | 'F'): GameState {
  if (state.finance.balance < YOUTH_SEARCH_COST) return state;
  return produce(state, (s) => {
    const rng = createRng(hashSeed(s.seed, 'youth', s.season, s.week, s.nextId));
    const analyst = staffLevels(s.staff).analyst;
    const names: string[] = [];
    for (let i = 0; i < 3; i++) {
      const p = generatePlayer(rng, {
        id: newId(s, 'p'),
        gender,
        level: clamp(rng.normal(8 + analyst * 0.3, 1.5), 4, 13),
        age: rng.int(16, 19),
        nationality: pickNationality(rng),
        season: s.season,
      });
      // I talenti scovati hanno un buon margine di crescita
      p.hidden.potential = clamp(p.hidden.potential + rng.range(0.5, 2.5) + analyst * 0.3, 0, 20);
      s.players[p.id] = p;
      s.scouting[p.id] = { knowledge: 40 + analyst * 8 };
      names.push(fullName(p));
    }
    addTransaction(s, 'scouting', -YOUTH_SEARCH_COST, 'market.youthSearch');
    pushNews(s, 'news.youthFound', { names: names.join(', ') }, true);
  });
}
