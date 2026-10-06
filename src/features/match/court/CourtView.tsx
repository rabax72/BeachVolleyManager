/**
 * Rappresentazione grafica della partita: campo visto dall'alto, i quattro giocatori e la palla
 * che ripercorre i tocchi dell'ultimo scambio.
 */
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  blockerIndex,
  type MatchEvent,
  type MatchState,
  type TeamIndex,
} from '../../../engine/match';
import type { Player } from '../../../engine/types';
import { t } from '../../../i18n';
import { PlayerAvatar } from '../../../ui/avatar/Avatar';
import { teamLabel } from '../commentary';
import {
  buildRallyScript,
  FIELD,
  sampleScript,
  scriptDuration,
  serveFormation,
  type Frame,
  type Positions,
  type Segment,
} from './rallyScript';

type PointEvent = Extract<MatchEvent, { kind: 'point' }>;

const TEAM_COLORS = { own: 'var(--color-sea-700)', opp: 'var(--color-coral-600)' };

const pctX = (x: number): string => `${((x + FIELD.halfLength) / (2 * FIELD.halfLength)) * 100}%`;
const pctY = (y: number): string => `${((y + FIELD.halfWidth) / (2 * FIELD.halfWidth)) * 100}%`;

const surname = (name: string): string => name.split(' ').slice(1).join(' ') || name;

const prefersReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

function lastPoint(events: readonly MatchEvent[]): PointEvent | null {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e.kind === 'point') return e;
  }
  return null;
}

interface View {
  frame: Frame;
  segs: Segment[];
}

/** `sunX`: lato del sole (-1 sinistra, +1 destra), null senza sole. */
function CourtLines({ sunX }: { sunX: number | null }) {
  const id = useId();
  const { courtHalfLength: L, courtHalfWidth: W, halfLength, halfWidth } = FIELD;
  return (
    <svg
      viewBox={`${-halfLength} ${-halfWidth} ${2 * halfLength} ${2 * halfWidth}`}
      preserveAspectRatio="none"
      className="absolute inset-0 h-full w-full"
      aria-hidden
    >
      <defs>
        <radialGradient id={`${id}-sand`} cx="50%" cy="45%" r="70%">
          <stop offset="0%" stopColor="var(--color-sand-200)" />
          <stop offset="100%" stopColor="var(--color-sand-400)" />
        </radialGradient>
      </defs>
      <rect
        x={-halfLength}
        y={-halfWidth}
        width={2 * halfLength}
        height={2 * halfWidth}
        fill={`url(#${id}-sand)`}
      />
      <rect
        x={-L}
        y={-W}
        width={2 * L}
        height={2 * W}
        fill="var(--color-sand-100)"
        fillOpacity={0.35}
        stroke="white"
        strokeWidth={0.1}
      />
      {/* Rete con pali */}
      <line
        x1={0}
        y1={-W - 0.9}
        x2={0}
        y2={W + 0.9}
        stroke="black"
        strokeOpacity={0.15}
        strokeWidth={0.35}
      />
      <line
        x1={0}
        y1={-W - 0.9}
        x2={0}
        y2={W + 0.9}
        stroke="var(--color-sea-900)"
        strokeWidth={0.12}
      />
      <line
        x1={0}
        y1={-W - 0.9}
        x2={0}
        y2={W + 0.9}
        stroke="white"
        strokeWidth={0.06}
        strokeDasharray="0.15 0.15"
      />
      <circle cx={0} cy={-W - 0.9} r={0.2} fill="var(--color-sea-900)" />
      <circle cx={0} cy={W + 0.9} r={0.2} fill="var(--color-sea-900)" />
      {sunX !== null && (
        <g transform={`translate(${sunX * (halfLength - 0.9)} ${-halfWidth + 0.9})`}>
          {Array.from({ length: 8 }, (_, i) => (
            <line
              key={i}
              x1={0}
              y1={0.55}
              x2={0}
              y2={0.8}
              stroke="#f5b301"
              strokeWidth={0.1}
              strokeLinecap="round"
              transform={`rotate(${i * 45})`}
            />
          ))}
          <circle r={0.42} fill="#fcd34d" stroke="#f5b301" strokeWidth={0.08} />
        </g>
      )}
    </svg>
  );
}

