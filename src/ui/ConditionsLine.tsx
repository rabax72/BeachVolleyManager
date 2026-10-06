import { Sun, Thermometer, Wind } from 'lucide-react';
import type { TournamentDef } from '../engine/types';
import { t } from '../i18n';

/** Riepilogo delle condizioni di gioco (vento, sole, temperatura, sabbia). */
export function ConditionsLine({ def }: { def: TournamentDef }) {
  const c = def.conditions;
  return (
    <span className="inline-flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-sand-700">
      <span className="inline-flex items-center gap-1">
        <Wind size={13} aria-hidden /> {t('conditions.wind')}: {t(`conditions.windLevel.${c.wind}`)}
      </span>
      <span className="inline-flex items-center gap-1">
        <Sun size={13} aria-hidden /> {t('conditions.sun')}: {t(`conditions.sunLevel.${c.sun}`)}
      </span>
      <span className="inline-flex items-center gap-1">
        <Thermometer size={13} aria-hidden /> {t('conditions.temp', { n: c.temperature })}
      </span>
      <span>
        {t('conditions.sand')}: {t(`conditions.sandType.${c.sand}`)}
      </span>
    </span>
  );
}
