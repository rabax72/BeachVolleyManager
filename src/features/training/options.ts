import type { TrainingFocus, TrainingIntensity } from '../../engine/types';
import { t } from '../../i18n';

export const FOCUSES: TrainingFocus[] = [
  'balanced',
  'serve',
  'reception',
  'setting',
  'attack',
  'block',
  'defense',
  'physical',
  'mental',
  'rest',
];
export const INTENSITIES: TrainingIntensity[] = ['low', 'medium', 'high'];

export const FOCUS_OPTIONS = () =>
  FOCUSES.map((f) => ({ value: f, label: t(`training.focusOptions.${f}`) }));
export const INTENSITY_OPTIONS = () =>
  INTENSITIES.map((i) => ({ value: i, label: t(`training.intensityOptions.${i}`) }));
