import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useGame, useGameState } from '../../store/gameStore';
import { userPairs } from '../../engine/pairs';
import {
  pairName,
  registerPair,
  registrationError,
  seasonYear,
  unregisterPair,
  weekDefs,
} from '../../engine/season';
import { tournamentWinner } from '../../engine/tournament';
import { SEASON_WEEKS, TIER_INFO, TOUR_END_WEEK, TOUR_START_WEEK } from '../../data/world';
import type { Gender, TournamentDef } from '../../engine/types';
import { formatMoney, t } from '../../i18n';
import { Badge, Card, PageHeader } from '../../ui/components';
import { tournamentTitle } from '../../ui/text';
import { ConditionsLine } from '../../ui/ConditionsLine';

const TIER_TONE = { open: 'neutral', national: 'sand', challenger: 'sea', elite: 'warn' } as const;

function RegisterControl({ def }: { def: TournamentDef }) {
  const g = useGameState();
  const update = useGame((s) => s.update);
  const pairs = userPairs(g).filter((p) => p.gender === def.gender);
  const registered = g.registrations[def.id] ?? [];
  const candidates = pairs.filter((p) => !registered.includes(p.id));
  const [selected, setSelected] = useState('');
  const sel =
    candidates.find((p) => p.id === selected) ??
    candidates.find((p) => !registrationError(g, p.id, def.id));
  const err = sel ? registrationError(g, sel.id, def.id) : null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {registered.map((pid) => (
        <span key={pid} className="inline-flex items-center gap-1">
          <Badge tone="good">
            {t('calendar.registered')}: {pairName(g, pid)}
          </Badge>
          {def.week > g.week && (
            <button
              className="btn btn-ghost px-2 py-0.5 text-xs"
              onClick={() => update((s) => unregisterPair(s, pid, def.id))}
            >
              {t('calendar.unregister')}
            </button>
          )}
        </span>
      ))}
      {def.week > g.week && candidates.length > 0 && (
        <>
          <label className="sr-only" htmlFor={`reg-${def.id}`}>
            {t('calendar.choosePair')}
          </label>
          <select
            id={`reg-${def.id}`}
            className="input py-1 text-xs"
            value={sel?.id ?? ''}
            onChange={(e) => setSelected(e.target.value)}
          >
            {candidates.map((p) => {
              const e = registrationError(g, p.id, def.id);
              return (
                <option key={p.id} value={p.id}>
                  {pairName(g, p.id)}
                  {e ? ` (${t(`regError.${e}`)})` : ''}
                </option>
              );
            })}
          </select>
          <button
            className="btn btn-primary px-2 py-1 text-xs"
            disabled={!sel || !!err}
            onClick={() => sel && update((s) => registerPair(s, sel.id, def.id))}
          >
            {t('calendar.register')}
          </button>
          {err && (
            <span className="text-xs font-semibold text-coral-600">{t(`regError.${err}`)}</span>
          )}
        </>
      )}
    </div>
  );
}

export function CalendarPage() {
  const g = useGameState();
  const genders: Gender[] = g.manager.circuit === 'mixed' ? ['M', 'F'] : [g.manager.circuit];
  const currentRef = useRef<HTMLLIElement>(null);
  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: 'center' });
  }, []);
  const weeks = Array.from({ length: SEASON_WEEKS }, (_, i) => i + 1);

  const phaseOf = (w: number) =>
    w < TOUR_START_WEEK
      ? t('calendar.preseason')
      : w <= TOUR_END_WEEK
        ? t('calendar.tour')
        : t('calendar.winter');

  return (
    <div>
      <PageHeader
        title={t('calendar.title', { year: seasonYear(g) })}
        subtitle={t('calendar.intro')}
      />
      <Card>
        <ol className="divide-y divide-sand-100">
          {weeks.map((w) => {
            const defs = weekDefs(g, w).filter((d) => genders.includes(d.gender));
            const isCurrent = w === g.week;
            return (
              <li
                key={w}
                ref={isCurrent ? currentRef : undefined}
                className={`grid gap-2 py-3 md:grid-cols-[9rem_1fr] ${isCurrent ? 'rounded-md bg-sea-50 px-2' : ''} ${w < g.week ? 'opacity-75' : ''}`}
                aria-current={isCurrent ? 'date' : undefined}
              >
                <div>
                  <div className="font-bold text-sea-900">{t('common.weekShort', { week: w })}</div>
                  <div className="text-xs text-sand-700">{phaseOf(w)}</div>
                  {isCurrent && <Badge tone="sea">{t('calendar.current')}</Badge>}
                </div>
                <div className="space-y-2">
                  {defs.length === 0 && (
                    <p className="text-sm text-sand-700">{t('calendar.noEvents')}</p>
                  )}
                  {defs.map((d) => {
                    const tour = g.tournaments[d.id];
                    const winner = tour ? tournamentWinner(tour) : null;
                    const min = TIER_INFO[d.tier].minRankEntry;
                    return (
                      <div key={d.id} className="rounded-md border border-sand-200 bg-white p-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge tone={TIER_TONE[d.tier]}>{t(`tier.${d.tier}`)}</Badge>
                          <span className="font-semibold">{tournamentTitle(d)}</span>
                          {genders.length > 1 && <Badge>{t(`gender.${d.gender}`)}</Badge>}
                          {tour && (
                            <Link
                              className="btn btn-secondary ml-auto px-2 py-0.5 text-xs"
                              to={`/gioco/torneo/${d.id}`}
                            >
                              {t('calendar.view')}
                            </Link>
                          )}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-sand-700">
                          <span>
                            {t('calendar.prizePool')}: {formatMoney(d.prizePool)}
                          </span>
                          <span>
                            {t('calendar.entryFee')}: {formatMoney(d.entryFee)}
                          </span>
                          <span>
                            {t('calendar.travel')}: {formatMoney(d.travelCost)}
                          </span>
                          <span>
                            {min ? t(`tierDesc.${d.tier}`, { rank: min }) : t(`tierDesc.${d.tier}`)}
                          </span>
                        </div>
                        <div className="mt-1">
                          <ConditionsLine def={d} />
                        </div>
                        {winner && (
                          <p className="mt-1 text-sm font-semibold text-palm-700">
                            {t('tournament.winner', { pair: pairName(g, winner) })}
                          </p>
                        )}
                        <div className="mt-2">
                          <RegisterControl def={d} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </li>
            );
          })}
        </ol>
      </Card>
    </div>
  );
}
