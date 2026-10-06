/** Avatar cartoon a mezzo busto, disegnato in SVG su una griglia 64×64 inquadrata sul busto. */
import { memo, useId } from 'react';
import { tg } from '../../i18n';
import { fullName } from '../../engine/player';
import type { Player } from '../../engine/types';
import { avatarTraits, shade, type AvatarTraits } from './avatarTraits';

const INK = '#2b2420';

/** Capelli dietro la testa (code, capelli lunghi, caschetto). */
function HairBack({ tr }: { tr: AvatarTraits }) {
  const c = tr.hairColor;
  switch (tr.hair) {
    case 'long':
      return (
        <path
          d="M19.5 26 Q19 12 32 12 Q45 12 44.5 26 L46 48 Q40 50 39 45 L40 30 L24 30 L25 45 Q24 50 18 48 Z"
          fill={c}
        />
      );
    case 'bob':
      return (
        <path
          d="M20 26 Q20 13 32 13 Q44 13 44 26 L44.5 36 Q41.5 38 40.5 34 L40 24 L24 24 L23.5 34 Q22.5 38 19.5 36 Z"
          fill={c}
        />
      );
    case 'ponytail':
      return <path d="M39.5 21 Q51 23 47.5 41 Q46.5 34 41 29 Z" fill={c} />;
    case 'braid':
      return (
        <g fill={c}>
          {[0, 1, 2, 3, 4].map((i) => (
            <ellipse
              key={i}
              cx={42.5 + i * 0.4}
              cy={31 + i * 3.6}
              rx={2.6 - i * 0.15}
              ry={2.2}
              stroke={shade(c, 0.25)}
              strokeWidth={0.4}
            />
          ))}
        </g>
      );
    default:
      return null;
  }
}

/** Capelli sopra la testa. */
function HairFront({ tr }: { tr: AvatarTraits }) {
  const c = tr.hairColor;
  const cap = 'M21.5 26 Q21 14 32 14 Q43 14 42.5 26 Q40 19 32 19 Q24 19 21.5 26 Z';
  const fringe =
    'M21.5 26 Q21 13.5 32 13.5 Q43 13.5 42.5 26 Q41 20 36 18.5 Q30 22 23 21 Q22 23 21.5 26 Z';
  switch (tr.hair) {
    case 'bald':
      return (
        <g fill={c} opacity={0.85}>
          <path d="M21.4 27 Q21.3 22 23 20.5 L23.4 27 Z" />
          <path d="M42.6 27 Q42.7 22 41 20.5 L40.6 27 Z" />
        </g>
      );
    case 'buzz':
      return <path d={cap} fill={c} opacity={0.6} />;
    case 'spiky':
      return (
        <g fill={c}>
          <path d={cap} />
          <path d="M21.6 22 L23.5 12 L27 16.5 L29.5 9.5 L32.5 15.5 L35.5 9.5 L37.5 16 L41 12 L42.4 22 Z" />
        </g>
      );
    case 'curly':
      return (
        <g fill={c}>
          <path d={cap} />
          {[
            [22.5, 21],
            [25.5, 16.5],
            [29.5, 14.2],
            [34.5, 14.2],
            [38.5, 16.5],
            [41.5, 21],
          ].map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r={3.6} />
          ))}
        </g>
      );
    case 'manBun':
      return (
        <g fill={c}>
          <circle cx={32} cy={12} r={3.6} />
          <path d={cap} />
        </g>
      );
    case 'bun':
      return (
        <g fill={c}>
          <circle cx={32} cy={11.5} r={4.6} />
          <path d={fringe} />
        </g>
      );
    case 'pixie':
    case 'ponytail':
    case 'braid':
    case 'bob':
    case 'long':
      return <path d={fringe} fill={c} />;
    default:
      return <path d={cap} fill={c} />;
  }
}

function FacialHair({ tr }: { tr: AvatarTraits }) {
  const c = tr.hairColor;
  const jaw = 'M22.5 29 Q23 39.5 32 40 Q41 39.5 41.5 29 Q40 36.5 32 37 Q24 36.5 22.5 29 Z';
  switch (tr.facialHair) {
    case 'stubble':
      return <path d={jaw} fill={c} opacity={0.28} />;
    case 'beard':
      return (
        <g fill={c}>
          <path d={jaw} opacity={0.92} />
          <path d="M28.3 32.6 Q32 30.7 35.7 32.6 Q32 32.1 28.3 32.6 Z" />
        </g>
      );
    case 'mustache':
      return <path d="M28.3 32.6 Q32 30.5 35.7 32.6 Q32 31.9 28.3 32.6 Z" fill={c} />;
    default:
      return null;
  }
}