export function CourtView({
  s,
  side,
  players,
  replayKey,
  speedScale,
  banner,
  onBusyChange,
}: {
  s: MatchState;
  /** Squadra del giocatore umano. */
  side: TeamIndex;
  players: Record<string, Player>;
  /** Cambia per rivedere l'ultimo punto. */
  replayKey: number;
  /** Moltiplicatore delle durate; 0 = nessuna animazione. */
  speedScale: number;
  /** Annuncio a fine scambio (cambio campo, fine set, timeout…). */
  banner: string | null;
  onBusyChange: (busy: boolean) => void;
}) {
  // Lo stato viene clonato a ogni comando (timeout, tattica): l'ultimo punto si tiene stabile
  // finché non cambia il rally, per non interrompere l'animazione in corso.
  const latest = lastPoint(s.events);
  const [last, setLast] = useState(latest);
  if (latest?.rally !== last?.rally) setLast(latest);
  // La squadra 0 parte a sinistra e i lati si invertono a ogni cambio campo, che nel motore
  // coincide con il cambio della squadra controsole: il sole resta così fisso sullo sfondo.
  const firstPoint = s.events.find((e): e is PointEvent => e.kind === 'point');
  const initialSun = firstPoint?.sunFacing ?? s.sunFacing;
  const sunFacing = last?.sunFacing ?? s.sunFacing;
  const leftTeam: TeamIndex = sunFacing === initialSun ? 0 : 1;
  const sunX = s.setup.conditions.sun > 0 ? (sunFacing === leftTeam ? 1 : -1) : null;

  // Dimensione degli avatar in proporzione alla larghezza del campo.
  const boxRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const AVATAR = Math.round(Math.max(20, Math.min(34, width / 26)));
  const compact = width < 480;
  const blockers = useMemo(
    () => [blockerIndex(s.setup.teams[0]), blockerIndex(s.setup.teams[1])] as const,
    [s.setup],
  );
  const segs = useMemo(
    () =>
      last?.actions ? buildRallyScript(last.actions, leftTeam, blockers, last.rally * 7919) : [],
    [last, leftTeam, blockers],
  );

  // A riposo: posizione finale dell'ultimo scambio, oppure schieramento per il primo servizio.
  const rest = useMemo<View>(() => {
    if (segs.length) {
      const end = segs[segs.length - 1];
      return {
        segs,
        frame: { players: end.players, ball: end.ball.to, seg: segs.length - 1, p: 1 },
      };
    }
    const players = serveFormation(s.servingTeam, s.currentServer, leftTeam);
    const sp = players[s.servingTeam][s.currentServer];
    return { segs: [], frame: { players, ball: { ...sp, z: 1 }, seg: -1, p: 0 } };
  }, [segs, s.servingTeam, s.currentServer, leftTeam]);

  const [anim, setAnim] = useState<View | null>(null);
  const view = anim ?? rest;

  const shownRef = useRef<Positions>(view.frame.players);
  const speedRef = useRef(speedScale);
  const busyRef = useRef(onBusyChange);
  const prevRef = useRef({ rally: last?.rally ?? 0, replayKey });
  useEffect(() => {
    shownRef.current = view.frame.players;
    speedRef.current = speedScale;
    busyRef.current = onBusyChange;
  });

  useEffect(() => {
    const prev = prevRef.current;
    prevRef.current = { rally: last?.rally ?? 0, replayKey };
    const isNew = last !== null && (last.rally === prev.rally + 1 || replayKey !== prev.replayKey);
    if (!isNew || !segs.length || speedRef.current <= 0 || prefersReducedMotion()) return;

    const start = shownRef.current;
    const total = scriptDuration(segs);
    let elapsed = 0;
    let before = performance.now();
    let raf = 0;
    busyRef.current(true);
    const tick = (now: number) => {
      const scale = speedRef.current;
      elapsed += scale > 0 ? (now - before) / scale : total;
      before = now;
      if (elapsed >= total) {
        setAnim(null);
        busyRef.current(false);
        return;
      }
      setAnim({ segs, frame: sampleScript(segs, start, elapsed) });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      setAnim(null);
      busyRef.current(false);
    };
  }, [last, segs, replayKey]);

  const { frame } = view;
  const seg = view.segs[frame.seg] as Segment | undefined;
  const nameOf = (team: TeamIndex, i: number) => s.setup.teams[team].players[i].name;

  let caption: string;
  let captionTeam: TeamIndex | null = null;
  let outcome = '';
  if (seg?.final && last) {
    outcome = t(`match.court.outcome.${last.cause}`);
    const who = s.setup.teams.flatMap((tm) => tm.players).find((p) => p.id === last.playerId);
    caption = who ? `${outcome} ${surname(who.name)}` : outcome;
    captionTeam = last.team;
  } else if (seg?.action) {
    const a = seg.action;
    const what = t(`match.court.${a.result === 'error' ? 'errors' : 'actions'}.${a.kind}`);
    caption = `${surname(nameOf(a.team, a.player))}: ${what}`;
  } else {
    caption = t('match.court.waiting', { player: nameOf(s.servingTeam, s.currentServer) });
  }

  const jumping = (team: TeamIndex, i: number): number =>
    seg?.jumps?.some((j) => j.team === team && j.player === i) ? Math.sin(Math.PI * frame.p) : 0;
  const active = (team: TeamIndex, i: number): boolean =>
    !seg?.final && seg?.action?.team === team && seg.action.player === i;

  const ball = frame.ball;
  const showBanner = !anim && banner;
  const outcomeColor =
    captionTeam === null ? null : captionTeam === side ? TEAM_COLORS.own : TEAM_COLORS.opp;

  return (
    <div>
      <div
        ref={boxRef}
        className="relative w-full overflow-hidden rounded-lg shadow-inner select-none"
        style={{ aspectRatio: `${FIELD.halfLength} / ${FIELD.halfWidth}` }}
        role="img"
        aria-label={t('match.court.label', {
          left: teamLabel(s.setup, leftTeam),
          right: teamLabel(s.setup, leftTeam === 0 ? 1 : 0),
        })}
      >
        <CourtLines sunX={sunX} />
        {([0, 1] as TeamIndex[]).flatMap((team) =>
          s.setup.teams[team].players.map((p, i) => {
            const pos = frame.players[team][i];
            const jump = jumping(team, i);
            const color = team === side ? TEAM_COLORS.own : TEAM_COLORS.opp;
            const full = players[p.id];
            return (
              <div
                key={p.id}
                className="absolute flex flex-col items-center"
                style={{
                  left: pctX(pos.x),
                  top: pctY(pos.y),
                  transform: `translate(-50%, -${AVATAR / 2}px)`,
                  zIndex: 2,
                }}
                aria-hidden
              >
                <span
                  className="absolute rounded-full bg-black/25"
                  style={{ width: AVATAR * 0.9, height: AVATAR * 0.35, top: AVATAR * 0.82 }}
                />
                <span
                  className="relative flex items-center justify-center rounded-full bg-white text-xs font-bold"
                  style={{
                    width: AVATAR,
                    height: AVATAR,
                    boxShadow: `0 0 0 ${active(team, i) ? 4 : 3}px ${active(team, i) ? 'var(--color-sand-300)' : color}`,
                    transform: `translateY(${-jump * 8}px) scale(${1 + jump * 0.18})`,
                    color,
                  }}
                >
                  {full ? (
                    <PlayerAvatar player={full} size={AVATAR} decorative />
                  ) : (
                    p.name
                      .split(' ')
                      .map((w) => w[0])
                      .join('')
                  )}
                </span>
                {!compact && (
                  <span
                    className="relative mt-1 rounded px-1 text-[10px] leading-tight font-semibold whitespace-nowrap text-white"
                    style={{ background: color }}
                  >
                    {surname(p.name)}
                  </span>
                )}
              </div>
            );
          }),
        )}
        {/* Ombra e palla: la palla si alza visivamente con l'altezza */}
        <span
          className="absolute rounded-full bg-black"
          style={{
            left: pctX(ball.x),
            top: pctY(ball.y),
            width: 12,
            height: 6,
            opacity: Math.max(0.1, 0.35 - ball.z * 0.05),
            transform: 'translate(-50%, -50%)',
            zIndex: 1,
          }}
          aria-hidden
        />
        <span
          className="absolute rounded-full border border-sand-500 bg-gradient-to-br from-white to-yellow-200"
          style={{
            left: pctX(ball.x),
            top: pctY(ball.y - ball.z * 0.32),
            width: 13,
            height: 13,
            transform: `translate(-50%, -50%) scale(${1 + ball.z * 0.07})`,
            zIndex: 3,
          }}
          aria-hidden
        />
        {seg?.final && outcomeColor && (
          <div
            className="absolute top-2 -translate-x-1/2 rounded-full px-3 py-1 text-sm font-extrabold whitespace-nowrap text-white shadow"
            style={{
              background: outcomeColor,
              left: last?.team === leftTeam ? '25%' : '75%',
              zIndex: 4,
            }}
            aria-hidden
          >
            {outcome}
          </div>
        )}
        {showBanner && (
          <div
            className="absolute bottom-3 left-1/2 max-w-[90%] -translate-x-1/2 rounded-full bg-sea-900/85 px-3 py-1 text-center text-sm font-bold text-white shadow"
            style={{ zIndex: 4 }}
          >
            {banner}
          </div>
        )}
      </div>
      <p className="mt-2 min-h-5 text-sm font-semibold text-sea-900" aria-hidden>
        {caption}
      </p>
    </div>
  );
}
