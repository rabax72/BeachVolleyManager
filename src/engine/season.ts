/**
 * Flusso della stagione: iscrizioni, sorteggio dei tornei, partite, avanzamento settimanale
 * e passaggio di stagione. Le funzioni `...Mut` mutano una bozza; le altre sono pure.
 */
import { SEASON_WEEKS, TIER_INFO } from '../data/world';
import { generateCalendar } from './calendar';
import { rollWeeklyEventMut } from './events';
import {
  addTransaction,
  boardGrant,
  boardObjectiveFor,
  generateSponsorOffers,
  NEGATIVE_CUT_WEEKS,
  NEGATIVE_FIRED_WEEKS,
  NEGATIVE_WARNING_WEEKS,
  emptyTierCount,
  objectiveProgress,
  prizeFor,
  type SeasonClubStats,
} from './finance';
import { emptySeasonStats, generatePlayer } from './generation';
import { simulateMatch, type MatchResult, type MatchSetup, type TeamIndex } from './match';
import { buildSetup } from './matchSetup';
import { generateStaffMarket } from './staff';
import {
  activePairOf,
  dissolvePairMut,
  isUserPair,
  isUserPlayer,
  newId,
  repairAiPairsMut,
  userPairs,
  userPlayers,
} from './pairs';
import { chemistryGain, clamp, fullName, pairKey, playerOverall, shortName } from './player';
import { pairEntryPoints, pairEntryRanking, placementPoints, playerRanking } from './ranking';
import { createRng, hashSeed, type Rng } from './rng';
import {
  advancePhase,
  allMatches,
  createTournament,
  pendingMatches,
  recordResult,
  TOURNAMENT_SIZE,
  tournamentWinner,
} from './tournament';
import { AI_STAFF, DEFAULT_PLAN, matchFatigue, staffLevels, weeklyTraining } from './training';
import type { GameState, Gender, NewsItem, Pair, TournamentDef } from './types';
import { tierOrder } from './calendar';

// ---------------------------------------------------------------- Utilità

export function produce(state: GameState, fn: (draft: GameState) => void): GameState {
  const draft = structuredClone(state);
  fn(draft);
  return draft;
}

const MAX_NEWS = 200;

export function pushNews(
  s: GameState,
  key: string,
  params: NewsItem['params'] = {},
  important = false,
): void {
  s.news.push({ id: newId(s, 'n'), season: s.season, week: s.week, key, params, important });
  if (s.news.length > MAX_NEWS) s.news.splice(0, s.news.length - MAX_NEWS);
}

export const defById = (s: GameState, id: string): TournamentDef | undefined =>
  s.calendar.find((d) => d.id === id);

export const weekDefs = (s: GameState, week: number): TournamentDef[] =>
  s.calendar.filter((d) => d.week === week);

export const seasonYear = (s: GameState): number => s.startYear + s.season - 1;

export function pairName(s: GameState, pairId: string): string {
  const pair = s.pairs[pairId];
  if (!pair) return '—';
  return pair.playerIds.map((id) => (s.players[id] ? s.players[id].lastName : '?')).join(' / ');
}

export function pairFullName(s: GameState, pairId: string): string {
  const pair = s.pairs[pairId];
  if (!pair) return '—';
  return pair.playerIds.map((id) => (s.players[id] ? shortName(s.players[id]) : '?')).join(' / ');
}

const weekRng = (s: GameState, tag: string): Rng =>
  createRng(hashSeed(s.seed, tag, s.season, s.week));

// ---------------------------------------------------------------- Iscrizioni

export type RegistrationError =
  | 'pastWeek'
  | 'notUserPair'
  | 'rankTooLow'
  | 'alreadyThisWeek'
  | 'noBudget'
  | 'injured'
  | 'wrongGender'
  | 'alreadyRegistered';