function Eyes({ tr }: { tr: AvatarTraits }) {
  if (tr.accessory === 'sunglasses') {
    return (
      <g>
        <rect x={24.6} y={25.4} width={6.4} height={4.2} rx={1.8} fill="#1d2a33" />
        <rect x={33} y={25.4} width={6.4} height={4.2} rx={1.8} fill="#1d2a33" />
        <path d="M31 26.6 Q32 26 33 26.6" stroke="#1d2a33" strokeWidth={0.8} fill="none" />
        <path d="M25.6 26.4 L27.4 26.4 M34 26.4 L35.8 26.4" stroke="#8fd3e0" strokeWidth={0.6} />
      </g>
    );
  }
  const sad = tr.mood === 'sad';
  return (
    <g>
      {[28, 36].map((x) => (
        <g key={x}>
          <ellipse
            cx={x}
            cy={sad ? 27.8 : 27.4}
            rx={1.25}
            ry={tr.mood === 'happy' ? 1.2 : 1.55}
            fill={INK}
          />
          <circle cx={x + 0.4} cy={26.9} r={0.4} fill="#fff" />
          {tr.female && (
            <path d={`M${x - 1.6} 25.9 L${x - 2.3} 25.2`} stroke={INK} strokeWidth={0.5} />
          )}
        </g>
      ))}
    </g>
  );
}

function Brows({ tr }: { tr: AvatarTraits }) {
  const c = shade(tr.hairColor === '#ece0b8' ? '#b89a5c' : tr.hairColor, 0.1);
  const w = tr.female ? 0.75 : 1.1;
  // Il cappellino e la fascia coprono la fronte: le sopracciglia restano visibili sotto.
  const d =
    tr.mood === 'sad'
      ? 'M25.8 23.9 L29.6 22.6 M34.4 22.6 L38.2 23.9'
      : tr.mood === 'happy'
        ? 'M25.8 23.6 Q27.8 22 29.8 23.1 M34.2 23.1 Q36.2 22 38.2 23.6'
        : 'M25.9 23.3 L29.7 23 M34.3 23 L38.1 23.3';
  return <path d={d} stroke={c} strokeWidth={w} strokeLinecap="round" fill="none" />;
}

function Mouth({ tr }: { tr: AvatarTraits }) {
  const lip = shade(tr.skin, 0.45);
  switch (tr.mood) {
    case 'happy':
      return (
        <g>
          <path d="M28 33 Q32 38 36 33 Z" fill="#6b2424" />
          <path d="M28.7 33.3 Q32 34.7 35.3 33.3 L35 33.05 Q32 33.6 29 33.05 Z" fill="#fff" />
          <circle cx={25.6} cy={31.2} r={1.8} fill="#e8807a" opacity={0.35} />
          <circle cx={38.4} cy={31.2} r={1.8} fill="#e8807a" opacity={0.35} />
        </g>
      );
    case 'content':
      return (
        <path
          d="M28.6 33.2 Q32 35.8 35.4 33.2"
          stroke={lip}
          strokeWidth={1}
          strokeLinecap="round"
          fill="none"
        />
      );
    case 'neutral':
      return (
        <path
          d="M29 34 Q32 34.5 35 34"
          stroke={lip}
          strokeWidth={1}
          strokeLinecap="round"
          fill="none"
        />
      );
    case 'sad':
      return (
        <path
          d="M29 35.2 Q32 32.6 35 35.2"
          stroke={lip}
          strokeWidth={1}
          strokeLinecap="round"
          fill="none"
        />
      );
  }
}

/** Accessori sopra i capelli (gli occhiali sono disegnati con gli occhi). */
function Headwear({ tr }: { tr: AvatarTraits }) {
  const c = tr.accessoryColor;
  const dark = shade(c === '#ffffff' ? '#d8d8d8' : c, 0.2);
  switch (tr.accessory) {
    case 'cap':
      return (
        <g>
          <path
            d="M20.6 22.5 Q20.6 11.5 32 11.5 Q43.4 11.5 43.4 22.5 Z"
            fill={c}
            stroke={dark}
            strokeWidth={0.6}
          />
          <path d="M20.4 22.5 L43.6 22.5 L43.6 24 Q32 22.6 20.4 24 Z" fill={dark} />
          <circle cx={32} cy={11.8} r={0.9} fill={dark} />
        </g>
      );
    case 'visor':
      return (
        <g>
          <path
            d="M21 20.5 Q32 18 43 20.5 L43 23 Q32 20.6 21 23 Z"
            fill={c}
            stroke={dark}
            strokeWidth={0.5}
          />
          <ellipse cx={32} cy={23.4} rx={12.5} ry={2.4} fill={dark} />
        </g>
      );
    case 'headband':
      return (
        <path
          d="M21.3 20.6 Q32 17.6 42.7 20.6 L42.8 23 Q32 20.2 21.2 23 Z"
          fill={c}
          stroke={dark}
          strokeWidth={0.5}
        />
      );
    default:
      return null;
  }
}

