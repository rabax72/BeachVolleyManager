import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Circle, FastForward, Hand, Pause, Play, StepForward, Sun } from 'lucide-react';
import { useGame } from '../../store/gameStore';
import {
  canCallTimeout,
  teamTotals,
  unforcedErrors,
  type MatchState,
  type PlayerMatchStats,
  type TeamIndex,
} from '../../engine/match';
import type { Tactics } from '../../engine/types';
import { formatPct, t } from '../../i18n';
import { Badge, Card, EmptyState, Meter, PageHeader, Select } from '../../ui/components';
import { ConditionsLine } from '../../ui/ConditionsLine';
import { defById } from '../../engine/season';
import { tournamentTitle } from '../../ui/text';
import { buildCommentary, teamLabel } from './commentary';
import { TacticsForm } from './TacticsForm';

const SPEEDS = { slow: 1600, normal: 900, fast: 350, instant: 60 } as const;
type SpeedKey = keyof typeof SPEEDS;

function closestSpeed(ms: number): SpeedKey {
  let best: SpeedKey = 'normal';
  for (const [k, v] of Object.entries(SPEEDS) as [SpeedKey, number][]) {
    if (Math.abs(v - ms) < Math.abs(SPEEDS[best] - ms)) best = k;
  }
  return best;
}

function Scoreboard({ s, side }: { s: MatchState; side: TeamIndex }) {
  const current = s.sets[s.setIndex];
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-lg bg-sea-900 p-4 text-white">
      {([0, 1] as TeamIndex[]).map((team) => {
        const tm = s.setup.teams[team];
        const align = team === 0 ? 'text-left' : 'text-right order-3';
        return (
          <div key={team} className={align}>
            <div
              className="flex flex-wrap items-center gap-2 font-bold"
              style={{ justifyContent: team === 0 ? 'flex-start' : 'flex-end' }}
            >
              {team === side && <Badge tone="sea">{t('common.yourClub')}</Badge>}
              <span className="text-lg">{teamLabel(s.setup, team)}</span>
            </div>
            <ul className="mt-1 space-y-0.5 text-sm text-sea-100">
              {tm.players.map((p, i) => {
                const serving = !s.finished && s.servingTeam === team && s.currentServer === i;
                return (
                  <li
                    key={p.id}
                    className="flex items-center gap-1.5"
                    style={{ justifyContent: team === 0 ? 'flex-start' : 'flex-end' }}
                  >
                    {serving && (
                      <Circle
                        size={10}
                        className="fill-sand-300 text-sand-300"
                        aria-label={t('match.serving')}
                      />
                    )}
                    <span>{p.name}</span>
                    <span className="text-xs text-sea-200">({t(`role.${p.role}`)})</span>
                  </li>
                );
              })}
            </ul>
            <div
              className="mt-2 flex flex-wrap items-center gap-2 text-xs"
              style={{ justifyContent: team === 0 ? 'flex-start' : 'flex-end' }}
            >
              {s.timeoutsUsed[team] && <Badge tone="warn">{t('match.timeoutUsed')}</Badge>}
              {s.sunFacing === team && s.setup.conditions.sun > 0 && (
                <span className="inline-flex items-center gap-1 text-sand-200">
                  <Sun size={12} aria-hidden /> {t('conditions.sun')}
                </span>
              )}
            </div>
          </div>
        );
      })}
      <div className="order-2 text-center">
        <div className="text-xs tracking-wide text-sea-200 uppercase">
          {t('match.set', { n: s.setIndex + 1 })}
        </div>
        <div className="text-5xl font-extrabold tabular-nums" aria-live="polite" aria-atomic="true">
          {current[0]}
          <span className="mx-2 text-sea-200">–</span>
          {current[1]}
        </div>
        <div className="mt-1 text-sm text-sea-100">
          {t('match.sets')}:{' '}
          <span className="font-bold tabular-nums">
            {s.setsWon[0]}–{s.setsWon[1]}
          </span>
        </div>
        <div className="mt-1 text-xs text-sea-200 tabular-nums">
          {s.sets
            .slice(0, s.finished ? s.sets.length : s.setIndex)
            .map((x) => `${x[0]}-${x[1]}`)
            .join(' · ')}
        </div>
      </div>
    </div>
  );
}

