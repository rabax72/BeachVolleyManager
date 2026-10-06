/** Generazione del calendario stagionale del circuito. */
import { EVENT_WEEKS, TIER_INFO, VENUES, conditionsFromVenue } from '../data/world';
import { createRng, hashSeed } from './rng';
import type { Gender, Tier, TournamentDef } from './types';

export const TIER_LABEL_KEY: Record<Tier, string> = {
  open: 'tier.open',
  national: 'tier.national',
  challenger: 'tier.challenger',
  elite: 'tier.elite',
};

export const tournamentId = (season: number, week: number, tier: Tier, gender: Gender): string =>
  `s${season}w${week}${tier}${gender}`;

export function generateCalendar(seed: number, season: number): TournamentDef[] {
  const rng = createRng(hashSeed(seed, 'calendar', season));
  const defs: TournamentDef[] = [];
  const usedRecently: string[] = [];
  for (const [weekStr, tiers] of Object.entries(EVENT_WEEKS)) {
    const week = Number(weekStr);
    tiers.forEach((tier) => {
      const candidates = VENUES.filter((v) => !usedRecently.includes(v.name));
      const venue = rng.pick(candidates);
      usedRecently.push(venue.name);
      if (usedRecently.length > 8) usedRecently.shift();
      const info = TIER_INFO[tier];
      const conditions = conditionsFromVenue(venue, () => rng.next());
      for (const gender of ['M', 'F'] as Gender[]) {
        defs.push({
          id: tournamentId(season, week, tier, gender),
          name: venue.name,
          location: venue.name,
          tier,
          gender,
          week,
          prizePool: info.prizePool,
          entryFee: info.entryFee,
          travelCost: Math.round((info.travelBase * (0.6 + venue.distance * 0.25)) / 10) * 10,
          conditions,
        });
      }
    });
  }
  return defs.sort((a, b) => a.week - b.week || tierOrder(b.tier) - tierOrder(a.tier));
}

export const tierOrder = (t: Tier): number =>
  t === 'elite' ? 3 : t === 'challenger' ? 2 : t === 'national' ? 1 : 0;
