import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Link2, Unlink } from 'lucide-react';
import { useGame, useGameState } from '../../store/gameStore';
import { activePairOf, canFormUserPair, userPairs, userPlayers } from '../../engine/pairs';
import { fullName, initialChemistry, pairKey, playerOverall, synergy } from '../../engine/player';
import { pairEntryPoints, pairEntryRanking } from '../../engine/ranking';
import { formPair, setPairTactics, splitPair } from '../../engine/actions';
import { DEFAULT_TACTICS } from '../../engine/match';
import { pairName } from '../../engine/season';
import type { Pair } from '../../engine/types';
import { formatNumber, t } from '../../i18n';
import {
  AttrValue,
  Badge,
  Card,
  ConfirmModal,
  EmptyState,
  Meter,
  PageHeader,
} from '../../ui/components';
import { TacticsForm } from '../match/TacticsForm';

function PairCard({ pair }: { pair: Pair }) {
  const g = useGameState();
  const update = useGame((s) => s.update);
  const showToast = useGame((s) => s.showToast);
  const [confirm, setConfirm] = useState(false);
  const [a, b] = pair.playerIds.map((id) => g.players[id]);
  const rank =
    pairEntryRanking(g.pairs, g.players, pair.gender).findIndex((p) => p.id === pair.id) + 1;
  const syn = synergy(a, b);
  const tactics = g.tactics[pair.id] ?? DEFAULT_TACTICS;
  return (
    <Card
      title={
        <>
          {pairName(g, pair.id)} <Badge>{t(`gender.${pair.gender}`)}</Badge>
        </>
      }
      actions={
        <button className="btn btn-secondary" onClick={() => setConfirm(true)}>
          <Unlink size={16} aria-hidden /> {t('pairs.split')}
        </button>
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <ul className="space-y-2 text-sm">
            {[a, b].map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-2">
                <AttrValue value={playerOverall(p)} label={t('common.overall')} />
                <Link
                  className="font-semibold text-sea-800 hover:underline"
                  to={`/gioco/giocatore/${p.id}`}
                >
                  {fullName(p)}
                </Link>
                <Badge tone="sea">{t(`role.${p.role}`)}</Badge>
                {p.injury && <Badge tone="bad">{t('common.injured')}</Badge>}
              </li>
            ))}
          </ul>
          <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
            <dt className="text-sand-700">{t('common.chemistry')}</dt>
            <dd>
              <Meter value={pair.chemistry} label={t('common.chemistry')} />
            </dd>
            <dt className="text-sand-700">{t('common.synergy')}</dt>
            <dd>
              <Meter value={syn * 100} label={t('common.synergy')} />
            </dd>
            <dt className="text-sand-700">{t('common.matches')}</dt>
            <dd className="font-semibold">{pair.matchesTogether}</dd>
            <dt className="text-sand-700">{t('pairs.entryRank')}</dt>
            <dd className="font-semibold">
              {rank}° ({formatNumber(pairEntryPoints(pair, g.players))}{' '}
              {t('common.points').toLowerCase()})
            </dd>
          </dl>
          <p className="mt-2 text-xs">
            {a.role !== b.role ? (
              <Badge tone="good">{t('pairs.roleFit')}</Badge>
            ) : (
              <Badge tone="warn">{t('pairs.roleClash')}</Badge>
            )}
          </p>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-bold text-sea-900">{t('pairs.editTactics')}</h3>
          <TacticsForm
            compact
            value={tactics}
            onChange={(tac) => {
              update((s) => setPairTactics(s, pair.id, tac));
              showToast(t('tactics.saved'));
            }}
          />
        </div>
      </div>
      <ConfirmModal
        open={confirm}
        title={t('pairs.split')}
        message={t('pairs.splitConfirm')}
        danger
        onClose={() => setConfirm(false)}
        onConfirm={() => update((s) => splitPair(s, pair.id))}
      />
    </Card>
  );
}

export function PairsPage() {
  const g = useGameState();
  const update = useGame((s) => s.update);
  const pairs = userPairs(g);
  const unpaired = userPlayers(g).filter((p) => !activePairOf(g, p.id));
  const [aId, setA] = useState('');
  const [bId, setB] = useState('');
  const error = aId && bId ? canFormUserPair(g, aId, bId) : null;
  const preview =
    aId && bId && !error
      ? {
          syn: synergy(g.players[aId], g.players[bId]),
          chem: initialChemistry(
            g.players[aId],
            g.players[bId],
            g.chemistryMemory[pairKey(aId, bId)],
          ),
        }
      : null;

  return (
    <div>
      <PageHeader title={t('pairs.title')} subtitle={t('pairs.intro')} />
      <div className="space-y-4">
        {pairs.length === 0 && <EmptyState>{t('common.noData')}</EmptyState>}
        {pairs.map((p) => (
          <PairCard key={p.id} pair={p} />
        ))}
        <Card title={t('pairs.form')}>
          {unpaired.length < 2 ? (
            <EmptyState>
              {t('pairs.unpaired')}: {unpaired.map(fullName).join(', ') || t('common.none')}
            </EmptyState>
          ) : (
            <div className="flex flex-wrap items-end gap-3">
              {[
                { label: t('pairs.playerA'), value: aId, set: setA, id: 'pa' },
                { label: t('pairs.playerB'), value: bId, set: setB, id: 'pb' },
              ].map((f) => (
                <div key={f.id}>
                  <label className="label" htmlFor={f.id}>
                    {f.label}
                  </label>
                  <select
                    id={f.id}
                    className="input min-w-56"
                    value={f.value}
                    onChange={(e) => f.set(e.target.value)}
                  >
                    <option value="">{t('pairs.select')}</option>
                    {unpaired.map((p) => (
                      <option key={p.id} value={p.id}>
                        {fullName(p)} · {t(`role.${p.role}`)} · {t(`gender.${p.gender}`)} ·{' '}
                        {Math.round(playerOverall(p))}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
              <button
                className="btn btn-primary"
                disabled={!aId || !bId || !!error}
                onClick={() => {
                  update((s) => formPair(s, aId, bId));
                  setA('');
                  setB('');
                }}
              >
                <Link2 size={16} aria-hidden /> {t('pairs.create')}
              </button>
              {error && (
                <p role="alert" className="w-full text-sm text-coral-600">
                  {t(`pairs.errors.${error}`)}
                </p>
              )}
              {preview && (
                <p className="w-full text-sm">
                  {t('common.synergy')}: <strong>{Math.round(preview.syn * 100)}%</strong> ·{' '}
                  {t('common.chemistry')}: <strong>{Math.round(preview.chem)}</strong>
                </p>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
