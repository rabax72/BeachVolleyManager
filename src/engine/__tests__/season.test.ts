import { describe, expect, it } from 'vitest';
import { acceptSponsor, formPair, makeOffer, setTraining, splitPair } from '../actions';
import { newGame } from '../newGame';
import { userPairs, userPlayers } from '../pairs';
import { playerOverall } from '../player';
import { advanceWeek, registerPair, registrationError, weekDefs } from '../season';
import { createRng } from '../rng';
import { generatePlayer } from '../generation';
import { ageGrowthFactor, weeklyTraining } from '../training';
import type { GameState } from '../types';
import { SEASON_WEEKS } from '../../data/world';

const opts = {
  managerName: 'Test',
  clubName: 'Test BV',
  circuit: 'M' as const,
  difficulty: 'normal' as const,
  seed: 12345,
};

function playSeason(s: GameState): GameState {
  const season = s.season;
  let guard = 0;
  while (s.season === season && guard++ < 40) s = advanceWeek(s);
  return s;
}

describe('generazione del mondo', () => {
  const s = newGame(opts);

  it('genera almeno 120 giocatori in circuiti maschile e femminile', () => {
    const players = Object.values(s.players);
    expect(players.length).toBeGreaterThanOrEqual(120);
    expect(players.filter((p) => p.gender === 'M').length).toBeGreaterThan(60);
    expect(players.filter((p) => p.gender === 'F').length).toBeGreaterThan(60);
  });

  it('attributi nel range 1–20 e dati anagrafici plausibili', () => {
    for (const p of Object.values(s.players)) {
      for (const v of Object.values(p.attrs)) {
        expect(v).toBeGreaterThanOrEqual(1);
        expect(v).toBeLessThanOrEqual(20);
      }
      expect(p.age).toBeGreaterThanOrEqual(16);
      expect(p.age).toBeLessThanOrEqual(40);
      expect(p.hidden.potential).toBeGreaterThanOrEqual(playerOverall(p) - 0.01);
      expect(p.firstName.length).toBeGreaterThan(1);
    }
  });

  it('il club del manager ha coppie e giocatori sotto contratto', () => {
    expect(userPlayers(s).length).toBe(5);
    expect(userPairs(s).length).toBe(2);
  });

  it('è deterministico dato il seed', () => {
    const a = newGame(opts);
    const b = newGame(opts);
    a.createdAt = b.createdAt;
    expect(a).toEqual(b);
  });
});

describe('progressione', () => {
  it('i giovani crescono più dei veterani', () => {
    const rng = createRng(5);
    const young = generatePlayer(rng, { id: 'y', gender: 'M', level: 9, age: 18, season: 1 });
    young.hidden.potential = 18;
    const old = generatePlayer(rng, { id: 'o', gender: 'M', level: 9, age: 31, season: 1 });
    old.hidden.potential = 18;
    let y = young;
    let o = old;
    const staff = { coach: 3, fitness: 3, physio: 3, analyst: 0 };
    for (let w = 0; w < 30; w++) {
      y = weeklyTraining(
        { ...y, injury: null },
        { focus: 'balanced', intensity: 'medium' },
        staff,
        rng,
        0,
      ).player;
      o = weeklyTraining(
        { ...o, injury: null },
        { focus: 'balanced', intensity: 'medium' },
        staff,
        rng,
        0,
      ).player;
    }
    expect(playerOverall(y) - playerOverall(young)).toBeGreaterThan(
      playerOverall(o) - playerOverall(old),
    );
    expect(ageGrowthFactor(19)).toBeGreaterThan(ageGrowthFactor(30));
  });

  it("l'allenamento intenso aumenta la fatica", () => {
    const rng = createRng(9);
    const p = generatePlayer(rng, { id: 'x', gender: 'F', level: 10, age: 24, season: 1 });
    p.fatigue = 30;
    const staff = { coach: 1, fitness: 1, physio: 1, analyst: 0 };
    const hi = weeklyTraining(
      p,
      { focus: 'attack', intensity: 'high' },
      staff,
      createRng(1),
      0,
    ).player;
    const rest = weeklyTraining(
      p,
      { focus: 'rest', intensity: 'low' },
      staff,
      createRng(1),
      0,
    ).player;
    expect(hi.fatigue).toBeGreaterThan(rest.fatigue);
  });

  it('dopo i 30 anni gli attributi fisici calano', () => {
    const rng = createRng(3);
    const p = generatePlayer(rng, { id: 'v', gender: 'M', level: 14, age: 35, season: 1 });
    p.hidden.potential = playerOverall(p);
    let q = p;
    for (let w = 0; w < 30; w++) {
      q = weeklyTraining(
        { ...q, injury: null },
        { focus: 'rest', intensity: 'low' },
        { coach: 1, fitness: 1, physio: 1, analyst: 0 },
        rng,
        0,
      ).player;
    }
    expect(q.attrs.speed).toBeLessThan(p.attrs.speed);
    expect(q.attrs.jump).toBeLessThan(p.attrs.jump);
  });
});

