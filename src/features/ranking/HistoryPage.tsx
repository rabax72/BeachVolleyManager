import { useMemo, useState } from 'react';
import { Trophy } from 'lucide-react';
import { useGameState } from '../../store/gameStore';
import { TIERS, type Gender, type HonourEntry, type Tier } from '../../engine/types';
import { formatMoney, formatNumber, t } from '../../i18n';
import { Badge, Card, EmptyState, PageHeader, Select } from '../../ui/components';
import { DataTable, type Column } from '../../ui/DataTable';
import { yearOf } from '../../ui/text';

export function HistoryPage() {
  const g = useGameState();
  const [gender, setGender] = useState<Gender | 'all'>('all');
  const [tier, setTier] = useState<Tier | 'all'>('elite');
  const honours = useMemo(
    () =>
      g.honours
        .map((h, i) => ({ ...h, idx: i }))
        .filter(
          (h) => (gender === 'all' || h.gender === gender) && (tier === 'all' || h.tier === tier),
        )
        .reverse(),
    [g, gender, tier],
  );
  const cols: Column<HonourEntry & { idx: number }>[] = [
    {
      key: 'season',
      header: t('common.season'),
      numeric: true,
      sortValue: (h) => h.idx,
      render: (h) => yearOf(g, h.season),
    },
    {
      key: 'tier',
      header: t('ranking.filterTier'),
      sortValue: (h) => TIERS.indexOf(h.tier),
      render: (h) => t(`tier.${h.tier}`),
    },
    {
      key: 'name',
      header: t('ranking.tournament'),
      sortValue: (h) => h.tournamentName,
      render: (h) => h.tournamentName,
    },
    {
      key: 'gender',
      header: t('common.gender'),
      sortValue: (h) => h.gender,
      render: (h) => t(`gender.${h.gender}`),
    },
    {
      key: 'winners',
      header: t('tournament.placement.1'),
      sortValue: (h) => h.winnerNames,
      render: (h) => (
        <span className={h.userClub ? 'font-bold text-sea-800' : ''}>
          {h.winnerNames}{' '}
          {h.userClub && (
            <Trophy size={14} className="inline text-sand-500" aria-label={t('common.yourClub')} />
          )}
        </span>
      ),
    },
  ];
  const seasons = [...new Set(g.rankingHistory.map((r) => r.season))].sort((a, b) => b - a);

  return (
    <div>
      <PageHeader title={t('nav.history')} />
      <div className="grid gap-4 xl:grid-cols-2">
        <Card title={t('ranking.honours')} className="xl:col-span-2">
          <div className="mb-3 flex flex-wrap gap-3">
            <Select
              label={t('common.gender')}
              value={gender}
              onChange={setGender}
              options={[
                { value: 'all', label: t('common.all') },
                { value: 'M', label: t('gender.M') },
                { value: 'F', label: t('gender.F') },
              ]}
            />
            <Select
              label={t('ranking.filterTier')}
              value={tier}
              onChange={setTier}
              options={[
                { value: 'all', label: t('common.all') },
                ...TIERS.map((x) => ({ value: x, label: t(`tier.${x}`) })),
              ]}
            />
          </div>
          <DataTable
            rows={honours}
            columns={cols}
            rowKey={(h) => String(h.idx)}
            pageSize={20}
            caption={t('ranking.honours')}
          />
        </Card>
        <Card title={t('ranking.history')}>
          {seasons.length === 0 ? (
            <EmptyState>{t('ranking.noHistory')}</EmptyState>
          ) : (
            <div className="space-y-4">
              {seasons.map((s) => (
                <div key={s}>
                  <h3 className="mb-1 font-bold text-sea-900">
                    {t('common.seasonYear', { year: yearOf(g, s) })}
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(['M', 'F'] as Gender[]).map((gd) => {
                      const snap = g.rankingHistory.find((r) => r.season === s && r.gender === gd);
                      return (
                        <div key={gd}>
                          <div className="text-xs font-bold text-sand-700 uppercase">
                            {t(`gender.${gd}`)}
                          </div>
                          <ol className="text-sm">
                            {snap?.top.slice(0, 5).map((p, i) => (
                              <li key={p.playerId} className="flex justify-between gap-2">
                                <span>
                                  {i + 1}. {p.name}
                                </span>
                                <span className="tabular-nums">{formatNumber(p.points)}</span>
                              </li>
                            ))}
                          </ol>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card title={t('ranking.clubHistory')}>
          {g.clubHistory.length === 0 ? (
            <EmptyState>{t('ranking.noHistory')}</EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-dense">
                <thead>
                  <tr>
                    <th scope="col">{t('common.season')}</th>
                    <th scope="col" className="text-right">
                      {t('ranking.reputation')}
                    </th>
                    <th scope="col" className="text-right">
                      {t('ranking.bestRank')}
                    </th>
                    <th scope="col" className="text-right">
                      {t('common.titles')}
                    </th>
                    <th scope="col" className="text-right">
                      {t('ranking.balanceEnd')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[...g.clubHistory].reverse().map((h) => (
                    <tr key={h.season}>
                      <td>{yearOf(g, h.season)}</td>
                      <td className="num">{h.reputation.toFixed(2)}</td>
                      <td className="num">{h.bestRank ?? '—'}</td>
                      <td className="num">
                        {h.titles > 0 ? <Badge tone="good">{h.titles}</Badge> : 0}
                      </td>
                      <td className="num">{formatMoney(h.balance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