export function registrationError(
  s: GameState,
  pairId: string,
  defId: string,
): RegistrationError | null {
  const def = defById(s, defId);
  const pair = s.pairs[pairId];
  if (!def || def.week <= s.week) return 'pastWeek';
  if (!pair || !isUserPair(s, pair)) return 'notUserPair';
  if (pair.gender !== def.gender) return 'wrongGender';
  if ((s.registrations[defId] ?? []).includes(pairId)) return 'alreadyRegistered';
  const sameWeek = weekDefs(s, def.week).some((d) =>
    (s.registrations[d.id] ?? []).includes(pairId),
  );
  if (sameWeek) return 'alreadyThisWeek';
  const min = TIER_INFO[def.tier].minRankEntry;
  if (min !== null) {
    const pos =
      pairEntryRanking(s.pairs, s.players, pair.gender).findIndex((p) => p.id === pairId) + 1;
    if (pos > min) return 'rankTooLow';
  }
  if (s.finance.balance < def.entryFee) return 'noBudget';
  return null;
}

export function registerPair(state: GameState, pairId: string, defId: string): GameState {
  if (registrationError(state, pairId, defId)) return state;
  return produce(state, (s) => {
    const def = defById(s, defId)!;
    s.registrations[defId] = [...(s.registrations[defId] ?? []), pairId];
    addTransaction(s, 'entry', -def.entryFee, def.name);
  });
}

export function unregisterPair(state: GameState, pairId: string, defId: string): GameState {
  const def = defById(state, defId);
  if (!def || def.week <= state.week || !(state.registrations[defId] ?? []).includes(pairId))
    return state;
  return produce(state, (s) => {
    s.registrations[defId] = s.registrations[defId].filter((id) => id !== pairId);
    addTransaction(s, 'entry', def.entryFee, def.name);
  });
}

// ---------------------------------------------------------------- Sorteggio

const pairAvailable = (s: GameState, pair: Pair): boolean =>
  pair.active && pair.playerIds.every((id) => !s.players[id].injury && !s.players[id].retired);

const pairFatigue = (s: GameState, pair: Pair): number =>
  (s.players[pair.playerIds[0]].fatigue + s.players[pair.playerIds[1]].fatigue) / 2;

/** Inizio settimana: riaccoppiamenti AI e sorteggio dei tornei della settimana. */
export function startWeekMut(s: GameState): void {
  repairAiPairsMut(s);
  const defs = weekDefs(s, s.week);
  if (defs.length === 0) return;
  const rng = weekRng(s, 'draw');
  for (const gender of ['M', 'F'] as Gender[]) {
    const gDefs = defs
      .filter((d) => d.gender === gender)
      .sort((a, b) => tierOrder(b.tier) - tierOrder(a.tier));
    const ranking = pairEntryRanking(s.pairs, s.players, gender);
    const position = new Map(ranking.map((p, i) => [p.id, i + 1]));
    const taken = new Set<string>();
    const entriesByDef: Record<string, string[]> = {};

    // Iscrizioni del manager (verificate di nuovo: infortuni, coppie sciolte)
    for (const def of gDefs) {
      const regs = s.registrations[def.id] ?? [];
      const valid: string[] = [];
      for (const pid of regs) {
        const pair = s.pairs[pid];
        if (pair && isUserPair(s, pair) && pairAvailable(s, pair) && !taken.has(pid)) {
          valid.push(pid);
          taken.add(pid);
          addTransaction(s, 'travel', -def.travelCost, def.name);
          s.clubSeason.entries[def.tier]++;
        } else {
          addTransaction(s, 'entry', def.entryFee, def.name);
          pushNews(
            s,
            'news.registrationCancelled',
            { pair: pairName(s, pid), tournament: def.name },
            true,
          );
        }
      }
      entriesByDef[def.id] = valid.slice(0, TOURNAMENT_SIZE);
    }

    // Coppie AI disponibili, alcune scelgono di riposare
    const aiPool = ranking.filter((p) => {
      if (isUserPair(s, p) || !pairAvailable(s, p)) return false;
      const fat = pairFatigue(s, p);
      if (fat > 60 && rng.chance(0.65)) return false;
      return !rng.chance(0.12);
    });
    const backup = ranking.filter((p) => !isUserPair(s, p) && pairAvailable(s, p));

    for (const def of gDefs) {
      const entries = entriesByDef[def.id];
      const min = TIER_INFO[def.tier].minRankEntry;
      const fill = (list: Pair[], respectRank: boolean): void => {
        for (const p of list) {
          if (entries.length >= TOURNAMENT_SIZE) return;
          if (taken.has(p.id)) continue;
          if (respectRank && min !== null && (position.get(p.id) ?? 999) > min) continue;
          entries.push(p.id);
          taken.add(p.id);
        }
      };
      // Livelli bassi: le coppie di vertice non partecipano ai tornei minori se hanno alternative
      fill(aiPool, true);
      fill(aiPool, false);
      fill(backup, false);
      if (entries.length < TOURNAMENT_SIZE) {
        throw new Error(`Coppie insufficienti per ${def.id}`);
      }
      entries.sort(
        (a, b) =>
          pairEntryPoints(s.pairs[b], s.players) - pairEntryPoints(s.pairs[a], s.players) ||
          a.localeCompare(b),
      );
      s.tournaments[def.id] = createTournament(def.id, entries);
    }
  }
}

