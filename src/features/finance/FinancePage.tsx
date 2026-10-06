import { useMemo } from 'react';
import { Handshake } from 'lucide-react';
import { useGame, useGameState } from '../../store/gameStore';
import { acceptSponsor } from '../../engine/actions';
import {
  MAX_SPONSORS,
  NEGATIVE_CUT_WEEKS,
  NEGATIVE_FIRED_WEEKS,
  NEGATIVE_WARNING_WEEKS,
  objectiveProgress,
} from '../../engine/finance';
import { userPlayers } from '../../engine/pairs';
import { clubSeasonStatsWithRank } from '../../engine/season';
import type { Sponsor, Transaction } from '../../engine/types';
import { formatMoney, t } from '../../i18n';
import { Badge, Card, EmptyState, PageHeader, Stat } from '../../ui/components';
import { DataTable, type Column } from '../../ui/DataTable';
import { objectiveText, transactionLabel, yearOf } from '../../ui/text';

export function FinancePage() {
  const g = useGameState();
  const update = useGame((s) => s.update);
  const stats = clubSeasonStatsWithRank(g);
  const salaries = userPlayers(g).reduce((a, p) => a + p.contract.salary, 0);
  const staff = g.staff.reduce((a, m) => a + m.weeklySalary, 0);
  const sponsorIncome = g.sponsors.reduce((a, s) => a + s.weeklyIncome, 0);

  const seasonByKind = useMemo(() => {
    const out: Partial<Record<Transaction['kind'], number>> = {};
    for (const tr of g.finance.transactions)
      if (tr.season === g.season) out[tr.kind] = (out[tr.kind] ?? 0) + tr.amount;
    return out;
  }, [g]);

  const txRows = useMemo(
    () => g.finance.transactions.map((tr, i) => ({ ...tr, idx: i })).reverse(),
    [g],
  );
  const txColumns: Column<Transaction & { idx: number }>[] = [
    {
      key: 'when',
      header: t('common.week'),
      sortValue: (r) => r.idx,
      render: (r) => `${yearOf(g, r.season)} · ${t('common.weekShort', { week: r.week })}`,
    },
    {
      key: 'kind',
      header: t('common.type'),
      sortValue: (r) => r.kind,
      render: (r) => t(`finance.kinds.${r.kind}`),
    },
    { key: 'label', header: t('common.details'), render: (r) => transactionLabel(r) },
    {
      key: 'amount',
      header: t('common.total'),
      numeric: true,
      sortValue: (r) => r.amount,
      render: (r) => (
        <span className={r.amount < 0 ? 'text-coral-600' : 'text-palm-700'}>
          {formatMoney(r.amount)}
        </span>
      ),
    },
  ];

  const sponsorCard = (sp: Sponsor, offer: boolean) => {
    const prog = objectiveProgress(sp.objective, stats, g.finance.balance);
    return (
      <li key={sp.id} className="rounded-md border border-sand-200 p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-sea-900">{sp.name}</span>
          <Badge tone="sea">
            {formatMoney(sp.weeklyIncome)} {t('common.perWeek')}
          </Badge>
          <Badge>{t('finance.untilSeason', { year: yearOf(g, sp.untilSeason) })}</Badge>
          {offer && (
            <button
              className="btn btn-primary ml-auto"
              disabled={g.sponsors.length >= MAX_SPONSORS}
              onClick={() => update((s) => acceptSponsor(s, sp.id))}
            >
              <Handshake size={16} aria-hidden /> {t('finance.accept')}
            </button>
          )}
        </div>
        <p className="mt-1 text-sm">
          <span className="font-semibold">{t('finance.objective')}:</span>{' '}
          {objectiveText(sp.objective, g)} — {t('finance.bonus')}: {formatMoney(sp.bonus)}
        </p>
        {!offer && (
          <Badge tone={prog.met ? 'good' : 'neutral'}>
            {prog.met ? t('objective.met') : t('objective.notMet')}
          </Badge>
        )}
      </li>
    );
  };

  const board = objectiveProgress(g.boardObjective, stats, g.finance.balance);

  return (
    <div>
      <PageHeader title={t('finance.title')} />
      <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat
          label={t('finance.balance')}
          value={
            <span className={g.finance.balance < 0 ? 'text-coral-600' : ''}>
              {formatMoney(g.finance.balance)}
            </span>
          }
        />
        <Stat
          label={t('finance.weeklyCosts')}
          value={formatMoney(salaries + staff)}
          hint={`${t('finance.salaries')}: ${formatMoney(salaries)} · ${t('finance.staff')}: ${formatMoney(staff)}`}
        />
        <Stat label={t('finance.weeklyIncome')} value={formatMoney(sponsorIncome)} />
        <Stat label={t('finance.prizeMoney')} value={formatMoney(g.clubSeason.prizeMoney)} />
      </div>
      {g.finance.negativeWeeks > 0 && (
        <p
          role="alert"
          className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900"
        >
          <strong>{t('finance.negativeWeeks', { n: g.finance.negativeWeeks })}</strong> —{' '}
          {t('finance.negativeHelp', {
            warn: NEGATIVE_WARNING_WEEKS,
            cut: NEGATIVE_CUT_WEEKS,
            fired: NEGATIVE_FIRED_WEEKS,
          })}
        </p>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title={t('finance.sponsors')}>
          {g.sponsors.length === 0 ? (
            <EmptyState>{t('common.none')}</EmptyState>
          ) : (
            <ul className="space-y-2">{g.sponsors.map((s) => sponsorCard(s, false))}</ul>
          )}
        </Card>
        <Card title={t('finance.offers')}>
          <p className="mb-2 text-xs text-sand-700">
            {t('finance.maxSponsors', { n: MAX_SPONSORS })}
          </p>
          {g.sponsorOffers.length === 0 ? (
            <EmptyState>{t('common.none')}</EmptyState>
          ) : (
            <ul className="space-y-2">{g.sponsorOffers.map((s) => sponsorCard(s, true))}</ul>
          )}
        </Card>
        <Card title={t('finance.board')}>
          <p className="text-sm">{objectiveText(g.boardObjective, g)}</p>
          <div className="mt-2">
            <Badge tone={board.met ? 'good' : 'neutral'}>
              {board.met ? t('objective.met') : t('objective.notMet')}
            </Badge>
          </div>
          <p className="mt-2 text-sm">
            {t('ranking.reputation')}:{' '}
            <strong>{g.clubs[g.manager.clubId].reputation.toFixed(2)}</strong> / 5
          </p>
        </Card>
        <Card title={t('finance.seasonSummary')}>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
            {(Object.entries(seasonByKind) as [Transaction['kind'], number][]).map(([k, v]) => (
              <div key={k} className="contents">
                <dt>{t(`finance.kinds.${k}`)}</dt>
                <dd
                  className={`text-right tabular-nums ${v < 0 ? 'text-coral-600' : 'text-palm-700'}`}
                >
                  {formatMoney(v)}
                </dd>
              </div>
            ))}
          </dl>
        </Card>
        <Card title={t('finance.transactions')} className="lg:col-span-2">
          <DataTable
            rows={txRows}
            columns={txColumns}
            rowKey={(r) => String(r.idx)}
            pageSize={25}
            caption={t('finance.transactions')}
          />
        </Card>
      </div>
    </div>
  );
}
