import { Link } from 'react-router-dom';
import { AlertTriangle, CalendarClock, Newspaper, Trophy, Wallet, UsersRound } from 'lucide-react';
import { TutorialBanner } from '../tutorial/TutorialBanner';
import { useGameState } from '../../store/gameStore';
import { activePairOf, userPairs, userPlayers } from '../../engine/pairs';
import { fullName } from '../../engine/player';
import { pairEntryRanking } from '../../engine/ranking';
import { clubSeasonStatsWithRank, pairName, weekDefs } from '../../engine/season';
import { MAX_SPONSORS, NEGATIVE_WARNING_WEEKS, objectiveProgress } from '../../engine/finance';
import { STAFF_ROLES } from '../../engine/generation';
import { formatMoney, t, tg } from '../../i18n';
import { Badge, Card, EmptyState, Meter, PageHeader, Stat } from '../../ui/components';
import { newsText, objectiveText, tournamentTitle } from '../../ui/text';
import { PlayerAvatar } from '../../ui/avatar/Avatar';
import type { GameState } from '../../engine/types';

function alertsFor(g: GameState): { text: string; tone: 'bad' | 'warn'; to: string }[] {
  const out: { text: string; tone: 'bad' | 'warn'; to: string }[] = [];
  const roster = userPlayers(g);
  for (const p of roster) {
    if (p.injury) {
      out.push({
        tone: 'bad',
        to: `/gioco/giocatore/${p.id}`,
        text: tg('dashboard.alertInjury', p.gender, {
          player: fullName(p),
          injury: t(`injury.${p.injury.key}`),
          weeks: p.injury.weeksLeft,
        }),
      });
    }
    if (p.contract.untilSeason <= g.season) {
      out.push({
        tone: 'warn',
        to: `/gioco/giocatore/${p.id}`,
        text: t('dashboard.alertContract', { player: fullName(p) }),
      });
    }
    if (p.fatigue >= 70)
      out.push({
        tone: 'warn',
        to: '/gioco/allenamento',
        text: tg('dashboard.alertFatigue', p.gender, { player: fullName(p), n: p.fatigue }),
      });
    if (p.morale <= 35)
      out.push({
        tone: 'warn',
        to: `/gioco/giocatore/${p.id}`,
        text: t('dashboard.alertMorale', { player: fullName(p), n: p.morale }),
      });
    if (!activePairOf(g, p.id))
      out.push({
        tone: 'warn',
        to: '/gioco/coppie',
        text: t('dashboard.alertNoPair', { player: fullName(p) }),
      });
  }
  if (g.finance.negativeWeeks >= 1) {
    out.push({
      tone: g.finance.negativeWeeks >= NEGATIVE_WARNING_WEEKS ? 'bad' : 'warn',
      to: '/gioco/finanze',
      text: t('dashboard.alertBalance', { n: g.finance.negativeWeeks }),
    });
  }
  if (g.sponsors.length < MAX_SPONSORS && g.sponsorOffers.length > 0) {
    out.push({ tone: 'warn', to: '/gioco/finanze', text: t('dashboard.alertSponsors') });
  }
  for (const role of STAFF_ROLES) {
    if (!g.staff.some((m) => m.role === role))
      out.push({
        tone: 'warn',
        to: '/gioco/staff',
        text: t('dashboard.alertStaff', { role: t(`staff.roles.${role}`) }),
      });
  }
  return out;
}

