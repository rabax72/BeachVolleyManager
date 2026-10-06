/** Eventi casuali settimanali che coinvolgono il club del manager. */
import { addTransaction } from './finance';
import { fullName, clamp } from './player';
import { userPairs, userPlayers } from './pairs';
import type { Rng } from './rng';
import type { AttributeKey, GameState, Player } from './types';
import { TECHNICAL_KEYS } from './types';

export type EventKey =
  | 'partnerArgument'
  | 'greatInterview'
  | 'localDonation'
  | 'flu'
  | 'fanSupport'
  | 'mediaCriticism'
  | 'equipmentDeal'
  | 'travelIssue'
  | 'extraTraining'
  | 'nightOut';

interface EventDef {
  key: EventKey;
  weight: (s: GameState) => number;
  apply: (
    s: GameState,
    rng: Rng,
    push: (key: string, params: Record<string, string | number>, important?: boolean) => void,
  ) => void;
}

const pickPlayer = (
  s: GameState,
  rng: Rng,
  filter: (p: Player) => boolean = () => true,
): Player | null => {
  const list = userPlayers(s).filter(filter);
  return list.length ? rng.pick(list) : null;
};

const EVENTS: EventDef[] = [
  {
    key: 'partnerArgument',
    weight: (s) =>
      userPairs(s).length === 0
        ? 0
        : 1 +
          userPlayers(s).filter(
            (p) => p.hidden.character === 'volatile' || p.hidden.character === 'fiery',
          ).length *
            0.8,
    apply: (s, rng, push) => {
      const pair = rng.pick(userPairs(s));
      pair.chemistry = clamp(pair.chemistry - 8, 0, 100);
      const [a, b] = pair.playerIds.map((id) => s.players[id]);
      a.morale = clamp(a.morale - 8, 0, 100);
      b.morale = clamp(b.morale - 8, 0, 100);
      push('event.partnerArgument', { a: fullName(a), b: fullName(b) }, true);
    },
  },
  {
    key: 'greatInterview',
    weight: () => 1,
    apply: (s, rng, push) => {
      const p = pickPlayer(s, rng);
      if (!p) return;
      p.morale = clamp(p.morale + 8, 0, 100);
      push('event.greatInterview', { player: fullName(p) });
    },
  },
  {
    key: 'localDonation',
    weight: (s) => (s.finance.balance < 10000 ? 1.5 : 0.6),
    apply: (s, rng, push) => {
      const amount = rng.int(10, 30) * 100;
      addTransaction(s, 'event', amount, 'event.localDonation');
      push('event.localDonation', { amount });
    },
  },
  {
    key: 'flu',
    weight: (s) => (s.week >= 27 || s.week <= 3 ? 1.6 : 0.7),
    apply: (s, rng, push) => {
      const p = pickPlayer(s, rng, (x) => !x.injury);
      if (!p) return;
      p.fatigue = clamp(p.fatigue + 20, 0, 100);
      p.form = clamp(p.form - 10, 0, 100);
      push('event.flu', { player: fullName(p) }, true);
    },
  },
  {
    key: 'fanSupport',
    weight: () => 0.8,
    apply: (s, _rng, push) => {
      userPlayers(s).forEach((p) => (p.morale = clamp(p.morale + 4, 0, 100)));
      push('event.fanSupport', {});
    },
  },
  {
    key: 'mediaCriticism',
    weight: () => 0.7,
    apply: (s, rng, push) => {
      const p = pickPlayer(s, rng);
      if (!p) return;
      const hit = p.hidden.character === 'calm' || p.hidden.character === 'professional' ? 2 : 7;
      p.morale = clamp(p.morale - hit, 0, 100);
      push('event.mediaCriticism', { player: fullName(p) });
    },
  },
  {
    key: 'equipmentDeal',
    weight: () => 0.6,
    apply: (s, rng, push) => {
      const amount = rng.int(5, 15) * 100;
      addTransaction(s, 'event', amount, 'event.equipmentDeal');
      push('event.equipmentDeal', { amount });
    },
  },
  {
    key: 'travelIssue',
    weight: (s) => (s.week >= 4 && s.week <= 26 ? 0.8 : 0),
    apply: (s, rng, push) => {
      const amount = rng.int(3, 9) * 100;
      addTransaction(s, 'event', -amount, 'event.travelIssue');
      push('event.travelIssue', { amount });
    },
  },
  {
    key: 'extraTraining',
    weight: (s) => userPlayers(s).filter((p) => p.hidden.character === 'professional').length * 0.7,
    apply: (s, rng, push) => {
      const p = pickPlayer(s, rng, (x) => x.hidden.character === 'professional');
      if (!p) return;
      const k: AttributeKey = rng.pick(TECHNICAL_KEYS);
      p.attrs[k] = clamp(p.attrs[k] + 0.35, 1, 20);
      push('event.extraTraining', { player: fullName(p), attr: k });
    },
  },
  {
    key: 'nightOut',
    weight: (s) =>
      userPlayers(s).filter((p) => p.hidden.character === 'volatile' || p.age < 23).length * 0.4,
    apply: (s, rng, push) => {
      const p = pickPlayer(s, rng, (x) => x.hidden.character === 'volatile' || x.age < 23);
      if (!p) return;
      p.fatigue = clamp(p.fatigue + 15, 0, 100);
      p.morale = clamp(p.morale + 5, 0, 100);
      push('event.nightOut', { player: fullName(p) });
    },
  },
];

/** Probabilità settimanale che accada un evento. */
export const EVENT_CHANCE = 0.3;

export function rollWeeklyEventMut(
  s: GameState,
  rng: Rng,
  push: (key: string, params: Record<string, string | number>, important?: boolean) => void,
): EventKey | null {
  if (!rng.chance(EVENT_CHANCE)) return null;
  const weights = EVENTS.map((e) => Math.max(0, e.weight(s)));
  if (weights.every((w) => w === 0)) return null;
  const ev = rng.weighted(EVENTS, weights);
  ev.apply(s, rng, push);
  return ev.key;
}
