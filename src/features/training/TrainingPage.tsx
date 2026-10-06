import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useGame, useGameState } from '../../store/gameStore';
import { userPlayers } from '../../engine/pairs';
import { fullName, playerOverall, potentialEstimate } from '../../engine/player';
import { setTraining } from '../../engine/actions';
import { DEFAULT_PLAN, staffLevels } from '../../engine/training';
import type { TrainingFocus, TrainingIntensity, TrainingPlan } from '../../engine/types';
import { t } from '../../i18n';
import { AttrValue, Badge, Card, Meter, PageHeader, Select } from '../../ui/components';
import { FOCUS_OPTIONS, INTENSITY_OPTIONS } from './options';

export function TrainingPage() {
  const g = useGameState();
  const update = useGame((s) => s.update);
  const roster = userPlayers(g).sort(
    (a, b) => a.gender.localeCompare(b.gender) || playerOverall(b) - playerOverall(a),
  );
  const [bulk, setBulk] = useState<TrainingPlan>(DEFAULT_PLAN);
  const staff = staffLevels(g.staff);

  return (
    <div>
      <PageHeader title={t('training.title')} subtitle={t('training.intro')} />
      <Card className="mb-4">
        <div className="flex flex-wrap items-end gap-3">
          <Select<TrainingFocus>
            label={t('training.focus')}
            value={bulk.focus}
            options={FOCUS_OPTIONS()}
            onChange={(focus) => setBulk({ ...bulk, focus })}
          />
          <Select<TrainingIntensity>
            label={t('training.intensity')}
            value={bulk.intensity}
            options={INTENSITY_OPTIONS()}
            onChange={(intensity) => setBulk({ ...bulk, intensity })}
          />
          <button
            className="btn btn-primary"
            onClick={() =>
              update((s) =>
                setTraining(
                  s,
                  roster.map((p) => p.id),
                  bulk,
                ),
              )
            }
          >
            {t('training.applyAll')}
          </button>
          <div className="ml-auto flex flex-wrap gap-2 text-xs">
            <Badge tone="sea">
              {t('staff.roles.coach')}: {staff.coach || '—'}
            </Badge>
            <Badge tone="sea">
              {t('staff.roles.fitness')}: {staff.fitness || '—'}
            </Badge>
            <Badge tone="sea">
              {t('staff.roles.physio')}: {staff.physio || '—'}
            </Badge>
          </div>
        </div>
        <p className="mt-2 text-xs text-sand-700">{t('training.matchWeekNote')}</p>
      </Card>
      <Card>
        <div className="overflow-x-auto">
          <table className="table-dense">
            <caption className="sr-only">{t('training.title')}</caption>
            <thead>
              <tr>
                <th scope="col">{t('common.player')}</th>
                <th scope="col">{t('common.role')}</th>
                <th scope="col" className="text-right">
                  {t('common.age')}
                </th>
                <th scope="col" className="text-right" title={t('common.overall')}>
                  {t('common.ovrShort')}
                </th>
                <th scope="col" className="text-right">
                  {t('common.potential')}
                </th>
                <th scope="col">{t('common.fatigue')}</th>
                <th scope="col">{t('common.form')}</th>
                <th scope="col">{t('training.focus')}</th>
                <th scope="col">{t('training.intensity')}</th>
                <th scope="col">{t('common.status')}</th>
              </tr>
            </thead>
            <tbody>
              {roster.map((p) => {
                const plan = g.training[p.id] ?? DEFAULT_PLAN;
                const pot = potentialEstimate(p, 100);
                const risky = p.fatigue >= 65 && plan.intensity === 'high' && plan.focus !== 'rest';
                return (
                  <tr key={p.id}>
                    <td>
                      <Link
                        className="font-semibold text-sea-800 hover:underline"
                        to={`/gioco/giocatore/${p.id}`}
                      >
                        {fullName(p)}
                      </Link>
                      <div className="text-xs text-sand-700">{t(`gender.${p.gender}`)}</div>
                    </td>
                    <td>{t(`role.${p.role}`)}</td>
                    <td className="num">{p.age}</td>
                    <td className="num">
                      <AttrValue value={playerOverall(p)} label={t('common.overall')} />
                    </td>
                    <td className="num">{pot.max}</td>
                    <td>
                      <Meter value={p.fatigue} label={t('common.fatigue')} invert />
                    </td>
                    <td>
                      <Meter value={p.form} label={t('common.form')} />
                    </td>
                    <td>
                      <Select<TrainingFocus>
                        hideLabel
                        label={`${t('training.focus')} – ${fullName(p)}`}
                        value={plan.focus}
                        options={FOCUS_OPTIONS()}
                        onChange={(focus) =>
                          update((s) => setTraining(s, [p.id], { ...plan, focus }))
                        }
                      />
                    </td>
                    <td>
                      <Select<TrainingIntensity>
                        hideLabel
                        label={`${t('training.intensity')} – ${fullName(p)}`}
                        value={plan.intensity}
                        options={INTENSITY_OPTIONS()}
                        onChange={(intensity) =>
                          update((s) => setTraining(s, [p.id], { ...plan, intensity }))
                        }
                      />
                    </td>
                    <td>
                      {p.injury ? (
                        <Badge tone="bad">{t(`injury.${p.injury.key}`)}</Badge>
                      ) : risky ? (
                        <Badge tone="warn">{t('training.riskHigh')}</Badge>
                      ) : (
                        <Badge tone="good">{t('common.available')}</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