// ---------------------------------------------------------------- Partite

/** Lato del manager nella partita (null se nessuna coppia del club è coinvolta). */
export function userSide(s: GameState, pairIds: [string, string]): TeamIndex | null {
  if (s.pairs[pairIds[0]] && isUserPair(s, s.pairs[pairIds[0]])) return 0;
  if (s.pairs[pairIds[1]] && isUserPair(s, s.pairs[pairIds[1]])) return 1;
  return null;
}

export function tournamentMatchSetup(s: GameState, defId: string, matchId: string): MatchSetup {
  const def = defById(s, defId)!;
  const t = s.tournaments[defId];
  const m = allMatches(t).find((x) => x.id === matchId);
  if (!m) throw new Error(`Partita ${matchId} non trovata`);
  const pairs: [Pair, Pair] = [s.pairs[m.pairIds[0]], s.pairs[m.pairIds[1]]];
  const analyst = staffLevels(s.staff).analyst * 0.08;
  const isUser = pairs.map((p) => isUserPair(s, p));
  return buildSetup(
    matchId,
    hashSeed(s.seed, s.season, matchId),
    pairs,
    s.players,
    def.conditions,
    [
      isUser[0] ? (s.tactics[pairs[0].id] ?? null) : null,
      isUser[1] ? (s.tactics[pairs[1].id] ?? null) : null,
    ],
    [isUser[0] ? analyst : 0, isUser[1] ? analyst : 0],
  );
}

/** Applica a giocatori e coppie gli effetti di una partita conclusa (muta). */
export function applyMatchResultMut(
  s: GameState,
  defId: string,
  matchId: string,
  result: MatchResult,
): void {
  const t = s.tournaments[defId];
  const m = allMatches(t).find((x) => x.id === matchId);
  if (!m || m.winner !== null) return;
  s.tournaments[defId] = recordResult(t, matchId, result.winner, result.sets);
  m.pairIds.forEach((pid, side) => {
    const pair = s.pairs[pid];
    const won = result.winner === side;
    pair.playerIds.forEach((plId, i) => {
      const p = s.players[plId];
      const st = result.stats[side][i];
      p.season.matches++;
      if (won) p.season.wins++;
      p.season.aces += st.aces;
      p.season.kills += st.kills;
      p.season.blocks += st.blocks;
      p.season.digs += st.digs;
      p.season.serveErrors += st.serveErrors;
      p.fatigue = clamp(p.fatigue + matchFatigue(result.energy[side][i], result.rallies), 0, 100);
      p.morale = clamp(p.morale + (won ? 1.5 : -1.5), 0, 100);
    });
    pair.chemistry = clamp(pair.chemistry + chemistryGain(pair.chemistry, won), 0, 100);
    pair.matchesTogether++;
  });
}

