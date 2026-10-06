import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Eye, FileSignature, UserMinus } from 'lucide-react';
import { useGame, useGameState } from '../../store/gameStore';
import { activePairOf, isUserPlayer } from '../../engine/pairs';
import { fullName, marketValue, playerOverall, potentialEstimate } from '../../engine/player';
import { releaseCost, SCOUT_COST, transferFee } from '../../engine/market';
import { releasePlayer, scoutPlayer, setTraining } from '../../engine/actions';
import { pairName } from '../../engine/season';
import { DEFAULT_PLAN } from '../../engine/training';
import {
  MENTAL_KEYS,
  PHYSICAL_KEYS,
  TECHNICAL_KEYS,
  type AttributeKey,
  type TrainingFocus,
  type TrainingIntensity,
} from '../../engine/types';
import { NATIONALITY_BY_CODE } from '../../data/names';
import { formatMoney, formatNumber, t, tg } from '../../i18n';
import {
  AttrValue,
  Badge,
  Card,
  ConfirmModal,
  EmptyState,
  Meter,
  PageHeader,
  Select,
} from '../../ui/components';
import { Radar } from '../../ui/Radar';
import { PlayerAvatar } from '../../ui/avatar/Avatar';
import { OfferModal } from '../market/OfferModal';
import { FOCUS_OPTIONS, INTENSITY_OPTIONS } from '../training/options';