describe('stagione', () => {
  it('iscrizione: ammessa solo per settimane future e una per settimana', () => {
    let s = newGame(opts);
    const pair = userPairs(s)[0];
    const defs = weekDefs(s, 4).filter((d) => d.gender === 'M');
    const open = defs.find((d) => d.tier === 'open')!;
    const other = defs.find((d) => d.tier !== 'open')!;
    expect(registrationError(s, pair.id, open.id)).toBeNull();
    const before = s.finance.balance;
    s = registerPair(s, pair.id, open.id);
    expect(s.finance.balance).toBe(before - open.entryFee);
    expect(registrationError(s, pair.id, other.id)).toBe('alreadyThisWeek');
    const female = weekDefs(s, 4).find((d) => d.gender === 'F')!;
    expect(registrationError(s, pair.id, female.id)).toBe('wrongGender');
  });

  it('simula una stagione completa, passa alla successiva in tempi rapidi', () => {
    let s = newGame(opts);
    // Iscrive la prima coppia a tutti gli Open
    const pair = userPairs(s)[0];
    for (const d of s.calendar.filter((x) => x.gender === 'M' && x.tier === 'open')) {
      s = registerPair(s, pair.id, d.id);
    }
    s = setTraining(
      s,
      userPlayers(s).map((p) => p.id),
      { focus: 'balanced', intensity: 'medium' },
    );
    const t0 = performance.now();
    s = playSeason(s);
    const elapsed = performance.now() - t0;
    expect(s.season).toBe(2);
    expect(s.week).toBe(1);
    expect(elapsed).toBeLessThan(8000);
    // Albo d'oro: 18 settimane x 2 tornei x 2 generi
    expect(s.honours.length).toBe(72);
    expect(s.rankingHistory.filter((r) => r.season === 1)).toHaveLength(2);
    const top = s.rankingHistory.find((r) => r.gender === 'M')!.top;
    expect(top[0].points).toBeGreaterThan(0);
    // Il salvataggio deve restare compatto
    expect(JSON.stringify(s).length).toBeLessThan(2_500_000);
    // Nuovi talenti e calendario della nuova stagione
    expect(s.calendar[0].id.startsWith('s2')).toBe(true);
  }, 30000);

  it('è deterministico: due stagioni con lo stesso seed coincidono', () => {
    let a = newGame(opts);
    let b = newGame(opts);
    b.createdAt = a.createdAt;
    for (let w = 0; w < 12; w++) {
      a = advanceWeek(a);
      b = advanceWeek(b);
    }
    expect(a).toEqual(b);
  }, 30000);

  it('regge 10 stagioni consecutive', () => {
    let s = newGame({ ...opts, circuit: 'mixed', seed: 777 });
    for (let i = 0; i < 10; i++) {
      for (const o of s.sponsorOffers.slice(0, 2 - s.sponsors.length)) s = acceptSponsor(s, o.id);
      s = playSeason(s);
      expect(s.gameOver).toBe(false);
    }
    expect(s.season).toBe(11);
    const active = Object.values(s.players).filter((p) => !p.retired);
    expect(active.length).toBeGreaterThan(250);
    // Ricambio generazionale: età media plausibile
    const avgAge = active.reduce((a, p) => a + p.age, 0) / active.length;
    expect(avgAge).toBeGreaterThan(21);
    expect(avgAge).toBeLessThan(31);
    expect(JSON.stringify(s).length).toBeLessThan(3_000_000);
  }, 120000);
});

describe('azioni del manager', () => {
  it('forma e scioglie coppie con vincoli', () => {
    let s = newGame(opts);
    const youth = userPlayers(s).find(
      (p) => !userPairs(s).some((k) => k.playerIds.includes(p.id)),
    )!;
    const pair = userPairs(s)[0];
    // Non si può formare con un giocatore già in coppia
    expect(formPair(s, youth.id, pair.playerIds[0])).toBe(s);
    s = splitPair(s, pair.id);
    expect(userPairs(s)).toHaveLength(1);
    s = formPair(s, youth.id, pair.playerIds[0]);
    expect(userPairs(s)).toHaveLength(2);
  });

  it('una trattativa con stipendio troppo basso viene rifiutata', () => {
    const s = newGame(opts);
    const target = Object.values(s.players).find(
      (p) => p.contract.clubId === null && !p.retired && p.gender === 'M',
    )!;
    const { result } = makeOffer(s, target.id, { salary: 10, years: 1 });
    expect(result.accepted).toBe(false);
    const ok = makeOffer(s, target.id, { salary: 5000, years: 2 });
    expect(ok.result.accepted).toBe(true);
    expect(ok.state.players[target.id].contract.clubId).toBe('c0');
  });

  it(`la stagione dura ${SEASON_WEEKS} settimane`, () => {
    let s = newGame(opts);
    for (let i = 0; i < SEASON_WEEKS - 1; i++) s = advanceWeek(s);
    expect(s.week).toBe(SEASON_WEEKS);
    s = advanceWeek(s);
    expect(s.season).toBe(2);
  }, 30000);
});
