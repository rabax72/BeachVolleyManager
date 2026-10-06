import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, FastForward, Play, SkipForward } from 'lucide-react';
import { useGame, useGameState } from '../../store/gameStore';
import { isUserPair } from '../../engine/pairs';
import {
  completeTournamentMut,
  defById,
  pairName,
  playTournamentPhase,
  produce,
} from '../../engine/season';
import { groupStandings, pendingMatches } from '../../engine/tournament';
import type { GameState, MatchSummary } from '../../engine/types';
import { formatMoney, t } from '../../i18n';
import { Badge, Card, EmptyState, PageHeader } from '../../ui/components';
import { tournamentTitle } from '../../ui/text';
import { ConditionsLine } from '../../ui/ConditionsLine';

function MatchRow({ m, g }: { m: MatchSummary; g: GameState }) {
  const user = m.pairIds.map((id) => !!g.pairs[id] && isUserPair(g, g.pairs[id]));
  const name = (i: 0 | 1) => (
    <span className={`${m.winner === i ? 'font-bold' : ''} ${user[i] ? 'text-sea-800' : ''}`}>
      {pairName(g, m.pairIds[i])}
    </span>
  );
  return (
    <li
      className={`flex flex-wrap items-center gap-x-2 gap-y-0.5 py-1 text-sm ${user[0] || user[1] ? 'rounded bg-sea-50 px-1' : ''}`}
    >
      {name(0)}
      <span className="text-sand-700">{t('tournament.vs')}</span>
      {name(1)}
      <span className="ml-auto text-xs tabular-nums text-sand-700">
        {m.winner === null ? '—' : m.sets.map((s) => `${s[0]}-${s[1]}`).join(', ')}
      </span>
    </li>
  );
}

export function TournamentPage() {
  const { id = '' } = useParams();
  const g = useGameState();
  const live = useGame((s) => s.live);
  const update = useGame((s) => s.update);
  const startLive = useGame((s) => s.startLive);
  const navigate = useNavigate();
  const def = defById(g, id);
  const tour = g.tournaments[id];
  if (!def) return <EmptyState>{t('common.noData')}</EmptyState>;

  const header = (
    <>
      <Link to="/gioco/calendario" className="btn btn-ghost mb-2">
        <ArrowLeft size={16} aria-hidden /> {t('nav.calendar')}
      </Link>
      <PageHeader
        title={tournamentTitle(def)}
        subtitle={
          <span className="flex flex-col gap-1">
            <span>
              {t(`gender.${def.gender}`)} · {t('common.weekShort', { week: def.week })} ·{' '}
              {t('calendar.prizePool')}: {formatMoney(def.prizePool)}
            </span>
            <ConditionsLine def={def} />
          </span>
        }
      />
    </>
  );
  if (!tour) {
    return (
      <div>
        {header}
        <EmptyState>{t('tournament.notDrawn')}</EmptyState>
      </div>
    );
  }

  const isCurrent = def.week === g.week && tour.phase !== 'done';
  const pending = pendingMatches(tour);
  const userPending = pending.filter((m) =>
    m.pairIds.some((pid) => g.pairs[pid] && isUserPair(g, g.pairs[pid])),
  );
  const liveHere = live?.defId === id;
  const ko = (stage: string) => tour.knockout.filter((m) => m.stage === stage);

  return (
    <div>
      {header}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge tone="sea">{t(`tournament.phase.${tour.phase}`)}</Badge>
        {isCurrent && (
          <>
            <button
              className="btn btn-secondary"
              disabled={!!live}
              title={live ? t('tournament.liveBlocked') : undefined}
              onClick={() => update((s) => playTournamentPhase(s, id))}
            >
              <SkipForward size={16} aria-hidden /> {t('tournament.playPhase')}
            </button>
            <button
              className="btn btn-secondary"
              disabled={!!live}
              onClick={() => update((s) => produce(s, (d) => completeTournamentMut(d, id)))}
            >
              <FastForward size={16} aria-hidden /> {t('tournament.playAll')}
            </button>
          </>
        )}
        {live && <span className="text-sm text-coral-600">{t('tournament.liveBlocked')}</span>}
      </div>

      {isCurrent && userPending.length > 0 && (
        <Card title={t('tournament.yourMatches')} className="mb-4">
          <ul className="space-y-2">
            {userPending.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">
                  {pairName(g, m.pairIds[0])} {t('tournament.vs')} {pairName(g, m.pairIds[1])}
                </span>
                <Badge>{t(`tournament.stage.${m.stage}`)}</Badge>
                <button
                  className="btn btn-primary ml-auto"
                  disabled={!!live && !liveHere}
                  onClick={() => {
                    if (!liveHere) startLive(id, m.id);
                    navigate('/gioco/partita');
                  }}
                >
                  <Play size={16} aria-hidden /> {t('common.playLive')}
                </button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {tour.knockout.length > 0 && (
        <Card title={t('tournament.knockout')} className="mb-4">
          <div className="grid gap-4 md:grid-cols-3">
            {(['QF', 'SF', 'F'] as const).map((stage) => (
              <div key={stage}>
                <h3 className="mb-1 text-sm font-bold text-sea-900">
                  {t(`tournament.stage.${stage}`)}
                </h3>
                {ko(stage).length === 0 ? (
                  <p className="text-sm text-sand-700">{t('tournament.tbd')}</p>
                ) : (
                  <ul className="divide-y divide-sand-100">
                    {ko(stage).map((m) => (
                      <MatchRow key={m.id} m={m} g={g} />
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      <h2 className="mb-2 text-lg font-bold text-sea-900">{t('tournament.groups')}</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {tour.groups.map((gr) => {
          const st = groupStandings(gr, tour.entries);
          return (
            <Card key={gr.name} title={t('tournament.group', { name: gr.name })}>
              <div className="overflow-x-auto">
                <table className="table-dense mb-2">
                  <thead>
                    <tr>
                      <th scope="col">#</th>
                      <th scope="col">{t('common.pair')}</th>
                      <th scope="col" className="text-right" title={t('common.matches')}>
                        {t('tournament.played')}
                      </th>
                      <th scope="col" className="text-right" title={t('common.wins')}>
                        {t('tournament.won')}
                      </th>
                      <th scope="col" className="text-right">
                        {t('tournament.sets')}
                      </th>
                      <th scope="col" className="text-right">
                        {t('common.points')}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {st.map((s, i) => {
                      const user = !!g.pairs[s.pairId] && isUserPair(g, g.pairs[s.pairId]);
                      return (
                        <tr key={s.pairId} className={user ? 'bg-sea-50 font-semibold' : ''}>
                          <td>{i + 1}</td>
                          <td>
                            {pairName(g, s.pairId)}
                            {tour.placements[s.pairId] && (
                              <span className="ml-1 text-xs text-sand-700">
                                ({t(`tournament.placement.${tour.placements[s.pairId]}`)})
                              </span>
                            )}
                          </td>
                          <td className="num">{s.played}</td>
                          <td className="num">{s.wins}</td>
                          <td className="num">
                            {s.setsWon}-{s.setsLost}
                          </td>
                          <td className="num">
                            {s.pointsWon}-{s.pointsLost}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <ul className="divide-y divide-sand-100">
                {gr.matches.map((m) => (
                  <MatchRow key={m.id} m={m} g={g} />
                ))}
              </ul>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