/** Simula le partite ancora da giocare nella fase corrente (muta). */
export function simulatePendingMut(s: GameState, defId: string): void {
  const t = s.tournaments[defId];
  for (const m of pendingMatches(t)) {
    const setup = tournamentMatchSetup(s, defId, m.id);
    const { result } = simulateMatch(setup);
    applyMatchResultMut(s, defId, m.id, result);
  }
}

/** Passa alla fase successiva e chiude il torneo se terminato (muta). */
export function advanceTournamentMut(s: GameState, defId: string): void {
  const before = s.tournaments[defId];
  const after = advancePhase(before);
  s.tournaments[defId] = after;
  if (before.phase !== 'done' && after.phase === 'done') finalizeTournamentMut(s, defId);
}

/** Gioca (simulando) il resto della fase corrente e avanza. */
export function playTournamentPhase(state: GameState, defId: string): GameState {
  return produce(state, (s) => {
    simulatePendingMut(s, defId);
    advanceTournamentMut(s, defId);
  });
}

export function completeTournamentMut(s: GameState, defId: string): void {
  let guard = 0;
  while (s.tournaments[defId].phase !== 'done' && guard++ < 10) {
    simulatePendingMut(s, defId);
    advanceTournamentMut(s, defId);
  }
}

const RESULT_MORALE: Record<number, number> = { 1: 8, 2: 4, 3: 2, 5: 0, 9: -2, 13: -4 };

function finalizeTournamentMut(s: GameState, defId: string): void {
  const def = defById(s, defId)!;
  const t = s.tournaments[defId];
  for (const [pairId, placement] of Object.entries(t.placements)) {
    const pair = s.pairs[pairId];
    const pts = placementPoints(def.tier, placement);
    for (const plId of pair.playerIds) {
      const p = s.players[plId];
      p.points += pts;
      p.season.tournaments++;
      if (placement === 1) p.season.titles++;
      p.morale = clamp(p.morale + (RESULT_MORALE[placement] ?? 0), 0, 100);
    }
    if (isUserPair(s, pair)) {
      const prize = prizeFor(def.prizePool, placement);
      addTransaction(s, 'prize', prize, def.name);
      s.clubSeason.prizeMoney += prize;
      if (placement <= 3) s.clubSeason.semifinals++;
      if (placement === 1) s.clubSeason.titles[def.tier]++;
      pushNews(
        s,
        placement === 1 ? 'news.tournamentWin' : 'news.tournamentResult',
        {
          pair: pairName(s, pairId),
          tournament: def.name,
          tier: def.tier,
          placement,
          prize,
          points: pts,
        },
        placement <= 3,
      );
    }
  }
  const winner = tournamentWinner(t);
  if (winner) {
    const userClub = isUserPair(s, s.pairs[winner]);
    s.honours.push({
      season: s.season,
      tournamentName: def.name,
      tier: def.tier,
      gender: def.gender,
      winnerNames: pairFullName(s, winner),
      winnerPairId: winner,
      userClub,
    });
    if (def.tier === 'elite' && !userClub) {
      pushNews(s, 'news.eliteWinner', {
        pair: pairName(s, winner),
        tournament: def.name,
        gender: def.gender,
      });
    }
  }
}

// ---------------------------------------------------------------- Settimana

/** Partite giocate in settimana da ciascun giocatore. */
function matchesThisWeek(s: GameState): Record<string, number> {
  const out: Record<string, number> = {};
  for (const def of weekDefs(s, s.week)) {
    const t = s.tournaments[def.id];
    if (!t) continue;
    for (const m of allMatches(t)) {
      if (m.winner === null) continue;
      for (const pid of m.pairIds)
        for (const pl of s.pairs[pid].playerIds) out[pl] = (out[pl] ?? 0) + 1;
    }
  }
  return out;
}

export const isWeekComplete = (s: GameState): boolean =>
  weekDefs(s, s.week).every((d) => !s.tournaments[d.id] || s.tournaments[d.id].phase === 'done');

