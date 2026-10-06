import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, CheckCircle2, Circle, Lightbulb, Play } from 'lucide-react';
import { t } from '../../i18n';
import { Card, PageHeader } from '../../ui/components';
import { Logo } from '../../ui/Logo';
import { LESSONS, loadRead, saveRead } from './lessons';

const base = import.meta.env.BASE_URL;

/**
 * Tutorial consultabile sia dentro la partita (/gioco/tutorial) sia dal menu principale
 * (/tutorial, senza carriera aperta: in quel caso «Prova ora» non è disponibile).
 */
export function TutorialPage({ inGame }: { inGame: boolean }) {
  const { lesson: lessonParam } = useParams();
  const navigate = useNavigate();
  const [read, setRead] = useState<string[]>(loadRead);
  const index = Math.max(
    0,
    LESSONS.findIndex((l) => l.id === lessonParam),
  );
  const lesson = LESSONS[index];
  const root = inGame ? '/gioco/tutorial' : '/tutorial';
  const title = t(`tutorial.items.${lesson.id}.title`);
  const points = t(`tutorial.items.${lesson.id}.points`).split('|');
  const isRead = read.includes(lesson.id);

  const markRead = (value: boolean) => {
    const next = value ? [...new Set([...read, lesson.id])] : read.filter((id) => id !== lesson.id);
    setRead(next);
    saveRead(next);
  };
  const goTo = (i: number) => {
    if (!isRead) markRead(true);
    navigate(`${root}/${LESSONS[i].id}`);
  };

  const content = (
    <div className="grid gap-4 lg:grid-cols-[17rem_1fr]">
      <Card title={t('tutorial.lessons')} className="h-fit">
        <p className="mb-2 text-xs text-sand-700">
          {t('tutorial.progress', {
            done: read.filter((id) => LESSONS.some((l) => l.id === id)).length,
            total: LESSONS.length,
          })}
        </p>
        <nav aria-label={t('tutorial.lessons')}>
          <ol className="space-y-0.5">
            {LESSONS.map((l, i) => {
              const Icon = l.icon;
              const active = i === index;
              return (
                <li key={l.id}>
                  <Link
                    to={`${root}/${l.id}`}
                    aria-current={active ? 'page' : undefined}
                    className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-sm ${
                      active
                        ? 'bg-sea-700 font-semibold text-white'
                        : 'text-sea-900 hover:bg-sea-50'
                    }`}
                  >
                    <Icon size={16} aria-hidden className="shrink-0" />
                    <span className="flex-1">
                      {i + 1}. {t(`tutorial.items.${l.id}.title`)}
                    </span>
                    {read.includes(l.id) && (
                      <CheckCircle2
                        size={16}
                        className={active ? 'text-white' : 'text-palm-600'}
                        aria-label={t('tutorial.read')}
                      />
                    )}
                  </Link>
                </li>
              );
            })}
          </ol>
        </nav>
      </Card>

      <article className="card" aria-labelledby="lesson-title">
        <p className="text-xs font-semibold tracking-wide text-sand-700 uppercase">
          {t('tutorial.lessonOf', { n: index + 1, total: LESSONS.length })}
        </p>
        <h2 id="lesson-title" className="mb-2 text-2xl font-extrabold text-sea-900">
          {title}
        </h2>
        <p className="mb-4 max-w-3xl text-base">{t(`tutorial.items.${lesson.id}.intro`)}</p>
        <figure className="mb-4 overflow-hidden rounded-lg border border-sand-200 bg-sand-50">
          <img
            src={`${base}tutorial/${lesson.image}`}
            alt={t('tutorial.screenshotAlt', { title })}
            width={1280}
            height={800}
            loading="lazy"
            className="h-auto w-full"
          />
        </figure>
        <h3 className="mb-2 font-bold text-sea-900">{t('tutorial.keyPoints')}</h3>
        <ul className="mb-4 max-w-3xl list-disc space-y-1.5 pl-5">
          {points.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
        <aside className="mb-5 flex max-w-3xl gap-3 rounded-md border border-sand-300 bg-sand-100 p-3">
          <Lightbulb size={20} className="mt-0.5 shrink-0 text-sand-700" aria-hidden />
          <p>
            <strong>{t('tutorial.tip')}:</strong> {t(`tutorial.items.${lesson.id}.tip`)}
          </p>
        </aside>
        <div className="flex flex-wrap items-center gap-2">
          <button
            className="btn btn-secondary"
            onClick={() => markRead(!isRead)}
            aria-pressed={isRead}
          >
            {isRead ? (
              <CheckCircle2 size={16} className="text-palm-600" aria-hidden />
            ) : (
              <Circle size={16} aria-hidden />
            )}
            {isRead ? t('tutorial.read') : t('tutorial.markRead')}
          </button>
          {inGame && (
            <Link
              className="btn btn-secondary"
              to={`/gioco/${lesson.route}`}
              onClick={() => markRead(true)}
            >
              <Play size={16} aria-hidden /> {t('tutorial.tryIt')}
            </Link>
          )}
          <span className="flex-1" />
          <button
            className="btn btn-secondary"
            disabled={index === 0}
            onClick={() => goTo(index - 1)}
          >
            <ArrowLeft size={16} aria-hidden /> {t('tutorial.prev')}
          </button>
          <button
            className="btn btn-primary"
            disabled={index === LESSONS.length - 1}
            onClick={() => goTo(index + 1)}
          >
            {t('tutorial.next')} <ArrowRight size={16} aria-hidden />
          </button>
        </div>
      </article>
    </div>
  );

  if (inGame) {
    return (
      <div>
        <PageHeader title={t('tutorial.title')} subtitle={t('tutorial.subtitle')} />
        {content}
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gradient-to-b from-sea-100 to-sand-100">
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <Link to="/" className="btn btn-ghost">
            <ArrowLeft size={16} aria-hidden /> {t('tutorial.backHome')}
          </Link>
          <span className="flex-1" />
          <Logo size={36} />
        </div>
        <PageHeader title={t('tutorial.title')} subtitle={t('tutorial.subtitle')} />
        {content}
      </main>
    </div>
  );
}
