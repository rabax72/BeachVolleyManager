/** Grafico radar SVG degli attributi (scala 1–20). */
import { ATTRIBUTE_KEYS, type Attributes } from '../engine/types';
import { displayAttr } from '../engine/player';
import { t } from '../i18n';

export function Radar({
  attrs,
  compare,
  size = 300,
}: {
  attrs: Attributes;
  compare?: Attributes;
  size?: number;
}) {
  const keys = ATTRIBUTE_KEYS;
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2 - 42;
  const point = (i: number, v: number): [number, number] => {
    const a = (Math.PI * 2 * i) / keys.length - Math.PI / 2;
    const rr = (v / 20) * r;
    return [cx + Math.cos(a) * rr, cy + Math.sin(a) * rr];
  };
  const poly = (a: Attributes) =>
    keys.map((k, i) => point(i, displayAttr(a[k])).join(',')).join(' ');
  const summary = keys.map((k) => `${t(`attr.${k}`)} ${displayAttr(attrs[k])}`).join(', ');
  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      className="h-auto w-full max-w-[320px]"
      role="img"
      aria-label={summary}
    >
      {[5, 10, 15, 20].map((lv) => (
        <polygon
          key={lv}
          points={keys.map((_, i) => point(i, lv).join(',')).join(' ')}
          fill={lv === 20 ? '#fdfaf3' : 'none'}
          stroke="#e5ca93"
          strokeWidth={1}
        />
      ))}
      {keys.map((_, i) => {
        const [x, y] = point(i, 20);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#f0e0bd" />;
      })}
      {compare && (
        <polygon
          points={poly(compare)}
          fill="rgba(226,88,62,0.15)"
          stroke="#e2583e"
          strokeWidth={1.5}
          strokeDasharray="4 3"
        />
      )}
      <polygon points={poly(attrs)} fill="rgba(14,122,143,0.28)" stroke="#0b6375" strokeWidth={2} />
      {keys.map((k, i) => {
        const [x, y] = point(i, 24.5);
        return (
          <text
            key={k}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={11}
            fontWeight={700}
            fill="#3d2c10"
          >
            {t(`attrShort.${k}`)}
            <tspan x={x} dy={12} fontWeight={600} fill="#0b6375">
              {displayAttr(attrs[k])}
            </tspan>
          </text>
        );
      })}
    </svg>
  );
}