function finishWeekMut(s: GameState): void {
  for (const def of weekDefs(s, s.week))
    if (s.tournaments[def.id]) completeTournamentMut(s, def.id);
  const rng = weekRng(s, 'week');
  const played = matchesThisWeek(s);
  const userStaff = staffLevels(s.staff);
  const offSeason = s.week > 26;

  // Allenamento e recupero
  for (const p of Object.values(s.players)) {
    if (p.retired) continue;
    const user = isUserPlayer(s, p);
    let plan = user ? (s.training[p.id] ?? DEFAULT_PLAN) : DEFAULT_PLAN;
    if (!user && p.fatigue > 55) plan = { focus: 'rest', intensity: 'low' };
    if (!user && offSeason) plan = { focus: 'balanced', intensity: 'medium' };
    const wasInjured = p.injury !== null;
    const out = weeklyTraining(p, plan, user ? userStaff : AI_STAFF, rng, played[p.id] ?? 0);
    s.players[p.id] = out.player;
    if (user) {
      if (out.injured && out.player.injury) {
        pushNews(
          s,
          'news.injury',
          {
            player: fullName(p),
            injury: out.player.injury.key,
            weeks: out.player.injury.weeksLeft,
          },
          true,
        );
      } else if (wasInjured && !out.player.injury) {
        pushNews(s, 'news.recovered', { player: fullName(p), g: p.gender });
      }
      if (out.overtrained) pushNews(s, 'news.overtrained', { player: fullName(p) }, true);
    }
  }

  // Finanze settimanali
  const roster = userPlayers(s);
  const salaries = roster.reduce((a, p) => a + p.contract.salary, 0);
  addTransaction(s, 'salary', -salaries, 'finance.salaries');
  const staffCost = s.staff.reduce((a, m) => a + m.weeklySalary, 0);
  addTransaction(s, 'staff', -staffCost, 'finance.staff');
  for (const sp of s.sponsors) addTransaction(s, 'sponsor', sp.weeklyIncome, sp.name);

  // Bilancio in rosso prolungato
  if (s.finance.balance < 0) {
    s.finance.negativeWeeks++;
    const n = s.finance.negativeWeeks;
    if (n === NEGATIVE_WARNING_WEEKS) pushNews(s, 'news.negativeWarning', { weeks: n }, true);
    if (n === NEGATIVE_CUT_WEEKS) {
      const top = [...roster].sort((a, b) => b.contract.salary - a.contract.salary)[0];
      if (top) {
        releasePlayerMut(s, top.id);
        roster.forEach((p) => (p.morale = clamp(p.morale - 10, 0, 100)));
        pushNews(s, 'news.boardCut', { player: fullName(top) }, true);
      }
    }
    if (n >= NEGATIVE_FIRED_WEEKS) {
      s.gameOver = true;
      pushNews(s, 'news.fired', {}, true);
    }
  } else {
    s.finance.negativeWeeks = 0;
  }

  // Eventi casuali
  rollWeeklyEventMut(s, rng, (key, params, important) => pushNews(s, key, params, important));

  // Avvisi contratti
  if (s.week === 20 || s.week === 27) {
    for (const p of roster) {
      if (p.contract.untilSeason <= s.season)
        pushNews(s, 'news.contractExpiring', { player: fullName(p) }, true);
    }
  }
  if (s.week === 15) s.staffMarket = generateStaffMarket(s, rng);
}

/** Svincolo di un giocatore del club (muta; il costo va gestito dal chiamante). */
export function releasePlayerMut(s: GameState, playerId: string): void {
  const p = s.players[playerId];
  const pair = activePairOf(s, playerId);
  if (pair) dissolvePairMut(s, pair.id);
  p.contract = { clubId: null, salary: p.contract.salary, untilSeason: s.season };
  delete s.training[playerId];
  // Iscrizioni future della coppia non più valide
  if (pair) {
    for (const k of Object.keys(s.registrations)) {
      const def = defById(s, k);
      if (def && def.week > s.week && s.registrations[k].includes(pair.id)) {
        s.registrations[k] = s.registrations[k].filter((x) => x !== pair.id);
        addTransaction(s, 'entry', def.entryFee, def.name);
      }
    }
  }
}

