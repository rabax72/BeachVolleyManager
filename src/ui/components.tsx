/** Componenti UI riutilizzabili. */
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { t } from '../i18n';
import { displayAttr } from '../engine/player';

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold text-sea-900">{title}</h1>
        {subtitle && <p className="mt-1 max-w-3xl text-sm text-sand-700">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function Card({
  title,
  actions,
  children,
  className = '',
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {title && <h2 className="card-title mb-0">{title}</h2>}
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
      )}
      {children}
    </section>
  );
}

type Tone = 'neutral' | 'sea' | 'sand' | 'good' | 'warn' | 'bad';
const TONES: Record<Tone, string> = {
  neutral: 'bg-sand-100 text-sand-900 border-sand-200',
  sea: 'bg-sea-100 text-sea-900 border-sea-200',
  sand: 'bg-sand-200 text-sand-900 border-sand-300',
  good: 'bg-green-100 text-green-900 border-green-200',
  warn: 'bg-amber-100 text-amber-900 border-amber-300',
  bad: 'bg-red-100 text-red-900 border-red-200',
};

export function Badge({
  tone = 'neutral',
  children,
  title,
}: {
  tone?: Tone;
  children: ReactNode;
  title?: string;
}) {
  return (
    <span
      title={title}
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs font-semibold whitespace-nowrap ${TONES[tone]}`}
    >
      {children}
    </span>
  );
}

/** Colore di un attributo 1–20. */
function attrTone(v: number): string {
  const d = displayAttr(v);
  if (d >= 16) return 'bg-sea-700 text-white';
  if (d >= 13) return 'bg-palm-600 text-white';
  if (d >= 10) return 'bg-sand-300 text-sand-900';
  if (d >= 7) return 'bg-amber-200 text-amber-950';
  return 'bg-red-200 text-red-950';
}

export function AttrValue({ value, label }: { value: number; label?: string }) {
  const d = displayAttr(value);
  return (
    <span
      className={`inline-flex min-w-7 justify-center rounded px-1 py-0.5 text-xs font-bold tabular-nums ${attrTone(value)}`}
      aria-label={label ? `${label}: ${d}` : String(d)}
    >
      {d}
    </span>
  );
}

/** Barra 0–100 (morale, forma, fatica, chimica). `invert` = valori alti sono negativi. */
export function Meter({
  value,
  label,
  invert = false,
  showValue = true,
}: {
  value: number;
  label: string;
  invert?: boolean;
  showValue?: boolean;
}) {
  const v = Math.max(0, Math.min(100, Math.round(value)));
  const good = invert ? 100 - v : v;
  const color = good >= 65 ? 'bg-palm-600' : good >= 40 ? 'bg-sand-400' : 'bg-coral-500';
  return (
    <div className="flex items-center gap-2" title={`${label}: ${v}%`}>
      <div
        className="h-2 w-10 shrink-0 overflow-hidden rounded bg-sand-100"
        role="meter"
        aria-label={label}
        aria-valuenow={v}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className={`h-full ${color}`} style={{ width: `${v}%` }} />
      </div>
      {showValue && <span className="text-xs tabular-nums text-sand-700">{v}</span>}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
}) {
  return (
    <div className="rounded-md border border-sand-200 bg-sand-50 px-3 py-2">
      <div className="text-xs font-semibold text-sand-700 uppercase">{label}</div>
      <div className="text-lg font-bold text-sea-900 tabular-nums">{value}</div>
      {hint && <div className="text-xs text-sand-700">{hint}</div>}
    </div>
  );
}

export function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      prev?.focus();
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-sea-900/40 p-4"
      onMouseDown={onClose}
    >
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white p-5 shadow-xl"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <h2 id={titleId} className="text-lg font-bold text-sea-900">
            {title}
          </h2>
          <button className="btn btn-ghost" onClick={onClose} aria-label={t('common.close')}>
            <X size={18} aria-hidden />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function ConfirmModal({
  open,
  title,
  message,
  onConfirm,
  onClose,
  danger = false,
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  onConfirm: () => void;
  onClose: () => void;
  danger?: boolean;
}) {
  return (
    <Modal open={open} title={title} onClose={onClose}>
      <div className="mb-4 text-sm">{message}</div>
      <div className="flex flex-wrap justify-end gap-2">
        <button className="btn btn-secondary" onClick={onClose}>
          {t('common.cancel')}
        </button>
        <button
          className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`}
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {t('common.confirm')}
        </button>
      </div>
    </Modal>
  );
}

export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
  hideLabel = false,
  className = '',
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  hideLabel?: boolean;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={className}>
      <label htmlFor={id} className={hideLabel ? 'sr-only' : 'label'}>
        {label}
      </label>
      <select
        id={id}
        className="input w-full"
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
}: {
  tabs: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className="mb-4 flex flex-wrap gap-1 border-b border-sand-200"
    >
      {tabs.map((tab) => (
        <button
          key={tab.value}
          role="tab"
          aria-selected={value === tab.value}
          className={`-mb-px rounded-t-md border px-3 py-1.5 text-sm font-semibold ${
            value === tab.value
              ? 'border-sand-200 border-b-white bg-white text-sea-900'
              : 'border-transparent text-sand-700 hover:text-sea-800'
          }`}
          onClick={() => onChange(tab.value)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-md border border-dashed border-sand-300 bg-sand-50 p-4 text-sm text-sand-700">
      {children}
    </p>
  );
}