/** Cerotto incrociato sulla guancia per i giocatori infortunati. */
function Plaster() {
  return (
    <g transform="translate(38.6 30.6)">
      {[35, -35].map((deg) => (
        <g key={deg} transform={`rotate(${deg})`}>
          <rect
            x={-3.6}
            y={-1.15}
            width={7.2}
            height={2.3}
            rx={1}
            fill="#f1d2a6"
            stroke="#c99a5f"
            strokeWidth={0.35}
          />
          <rect x={-1} y={-0.85} width={2} height={1.7} fill="#e6bd88" />
        </g>
      ))}
    </g>
  );
}

function Torso({ tr }: { tr: AvatarTraits }) {
  const hw = tr.shoulders;
  const skinShade = shade(tr.skin, 0.12);
  const L = 32 - hw + 6;
  const R = 32 + hw - 6;
  return (
    <g>
      {/* spalle e braccia */}
      <path
        d={`M${32 - hw} 66 L${32 - hw} 56 Q${32 - hw} 46.5 ${32 - hw + 8} 45.5 L${32 + hw - 8} 45.5 Q${32 + hw} 46.5 ${32 + hw} 56 L${32 + hw} 66 Z`}
        fill={tr.skin}
      />
      {/* collo */}
      <path d="M28.3 36 L35.7 36 L36 47 Q32 49 28 47 Z" fill={skinShade} />
      {/* canotta */}
      <path
        d={`M${L} 66 L${L} 50 L${L + 3.5} 45.8 Q32 ${tr.female ? 54 : 55.5} ${R - 3.5} 45.8 L${R} 50 L${R} 66 Z`}
        fill={tr.jersey}
      />
      <path d={`M${L} 58.5 L${R} 58.5`} stroke="#ffffff" strokeOpacity={0.55} strokeWidth={1.4} />
    </g>
  );
}

function AvatarSvg({ tr, size, label }: { tr: AvatarTraits; size: number; label: string | null }) {
  const clipId = useId();
  const skinShade = shade(tr.skin, 0.12);
  return (
    <svg
      width={size}
      height={size}
      viewBox="8 7 48 48"
      className="shrink-0"
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    >
      <defs>
        <clipPath id={clipId}>
          <circle cx={32} cy={31} r={24} />
        </clipPath>
      </defs>
      <g clipPath={`url(#${clipId})`}>
        <rect width={64} height={64} fill="#dff4f7" />
        <path d="M0 52 Q16 47 32 52 T64 52 V64 H0 Z" fill="#f0e0bd" />
        <HairBack tr={tr} />
        <Torso tr={tr} />
        {/* orecchie e testa */}
        <ellipse cx={21.6} cy={28.2} rx={2.1} ry={3} fill={skinShade} />
        <ellipse cx={42.4} cy={28.2} rx={2.1} ry={3} fill={skinShade} />
        {tr.earrings && (
          <>
            <circle cx={21.4} cy={31.6} r={0.9} fill="#f2b705" />
            <circle cx={42.6} cy={31.6} r={0.9} fill="#f2b705" />
          </>
        )}
        <ellipse
          cx={32}
          cy={27}
          rx={tr.female ? 10.2 : 10.6}
          ry={tr.female ? 11.6 : 12.2}
          fill={tr.skin}
        />
        <FacialHair tr={tr} />
        <HairFront tr={tr} />
        <Headwear tr={tr} />
        <Brows tr={tr} />
        <Eyes tr={tr} />
        <path
          d="M32 28.6 Q30.7 31.4 32.4 31.8"
          stroke={shade(tr.skin, 0.3)}
          strokeWidth={0.8}
          strokeLinecap="round"
          fill="none"
        />
        <Mouth tr={tr} />
        {tr.injured && <Plaster />}
      </g>
    </svg>
  );
}

type AvatarPlayer = Parameters<typeof avatarTraits>[0];

/**
 * Avatar di un giocatore; l'etichetta accessibile include nome, umore e infortunio.
 * Con `decorative` è nascosto ai lettori di schermo (quando il nome è già scritto accanto).
 */
export const PlayerAvatar = memo(function PlayerAvatar({
  player,
  size = 32,
  decorative = false,
}: {
  player: AvatarPlayer & Pick<Player, 'firstName' | 'lastName'>;
  size?: number;
  decorative?: boolean;
}) {
  const tr = avatarTraits(player);
  const label = [
    fullName(player),
    tg(`avatar.mood.${tr.mood}`, player.gender),
    tr.injured ? tg('common.injured', player.gender) : null,
  ]
    .filter(Boolean)
    .join(', ');
  return (
    <span
      className="inline-flex shrink-0 overflow-hidden rounded-full ring-1 ring-sand-200"
      style={{ width: size, height: size }}
      title={decorative ? label : undefined}
    >
      <AvatarSvg tr={tr} size={size} label={decorative ? null : label} />
    </span>
  );
});