// ---------------------------------------------------------------- Fine stagione

export function clubSeasonStatsWithRank(
  s: GameState,
): SeasonClubStats & { bestRank: number | null } {
  let bestRank: number | null = null;
  for (const gender of ['M', 'F'] as Gender[]) {
    playerRanking(s.players, gender).forEach((p, i) => {
      if (isUserPlayer(s, p) && p.points > 0 && (bestRank === null || i + 1 < bestRank))
        bestRank = i + 1;
    });
  }
  return { ...s.clubSeason, bestRank };
}

function endSeasonMut(s: GameState): void {
  const rng = createRng(hashSeed(s.seed, 'season-end', s.season));
  const club = s.clubs[s.manager.clubId];
  const stats = clubSeasonStatsWithRank(s);

  // Ranking e carriera
  for (const gender of ['M', 'F'] as Gender[]) {
    const ranking = playerRanking(s.players, gender);
    s.rankingHistory.push({
      season: s.season,
      gender,
      top: ranking
        .slice(0, 10)
        .map((p) => ({ playerId: p.id, name: fullName(p), points: p.points })),
    });
    ranking.forEach((p, i) => {
      p.career.push({
        ...p.season,
        season: s.season,
        points: p.points,
        rank: p.points > 0 ? i + 1 : null,
      });
    });
  }

  // Sponsor
  for (const sp of s.sponsors) {
    const { met } = objectiveProgress(sp.objective, stats, s.finance.balance);
    if (met) {
      addTransaction(s, 'sponsorBonus', sp.bonus, sp.name);
      pushNews(s, 'news.sponsorBonus', { sponsor: sp.name, amount: sp.bonus }, true);
    } else {
      pushNews(s, 'news.sponsorFailed', { sponsor: sp.name });
    }
  }
  s.sponsors = s.sponsors.filter((sp) => sp.untilSeason > s.season);

  // Dirigenza e reputazione
  const board = objectiveProgress(s.boardObjective, stats, s.finance.balance);
  let rep = club.reputation;
  rep += board.met ? 0.35 : -0.25;
  pushNews(s, board.met ? 'news.boardSuccess' : 'news.boardFail', {}, true);
  const br = stats.bestRank;
  rep += br === null ? -0.15 : br <= 5 ? 0.4 : br <= 15 ? 0.2 : br <= 30 ? 0.05 : -0.1;
  const bigTitles = stats.titles.challenger + stats.titles.elite;
  rep += Math.min(0.4, bigTitles * 0.1);
  club.reputation = Math.round(clamp(rep, 1, 5) * 100) / 100;
  s.clubHistory.push({
    season: s.season,
    reputation: club.reputation,
    bestRank: stats.bestRank,
    titles: Object.values(stats.titles).reduce((a, b) => a + b, 0),
    balance: s.finance.balance,
  });

  // Invecchiamento, ritiri, contratti
  const retiredCount: Record<Gender, number> = { M: 0, F: 0 };
  for (const p of Object.values(s.players)) {
    if (p.retired) continue;
    p.age++;
    const ovr = playerOverall(p);
    const retireP = p.age >= 38 ? 1 : p.age >= 33 ? (p.age - 32) * 0.13 + (ovr < 10 ? 0.12 : 0) : 0;
    if (rng.chance(retireP)) {
      const wasUser = isUserPlayer(s, p);
      const pair = activePairOf(s, p.id);
      if (pair) dissolvePairMut(s, pair.id);
      p.retired = true;
      p.contract = { clubId: null, salary: 0, untilSeason: s.season };
      retiredCount[p.gender]++;
      delete s.training[p.id];
      if (wasUser) pushNews(s, 'news.retired', { player: fullName(p), age: p.age }, true);
      continue;
    }
    if (p.contract.clubId && p.contract.untilSeason <= s.season) {
      if (p.contract.clubId === club.id) {
        const pair = activePairOf(s, p.id);
        if (pair) dissolvePairMut(s, pair.id);
        p.contract = { clubId: null, salary: p.contract.salary, untilSeason: s.season };
        delete s.training[p.id];
        pushNews(s, 'news.playerLeft', { player: fullName(p) }, true);
      } else if (rng.chance(0.75)) {
        p.contract = { ...p.contract, untilSeason: s.season + rng.int(1, 3) };
      } else {
        p.contract = { clubId: null, salary: p.contract.salary, untilSeason: s.season };
      }
    }
  }
  for (const p of Object.values(s.players)) {
    p.prevPoints = p.points;
    p.points = 0;
    p.season = emptySeasonStats();
    p.refusals = 0;
    p.fatigue = Math.round(p.fatigue * 0.5);
  }

  // Nuovi talenti
  const next = s.season + 1;
  for (const gender of ['M', 'F'] as Gender[]) {
    const n = retiredCount[gender] + 4;
    for (let i = 0; i < n; i++) {
      const p = generatePlayer(rng, {
        id: newId(s, 'p'),
        gender,
        level: clamp(rng.normal(7.8, 1.6), 4, 12.5),
        age: rng.int(17, 20),
        season: next,
      });
      s.players[p.id] = p;
    }
    if (n > 0) pushNews(s, 'news.newTalents', { count: n, gender });
  }

  // Pulizia: coppie inattive, giocatori ritirati da tempo
  for (const [id, pair] of Object.entries(s.pairs)) if (!pair.active) delete s.pairs[id];
  for (const [id, p] of Object.entries(s.players)) {
    const last = p.career.at(-1)?.season ?? 0;
    if (p.retired && last < s.season - 2) {
      delete s.players[id];
      delete s.scouting[id];
    }
  }
  for (const key of Object.keys(s.chemistryMemory)) {
    const [a, b] = key.split('+');
    if (!s.players[a] || !s.players[b]) delete s.chemistryMemory[key];
  }
  // Le coppie del manager restano: aggiorna la memoria della chimica
  for (const pair of userPairs(s))
    s.chemistryMemory[pairKey(pair.playerIds[0], pair.playerIds[1])] = pair.chemistry;

  // Nuova stagione
  s.season = next;
  s.week = 1;
  s.calendar = generateCalendar(s.seed, next);
  s.tournaments = {};
  s.registrations = {};
  s.negotiations = {};
  s.clubSeason = {
    titles: emptyTierCount(),
    semifinals: 0,
    entries: emptyTierCount(),
    prizeMoney: 0,
  };
  const grant = boardGrant(club.reputation, s.manager.difficulty);
  addTransaction(s, 'board', grant, 'finance.boardGrant');
  s.boardObjective = boardObjectiveFor(club.reputation);
  s.sponsorOffers = generateSponsorOffers(rng, club.reputation, next, () => newId(s, 'sp'));
  s.staffMarket = generateStaffMarket(s, rng);
  pushNews(s, 'news.seasonStart', { year: seasonYear(s), grant }, true);
}

/** Avanza di una settimana: completa i tornei, allenamento, finanze, eventi, eventuale fine stagione. */
export function advanceWeek(state: GameState): GameState {
  if (state.gameOver) return state;
  return produce(state, (s) => {
    finishWeekMut(s);
    if (s.gameOver) return;
    if (s.week >= SEASON_WEEKS) endSeasonMut(s);
    else s.week++;
    startWeekMut(s);
  });
}

/** Avanza fino alla prossima settimana con tornei in cui gioca il club (o fine stagione). */
export function weeksUntilNextUserEvent(s: GameState): number | null {
  for (let w = s.week + 1; w <= SEASON_WEEKS; w++) {
    if (weekDefs(s, w).some((d) => (s.registrations[d.id] ?? []).length > 0)) return w - s.week;
  }
  return null;
}