function AttrList({
  keys,
  attrs,
  title,
}: {
  keys: AttributeKey[];
  attrs: Record<AttributeKey, number>;
  title: string;
}) {
  return (
    <div>
      <h3 className="mb-1 text-xs font-bold text-sand-700 uppercase">{title}</h3>
      <dl className="space-y-1">
        {keys.map((k) => (
          <div key={k} className="flex items-center justify-between gap-2 text-sm">
            <dt>{t(`attr.${k}`)}</dt>
            <dd>
              <AttrValue value={attrs[k]} label={t(`attr.${k}`)} />
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export function PlayerPage() {
  const { id = '' } = useParams();
  const g = useGameState();
  const update = useGame((s) => s.update);
  const showToast = useGame((s) => s.showToast);
  const [offer, setOffer] = useState(false);
  const [confirmRelease, setConfirmRelease] = useState(false);
  const p = g.players[id];
  if (!p) {
    return <EmptyState>{t('common.noData')}</EmptyState>;
  }
  const own = isUserPlayer(g, p);
  const knowledge = own ? 100 : (g.scouting[p.id]?.knowledge ?? 0);
  const pot = knowledge > 0 ? potentialEstimate(p, knowledge) : null;
  const pair = activePairOf(g, p.id);
  const plan = g.training[p.id] ?? DEFAULT_PLAN;
  const year = (s: number) => g.startYear + s - 1;
  const fee = transferFee(p, g.manager.clubId, g.season);

  return (
    <div>
      <Link to="/gioco/rosa" className="btn btn-ghost mb-2">
        <ArrowLeft size={16} aria-hidden /> {t('nav.squad')}
      </Link>
      <PageHeader
        leading={<PlayerAvatar player={p} size={96} />}
        title={fullName(p)}
        subtitle={
          <span className="flex flex-wrap gap-2">
            <Badge tone="sea">{t(`role.${p.role}`)}</Badge>
            <Badge>{t(`gender.${p.gender}`)}</Badge>
            {p.retired && <Badge tone="bad">{t('common.retired')}</Badge>}
            {p.injury && (
              <Badge tone="bad">
                {t(`injury.${p.injury.key}`)} · {t('common.weeks', { n: p.injury.weeksLeft })}
              </Badge>
            )}
            {p.contract.clubId ? (
              <Badge>{g.clubs[p.contract.clubId].name}</Badge>
            ) : (
              <Badge tone="sea">{t('common.freeAgent')}</Badge>
            )}
          </span>
        }
        actions={
          !p.retired && (
            <>
              {!own && (
                <button
                  className="btn btn-secondary"
                  disabled={g.finance.balance < SCOUT_COST || knowledge >= 100}
                  onClick={() => update((s) => scoutPlayer(s, p.id))}
                >
                  <Eye size={16} aria-hidden /> {t('market.scout')} ({formatMoney(SCOUT_COST)})
                </button>
              )}
              <button className="btn btn-primary" onClick={() => setOffer(true)}>
                <FileSignature size={16} aria-hidden />{' '}
                {own ? t('market.renew') : t('market.makeOffer')}
              </button>
              {own && (
                <button className="btn btn-danger" onClick={() => setConfirmRelease(true)}>
                  <UserMinus size={16} aria-hidden /> {t('market.release')}
                </button>
              )}
            </>
          )
        }
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card title={t('squad.profile')}>
          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
            <dt className="text-sand-700">{t('common.age')}</dt>
            <dd className="font-semibold">{p.age}</dd>
            <dt className="text-sand-700">{t('common.nationality')}</dt>
            <dd className="font-semibold">
              {NATIONALITY_BY_CODE[p.nationality]?.name ?? p.nationality}
            </dd>
            <dt className="text-sand-700">{t('common.height')}</dt>
            <dd className="font-semibold">{t('common.cm', { n: p.heightCm })}</dd>
            <dt className="text-sand-700">{t('common.hand')}</dt>
            <dd className="font-semibold">{t(`hand.${p.hand}`)}</dd>
            <dt className="text-sand-700">{t('character.label')}</dt>
            <dd className="font-semibold">
              {knowledge >= 60
                ? tg(`character.${p.hidden.character}`, p.gender)
                : t('character.hidden')}
            </dd>
            <dt className="text-sand-700">{t('common.overall')}</dt>
            <dd>
              <AttrValue value={playerOverall(p)} label={t('common.overall')} />
            </dd>
            <dt className="text-sand-700">{t('squad.estimatedPotential')}</dt>
            <dd className="font-semibold">
              {pot ? (pot.min === pot.max ? pot.max : `${pot.min}–${pot.max}`) : '?'}
            </dd>
            {!own && (
              <>
                <dt className="text-sand-700">{t('market.value')}</dt>
                <dd className="font-semibold">{formatMoney(marketValue(p))}</dd>
              </>
            )}
            {fee > 0 && (
              <>
                <dt className="text-sand-700">{t('market.feeLabel')}</dt>
                <dd className="font-semibold">{formatMoney(fee)}</dd>
              </>
            )}
            <dt className="text-sand-700">{t('common.salary')}</dt>
            <dd className="font-semibold">
              {p.contract.clubId ? `${formatMoney(p.contract.salary)} ${t('common.perWeek')}` : '—'}
            </dd>
            <dt className="text-sand-700">{t('squad.contractEnds')}</dt>
            <dd className="font-semibold">
              {p.contract.clubId ? year(p.contract.untilSeason) : '—'}
            </dd>
            <dt className="text-sand-700">{t('squad.currentPair')}</dt>
            <dd className="font-semibold">{pair ? pairName(g, pair.id) : t('squad.noPair')}</dd>
          </dl>
          {!own && (
            <p className="mt-3 text-xs text-sand-700">{t('squad.knowledge', { n: knowledge })}</p>
          )}
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span>{t('common.morale')}</span>
              <Meter value={p.morale} label={t('common.morale')} />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span>{t('common.form')}</span>
              <Meter value={p.form} label={t('common.form')} />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span>{t('common.fatigue')}</span>
              <Meter value={p.fatigue} label={t('common.fatigue')} invert />
            </div>
          </div>
        </Card>

        <Card title={t('squad.attributes')} className="lg:col-span-2">
          <div className="grid items-start gap-4 md:grid-cols-[minmax(0,320px)_1fr]">
            <Radar attrs={p.attrs} />
            <div className="grid gap-4 sm:grid-cols-3 md:grid-cols-1 xl:grid-cols-3">
              <AttrList keys={TECHNICAL_KEYS} attrs={p.attrs} title={t('attrGroup.technical')} />
              <AttrList keys={PHYSICAL_KEYS} attrs={p.attrs} title={t('attrGroup.physical')} />
              <AttrList keys={MENTAL_KEYS} attrs={p.attrs} title={t('attrGroup.mental')} />
            </div>
          </div>
        </Card>

        {own && (
          <Card title={t('squad.trainingPlan')}>
            <div className="space-y-3">
              <Select<TrainingFocus>
                label={t('training.focus')}
                value={plan.focus}
                options={FOCUS_OPTIONS()}
                onChange={(focus) => update((s) => setTraining(s, [p.id], { ...plan, focus }))}
              />
              <Select<TrainingIntensity>
                label={t('training.intensity')}
                value={plan.intensity}
                options={INTENSITY_OPTIONS()}
                onChange={(intensity) =>
                  update((s) => setTraining(s, [p.id], { ...plan, intensity }))
                }
              />
            </div>
          </Card>
        )}

        <Card title={t('squad.seasonStats')} className={own ? 'lg:col-span-2' : 'lg:col-span-3'}>
          <dl className="grid grid-cols-3 gap-2 text-sm sm:grid-cols-5">
            {(
              [
                ['common.points', formatNumber(p.points)],
                ['common.tournaments', p.season.tournaments],
                ['common.titles', p.season.titles],
                ['common.matches', p.season.matches],
                ['common.wins', p.season.wins],
                ['match.statLabels.aces', p.season.aces],
                ['match.statLabels.kills', p.season.kills],
                ['match.statLabels.blocks', p.season.blocks],
                ['match.statLabels.digs', p.season.digs],
                ['match.statLabels.serveErrors', p.season.serveErrors],
              ] as [string, number | string][]
            ).map(([k, v]) => (
              <div key={k} className="rounded-md bg-sand-50 px-2 py-1.5">
                <dt className="text-xs text-sand-700">{t(k)}</dt>
                <dd className="font-bold tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card title={t('squad.career')} className="lg:col-span-3">
          {p.career.length === 0 ? (
            <EmptyState>{t('ranking.noHistory')}</EmptyState>
          ) : (
            <div className="overflow-x-auto">
              <table className="table-dense">
                <thead>
                  <tr>
                    <th scope="col">{t('common.season')}</th>
                    <th scope="col" className="text-right">
                      {t('common.rank')}
                    </th>
                    <th scope="col" className="text-right">
                      {t('common.points')}
                    </th>
                    <th scope="col" className="text-right">
                      {t('common.tournaments')}
                    </th>
                    <th scope="col" className="text-right">
                      {t('common.titles')}
                    </th>
                    <th scope="col" className="text-right">
                      {t('common.matches')}
                    </th>
                    <th scope="col" className="text-right">
                      {t('common.wins')}
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
                  </tr>
                </thead>
                <tbody>
                  {[...p.career].reverse().map((c) => (
                    <tr key={c.season}>
                      <td>{year(c.season)}</td>
                      <td className="num">{c.rank ?? '—'}</td>
                      <td className="num">{formatNumber(c.points)}</td>
                      <td className="num">{c.tournaments}</td>
                      <td className="num">{c.titles}</td>
                      <td className="num">{c.matches}</td>
                      <td className="num">{c.wins}</td>
                      <td className="num">{c.aces}</td>
                      <td className="num">{c.kills}</td>
                      <td className="num">{c.blocks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
      {offer && <OfferModal playerId={p.id} onClose={() => setOffer(false)} />}
      <ConfirmModal
        open={confirmRelease}
        title={t('market.release')}
        message={t('market.releaseConfirm', {
          player: fullName(p),
          cost: formatMoney(releaseCost(p, g.season)),
        })}
        danger
        onClose={() => setConfirmRelease(false)}
        onConfirm={() => {
          update((s) => releasePlayer(s, p.id));
          showToast(
            tg('news.released', p.gender, {
              player: fullName(p),
              cost: formatMoney(releaseCost(p, g.season)),
            }),
          );
        }}
      />
    </div>
  );
}
