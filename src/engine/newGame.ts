/** Creazione di una nuova carriera e del mondo di gioco. */
import { CLUB_CITIES, CLUB_NAMES } from '../data/world';
import { generateCalendar } from './calendar';
import { boardObjectiveFor, generateSponsorOffers, STARTING_BALANCE } from './finance';
import { circuitAge, generatePlayer, generateStaff } from './generation';
import { emptyTierCount } from './finance';
import { generateStaffMarket } from './staff';
import { formPairMut, newId } from './pairs';
import { clamp, salaryDemand } from './player';
import { createRng, hashSeed } from './rng';
import { startWeekMut } from './season';
import type { CircuitChoice, Club, Difficulty, GameState, Gender, Player } from './types';

export const SAVE_VERSION = 2;
export const START_YEAR = 2027;
export const AI_PAIRS_PER_GENDER = 72;
export const FREE_AGENTS_PER_GENDER = 18;

export interface NewGameOptions {
  managerName: string;
  clubName: string;
  circuit: CircuitChoice;
  difficulty: Difficulty;
  seed: number;
}

export function newGame(opts: NewGameOptions): GameState {
  const rng = createRng(hashSeed(opts.seed, 'world'));
  const userClub: Club = {
    id: 'c0',
    name: opts.clubName.trim() || 'Beach Club',
    isUser: true,
    reputation: opts.difficulty === 'easy' ? 1.8 : opts.difficulty === 'hard' ? 1.2 : 1.5,
    city: rng.pick(CLUB_CITIES),
  };
  const clubs: Record<string, Club> = { c0: userClub };
  CLUB_NAMES.forEach((name, i) => {
    const id = `c${i + 1}`;
    clubs[id] = {
      id,
      name,
      isUser: false,
      reputation: Math.round(rng.range(1.5, 4.8) * 10) / 10,
      city: CLUB_CITIES[i],
    };
  });
  const aiClubIds = Object.keys(clubs).filter((id) => id !== 'c0');

  const state: GameState = {
    saveVersion: SAVE_VERSION,
    seed: opts.seed,
    createdAt: new Date().toISOString(),
    manager: {
      name: opts.managerName.trim() || 'Manager',
      clubId: 'c0',
      circuit: opts.circuit,
      difficulty: opts.difficulty,
    },
    season: 1,
    startYear: START_YEAR,
    week: 1,
    players: {},
    pairs: {},
    clubs,
    staff: [],
    staffMarket: [],
    training: {},
    tactics: {},
    calendar: generateCalendar(opts.seed, 1),
    tournaments: {},
    registrations: {},
    finance: { balance: STARTING_BALANCE[opts.difficulty], negativeWeeks: 0, transactions: [] },
    sponsors: [],
    sponsorOffers: [],
    boardObjective: boardObjectiveFor(userClub.reputation),
    clubSeason: {
      titles: emptyTierCount(),
      semifinals: 0,
      entries: emptyTierCount(),
      prizeMoney: 0,
    },
    clubHistory: [],
    scouting: {},
    negotiations: {},
    news: [],
    honours: [],
    rankingHistory: [],
    chemistryMemory: {},
    nextId: 1,
    gameOver: false,
  };

  const add = (p: Player): Player => {
    state.players[p.id] = p;
    return p;
  };

  // Circuito AI: coppie di livello decrescente, più svincolati.
  for (const gender of ['M', 'F'] as Gender[]) {
    for (let i = 0; i < AI_PAIRS_PER_GENDER; i++) {
      const level = clamp(16.6 - i * 0.11 + rng.normal(0, 0.5), 6, 18.5);
      const sameRole = rng.chance(0.08);
      const roleA = 'blocker' as const;
      const roleB = sameRole ? ('blocker' as const) : ('defender' as const);
      const clubId = rng.pick(aiClubIds);
      const pair = [roleA, roleB].map((role) => {
        const p = generatePlayer(rng, {
          id: newId(state, 'p'),
          gender,
          level: level + rng.normal(0, 0.6),
          age: circuitAge(rng),
          role,
          season: 1,
        });
        p.contract = { clubId, salary: salaryDemand(p), untilSeason: 1 + rng.int(0, 2) };
        p.prevPoints = Math.max(0, Math.round(2600 - i * 34 + rng.normal(0, 140)));
        return add(p);
      });
      const k = formPairMut(state, pair[0], pair[1]);
      k.chemistry = Math.round(rng.range(35, 85));
      k.matchesTogether = rng.int(5, 60);
      k.createdSeason = 0;
    }
    for (let i = 0; i < FREE_AGENTS_PER_GENDER; i++) {
      const young = rng.chance(0.4);
      const p = generatePlayer(rng, {
        id: newId(state, 'p'),
        gender,
        level: clamp(rng.normal(young ? 8 : 9.5, 1.6), 4, 14),
        age: young ? rng.int(17, 20) : circuitAge(rng),
        season: 1,
      });
      p.prevPoints = Math.max(0, Math.round(rng.normal(150, 100)));
      add(p);
    }
  }

  // Rosa iniziale del club del manager
  const userGenders: Gender[] = opts.circuit === 'mixed' ? ['M', 'F'] : [opts.circuit];
  const pairsPerGender = opts.circuit === 'mixed' ? 1 : 2;
  const baseLevel = opts.difficulty === 'easy' ? 11.3 : opts.difficulty === 'hard' ? 9.6 : 10.4;
  for (const gender of userGenders) {
    for (let k = 0; k < pairsPerGender; k++) {
      const lv = baseLevel - k * 0.6;
      const duo = (['blocker', 'defender'] as const).map((role) => {
        const p = generatePlayer(rng, {
          id: newId(state, 'p'),
          gender,
          level: lv + rng.normal(0, 0.5),
          age: rng.int(21, 30),
          role,
          season: 1,
        });
        p.contract = { clubId: 'c0', salary: salaryDemand(p), untilSeason: 1 + rng.int(0, 2) };
        p.prevPoints = Math.max(0, Math.round(rng.normal(500, 150)));
        p.morale = 72;
        return add(p);
      });
      const pair = formPairMut(state, duo[0], duo[1]);
      pair.chemistry = 45;
      pair.matchesTogether = 8;
    }
    // Un giovane promettente
    const youth = generatePlayer(rng, {
      id: newId(state, 'p'),
      gender,
      level: baseLevel - 2.5,
      age: 18,
      season: 1,
    });
    youth.hidden.potential = clamp(youth.hidden.potential + 2, 0, 19);
    youth.contract = { clubId: 'c0', salary: salaryDemand(youth), untilSeason: 3 };
    add(youth);
  }

  // Staff iniziale
  state.staff = [
    generateStaff(rng, newId(state, 's'), 'coach', 2),
    generateStaff(rng, newId(state, 's'), 'fitness', 1),
    generateStaff(rng, newId(state, 's'), 'physio', 1),
  ];
  state.staffMarket = generateStaffMarket(state, rng);
  state.sponsorOffers = generateSponsorOffers(rng, userClub.reputation, 1, () =>
    newId(state, 'sp'),
  );

  state.news.push({
    id: newId(state, 'n'),
    season: 1,
    week: 1,
    key: 'news.welcome',
    params: { manager: state.manager.name, club: userClub.name },
    important: true,
  });
  startWeekMut(state);
  return state;
}