function statRow(st: PlayerMatchStats, points: number) {
  return {
    aces: st.aces,
    serveErrors: st.serveErrors,
    receptionPct: st.receptions ? formatPct((st.goodReceptions / st.receptions) * 100) : '—',
    kills: st.kills,
    attackPct: st.attacks ? formatPct((st.kills / st.attacks) * 100) : '—',
    blocks: st.blocks,
    digs: st.digs,
    unforced: unforcedErrors(st),
    points,
  };
}

function StatsTable({ s }: { s: MatchState }) {
  const totals = ([0, 1] as TeamIndex[]).map((team) =>
    statRow(
      teamTotals(s.stats[team]),
      s.sets.reduce((a, x) => a + x[team], 0),
    ),
  );
  const keys = Object.keys(totals[0]) as (keyof (typeof totals)[0])[];
  return (
    <div className="overflow-x-auto">
      <table className="table-dense">
        <thead>
          <tr>
            <th scope="col">{teamLabel(s.setup, 0)}</th>
            <th scope="col" className="text-center">
              {t('match.stats')}
            </th>
            <th scope="col" className="text-right">
              {teamLabel(s.setup, 1)}
            </th>
          </tr>
        </thead>
        <tbody>
          {keys.map((k) => (
            <tr key={k}>
              <td className="tabular-nums">{totals[0][k]}</td>
              <td className="text-center text-sand-700">{t(`match.statLabels.${k}`)}</td>
              <td className="num">{totals[1][k]}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3 className="mt-4 mb-1 text-sm font-bold text-sea-900">{t('common.players')}</h3>
      <table className="table-dense">
        <thead>
          <tr>
            <th scope="col">{t('common.player')}</th>
            <th scope="col" className="text-right">
              {t('match.statLabels.points')}
            </th>
            <th scope="col" className="text-right">
              {t('match.statLabels.aces')}
            </th>
            <th scope="col" className="text-right">
              {t('match.statLabels.kills')}
            </th>
            <th scope="col" className="text-right">
              {t('match.statLabels.blocks')}
            </th>
            <th scope="col" className="text-right">
              {t('match.statLabels.digs')}
            </th>
            <th scope="col" className="text-right">
              {t('match.statLabels.receptionPct')}
            </th>
            <th scope="col" className="text-right">
              {t('match.statLabels.unforced')}
            </th>
          </tr>
        </thead>
        <tbody>
          {([0, 1] as TeamIndex[]).flatMap((team) =>
            s.setup.teams[team].players.map((p, i) => {
              const st = s.stats[team][i];
              return (
                <tr key={p.id}>
                  <td>{p.name}</td>
                  <td className="num">{st.points}</td>
                  <td className="num">{st.aces}</td>
                  <td className="num">{st.kills}</td>
                  <td className="num">{st.blocks}</td>
                  <td className="num">{st.digs}</td>
                  <td className="num">
                    {st.receptions ? formatPct((st.goodReceptions / st.receptions) * 100) : '—'}
                  </td>
                  <td className="num">{unforcedErrors(st)}</td>
                </tr>
              );
            }),
          )}
        </tbody>
      </table>
    </div>
  );
}

export function MatchPage() {
  const live = useGame((s) => s.live);
  const game = useGame((s) => s.game);
  const settings = useGame((s) => s.settings);
  const { liveStep, liveTimeout, liveTactics, liveFinish, liveCommit, showToast } =
    useGame.getState();
  const navigate = useNavigate();
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState<SpeedKey>(closestSpeed(settings.matchSpeed));
  const [onlyHighlights, setOnlyHighlights] = useState(false);
  const [draft, setDraft] = useState<Tactics | null>(null);

  const finished = live?.state.finished ?? false;
  useEffect(() => {
    if (!playing || finished) return;
    const id = setInterval(() => useGame.getState().liveStep(), SPEEDS[speed]);
    return () => clearInterval(id);
  }, [playing, finished, speed]);

  const commentary = useMemo(
    () => (live ? buildCommentary(live.state.setup, live.state.events) : []),
    [live],
  );

  if (!live || !game) {
    return (
      <div>
        <PageHeader title={t('match.title')} />
        <EmptyState>
          {t('match.noMatch')}{' '}
          <Link to="/gioco/calendario" className="font-semibold text-sea-700 underline">
            {t('nav.calendar')}
          </Link>
        </EmptyState>
      </div>
    );
  }
  const s = live.state;
  const side = live.side;
  const def = defById(game, live.defId);
  const tactics = draft ?? s.tactics[side];
  const lines = [...commentary].reverse().filter((l) => !onlyHighlights || l.highlight);
  const won = s.winner === side;

  return (
    <div>
      <PageHeader
        title={t('match.title')}
        subtitle={
          def && (
            <span className="flex flex-col gap-1">
              <span>{tournamentTitle(def)}</span>
              <ConditionsLine def={def} />
            </span>
          )
        }
      />
      <Scoreboard s={s} side={side} />

      {s.finished ? (
        <div
          className={`mt-4 flex flex-wrap items-center gap-3 rounded-lg p-4 ${won ? 'bg-green-100 text-green-900' : 'bg-red-100 text-red-900'}`}
          role="status"
        >
          <span className="text-xl font-extrabold">{won ? t('match.won') : t('match.lost')}</span>
          <span className="tabular-nums">{s.sets.map((x) => `${x[0]}-${x[1]}`).join(', ')}</span>
          <button
            className="btn btn-primary ml-auto"
            onClick={() => {
              const defId = live.defId;
              liveCommit();
              navigate(`/gioco/torneo/${defId}`);
            }}
          >
            {t('match.backToTournament')}
          </button>
        </div>
      ) : (
        <div className="mt-4 flex flex-wrap items-end gap-2">
          <button
            className="btn btn-primary"
            onClick={() => setPlaying(!playing)}
            aria-pressed={playing}
          >
            {playing ? <Pause size={16} aria-hidden /> : <Play size={16} aria-hidden />}
            {playing ? t('match.pause') : t('match.play')}
          </button>
          <button className="btn btn-secondary" onClick={liveStep} disabled={playing}>
            <StepForward size={16} aria-hidden /> {t('match.step')}
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => {
              liveTimeout();
              showToast(t('match.timeout'));
            }}
            disabled={!canCallTimeout(s, side)}
          >
            <Hand size={16} aria-hidden />{' '}
            {s.timeoutsUsed[side] ? t('match.timeoutUsed') : t('match.timeout')}
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => {
              setPlaying(false);
              liveFinish();
            }}
          >
            <FastForward size={16} aria-hidden /> {t('match.finish')}
          </button>
          <Select<SpeedKey>
            label={t('match.speed')}
            value={speed}
            onChange={setSpeed}
            options={(Object.keys(SPEEDS) as SpeedKey[]).map((k) => ({
              value: k,
              label: t(`match.speeds.${k}`),
            }))}
          />
        </div>
      )}

      <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr]">
        <Card
          title={t('match.commentary')}
          actions={
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={onlyHighlights}
                onChange={(e) => setOnlyHighlights(e.target.checked)}
              />
              {t('match.onlyHighlights')}
            </label>
          }
        >
          <ol
            className="max-h-[28rem] space-y-1 overflow-y-auto pr-1 text-sm"
            aria-label={t('match.commentary')}
          >
            {lines.map((l) => (
              <li
                key={l.id}
                className={`flex gap-2 rounded px-2 py-1 ${l.kind === 'setEnd' || l.kind === 'matchEnd' ? 'bg-sand-200 font-bold' : l.team === side ? 'bg-sea-50' : l.team !== null ? 'bg-sand-50' : 'text-sand-700 italic'}`}
              >
                <span className="w-14 shrink-0 text-xs tabular-nums text-sand-700">
                  S{l.setIndex + 1} {l.score[0]}-{l.score[1]}
                </span>
                <span className={l.highlight ? 'font-semibold' : ''}>{l.text}</span>
              </li>
            ))}
          </ol>
        </Card>
        <div className="space-y-4">
          {!s.finished && (
            <Card title={t('tactics.title')}>
              <TacticsForm compact value={tactics} onChange={setDraft} />
              <button
                className="btn btn-primary mt-3"
                disabled={!draft}
                onClick={() => {
                  if (draft) liveTactics(draft);
                  setDraft(null);
                  showToast(t('match.tacticsChanged'));
                }}
              >
                {t('match.applyTactics')}
              </button>
            </Card>
          )}
          <Card title={t('match.energy')}>
            <ul className="grid gap-2 sm:grid-cols-2">
              {([0, 1] as TeamIndex[]).flatMap((team) =>
                s.setup.teams[team].players.map((p, i) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className={team === side ? 'font-semibold text-sea-800' : ''}>
                      {p.name}
                    </span>
                    <Meter value={s.energy[team][i]} label={`${t('match.energy')} ${p.name}`} />
                  </li>
                )),
              )}
            </ul>
          </Card>
          <Card title={t('match.stats')}>
            <StatsTable s={s} />
          </Card>
        </div>
      </div>
    </div>
  );
}