export function DashboardPage() {
  const g = useGameState();
  const pairs = userPairs(g);
  const thisWeek = weekDefs(g, g.week).filter(
    (d) =>
      g.tournaments[d.id] &&
      g.tournaments[d.id].entries.some((id) => pairs.some((p) => p.id === id)),
  );
  const upcoming = g.calendar
    .filter((d) => d.week > g.week && (g.registrations[d.id] ?? []).length > 0)
    .slice(0, 6);
  const alerts = alertsFor(g);
  const weeklyCosts =
    userPlayers(g).reduce((a, p) => a + p.contract.salary, 0) +
    g.staff.reduce((a, m) => a + m.weeklySalary, 0);
  const weeklyIncome = g.sponsors.reduce((a, s) => a + s.weeklyIncome, 0);
  const news = [...g.news].reverse().slice(0, 14);
  const board = objectiveProgress(g.boardObjective, clubSeasonStatsWithRank(g), g.finance.balance);

  return (
    <div>
      <PageHeader title={t('dashboard.title')} />
      <TutorialBanner />
      {g.gameOver && (
        <p
          role="alert"
          className="mb-4 rounded-md border border-red-300 bg-red-100 p-3 font-semibold text-red-900"
        >
          {t('dashboard.gameOver')}
        </p>
      )}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card
          title={
            <>
              <Trophy size={18} aria-hidden /> {t('dashboard.thisWeek')}
            </>
          }
          className="lg:col-span-2"
        >
          {thisWeek.length === 0 ? (
            <EmptyState>
              {weekDefs(g, g.week).length ? t('dashboard.noEvents') : t('calendar.noEvents')}
            </EmptyState>
          ) : (
            <ul className="space-y-2">
              {thisWeek.map((d) => (
                <li
                  key={d.id}
                  className="flex flex-wrap items-center gap-2 rounded-md bg-sea-50 p-3"
                >
                  <span className="font-semibold text-sea-900">
                    {t('dashboard.tournamentInProgress', { name: tournamentTitle(d) })}
                  </span>
                  <Badge tone="sea">{t(`tournament.phase.${g.tournaments[d.id].phase}`)}</Badge>
                  <Link className="btn btn-primary ml-auto" to={`/gioco/torneo/${d.id}`}>
                    {t('dashboard.goToTournament')}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <h3 className="mt-4 mb-2 flex items-center gap-2 text-sm font-bold text-sea-900">
            <CalendarClock size={16} aria-hidden /> {t('dashboard.nextEvents')}
          </h3>
          {upcoming.length === 0 ? (
            <EmptyState>
              {t('dashboard.noEvents')}{' '}
              <Link className="font-semibold text-sea-700 underline" to="/gioco/calendario">
                {t('nav.calendar')}
              </Link>
            </EmptyState>
          ) : (
            <ul className="divide-y divide-sand-100 text-sm">
              {upcoming.map((d) => (
                <li key={d.id} className="flex flex-wrap items-center gap-2 py-1.5">
                  <Badge>{t('common.weekShort', { week: d.week })}</Badge>
                  <span className="font-semibold">{tournamentTitle(d)}</span>
                  <span className="text-sand-700">
                    {(g.registrations[d.id] ?? []).map((id) => pairName(g, id)).join(', ')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title={
            <>
              <AlertTriangle size={18} aria-hidden /> {t('dashboard.alerts')}
            </>
          }
        >
          {alerts.length === 0 ? (
            <p className="text-sm text-palm-700">{t('dashboard.noAlerts')}</p>
          ) : (
            <ul className="space-y-1.5 text-sm">
              {alerts.map((a, i) => (
                <li key={i}>
                  <Link
                    to={a.to}
                    className={`block rounded-md border px-2.5 py-1.5 hover:underline ${a.tone === 'bad' ? 'border-red-200 bg-red-50 text-red-900' : 'border-amber-200 bg-amber-50 text-amber-950'}`}
                  >
                    {a.text}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          title={
            <>
              <Wallet size={18} aria-hidden /> {t('dashboard.finances')}
            </>
          }
        >
          <div className="grid grid-cols-2 gap-2">
            <Stat label={t('finance.balance')} value={formatMoney(g.finance.balance)} />
            <Stat label={t('finance.prizeMoney')} value={formatMoney(g.clubSeason.prizeMoney)} />
            <Stat label={t('finance.weeklyCosts')} value={formatMoney(weeklyCosts)} />
            <Stat label={t('finance.weeklyIncome')} value={formatMoney(weeklyIncome)} />
          </div>
          <div className="mt-3 text-sm">
            <div className="label">{t('finance.board')}</div>
            <p>{objectiveText(g.boardObjective, g)}</p>
            <Badge tone={board.met ? 'good' : 'neutral'}>
              {board.met ? t('objective.met') : t('objective.notMet')}
            </Badge>
          </div>
        </Card>

        <Card
          title={
            <>
              <UsersRound size={18} aria-hidden /> {t('dashboard.myPairs')}
            </>
          }
          className="lg:col-span-2"
        >
          {pairs.length === 0 ? (
            <EmptyState>{t('pairs.intro')}</EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-dense">
                <thead>
                  <tr>
                    <th scope="col">{t('common.pair')}</th>
                    <th scope="col">{t('common.gender')}</th>
                    <th scope="col">{t('common.chemistry')}</th>
                    <th scope="col">{t('common.fatigue')}</th>
                    <th scope="col" className="text-right">
                      {t('pairs.entryRank')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pairs.map((p) => {
                    const rank =
                      pairEntryRanking(g.pairs, g.players, p.gender).findIndex(
                        (x) => x.id === p.id,
                      ) + 1;
                    const fat =
                      (g.players[p.playerIds[0]].fatigue + g.players[p.playerIds[1]].fatigue) / 2;
                    return (
                      <tr key={p.id}>
                        <td className="font-semibold">
                          <span className="inline-flex items-center gap-2">
                            <span className="inline-flex -space-x-2">
                              {p.playerIds.map((id) => (
                                <PlayerAvatar
                                  key={id}
                                  player={g.players[id]}
                                  size={30}
                                  decorative
                                />
                              ))}
                            </span>
                            <Link className="text-sea-800 hover:underline" to="/gioco/coppie">
                              {pairName(g, p.id)}
                            </Link>
                          </span>
                        </td>
                        <td>{t(`gender.${p.gender}`)}</td>
                        <td>
                          <Meter value={p.chemistry} label={t('common.chemistry')} />
                        </td>
                        <td>
                          <Meter value={fat} label={t('common.fatigue')} invert />
                        </td>
                        <td className="num">{rank}°</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card
          title={
            <>
              <Newspaper size={18} aria-hidden /> {t('dashboard.news')}
            </>
          }
          className="lg:col-span-3"
        >
          <ul className="divide-y divide-sand-100 text-sm">
            {news.map((n) => (
              <li key={n.id} className="flex gap-3 py-1.5">
                <span className="w-16 shrink-0 text-xs text-sand-700">
                  {t('common.weekShort', { week: n.week })}
                </span>
                <span className={n.important ? 'font-semibold text-sea-900' : ''}>
                  {newsText(n, g)}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
