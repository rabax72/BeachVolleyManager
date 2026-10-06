import { useState } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { useGameState } from '../../store/gameStore';
import { t } from '../../i18n';
import { dismissBanner, isBannerDismissed, LESSONS, loadRead } from './lessons';

/** Invito al tutorial nelle prime settimane della prima stagione, finché non viene chiuso o letto. */
export function TutorialBanner() {
  const g = useGameState();
  const [hidden, setHidden] = useState(
    () => isBannerDismissed() || loadRead().length >= LESSONS.length,
  );
  if (hidden || g.season > 1 || g.week > 4) return null;
  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-sea-200 bg-sea-50 p-3">
      <GraduationCap size={22} className="shrink-0 text-sea-700" aria-hidden />
      <p className="flex-1 text-sm font-semibold text-sea-900">{t('tutorial.banner')}</p>
      <Link to="/gioco/tutorial" className="btn btn-primary">
        {t('tutorial.bannerOpen')}
      </Link>
      <button
        className="btn btn-ghost"
        onClick={() => {
          dismissBanner();
          setHidden(true);
        }}
      >
        {t('tutorial.bannerDismiss')}
      </button>
    </div>
  );
}
