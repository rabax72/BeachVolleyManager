// Diagnostica economia: npx tsx src/engine/dev/economy.ts
import { acceptSponsor } from '../actions';
import { newGame } from '../newGame';
import { userPairs, userPlayers } from '../pairs';
import { advanceWeek, registerPair, registrationError } from '../season';
import type { CircuitChoice, GameState } from '../types';

for (const circuit of ['M', 'mixed'] as CircuitChoice[]) {
  let s: GameState = newGame({
    managerName: 'x',
    clubName: 'y',
    circuit,
    difficulty: 'normal',
    seed: 99,
  });
  const sal = userPlayers(s).reduce((a, p) => a + p.contract.salary, 0);
  const staff = s.staff.reduce((a, m) => a + m.weeklySalary, 0);
  console.log(circuit, 'salaries/wk', sal, 'staff/wk', staff, 'balance', s.finance.balance);
  console.log(
    'sponsor offers',
    s.sponsorOffers.map((o) => o.weeklyIncome),
  );
  for (const o of [...s.sponsorOffers].slice(0, 2)) s = acceptSponsor(s, o.id);
  for (let season = 0; season < 3; season++) {
    // iscrive ogni coppia al torneo migliore possibile ogni 2 settimane
    for (const pair of userPairs(s)) {
      let last = -10;
      for (const d of s.calendar
        .filter((x) => x.gender === pair.gender)
        .sort((a, b) => b.tier.localeCompare(a.tier))) {
        if (d.week - last < 2) continue;
        if (!registrationError(s, pair.id, d.id)) {
          s = registerPair(s, pair.id, d.id);
          last = d.week;
        }
      }
    }
    const start = s.season;
    while (s.season === start && !s.gameOver) s = advanceWeek(s);
    const best = s.clubHistory.at(-1);
    console.log(
      `season ${start}: balance ${s.finance.balance} rep ${best?.reputation} bestRank ${best?.bestRank} titles ${best?.titles} gameOver ${s.gameOver}`,
    );
    for (const o of s.sponsorOffers.slice(0, 2 - s.sponsors.length)) s = acceptSponsor(s, o.id);
  }
}
