import type { ReactNode } from 'react';

/** Offense diagram keys aligned with `docs/game/alpha design system/snap-count-components.jsx`. */
type OffenseDiagramKey =
  | 'SPOT'
  | 'DEEP'
  | 'SLANT'
  | 'POWER'
  | 'ISO'
  | 'SWEEP'
  | 'READ'
  | 'TRIPLE';

type DefenseDiagramKey = 'COVER 3' | 'BLITZ' | 'MAN' | 'ZONE' | 'PREVENT' | 'RUN D';

const OFFENSE_MAP: Record<string, OffenseDiagramKey> = {
  'run-in': 'POWER',
  'run-out': 'SWEEP',
  'pass-s': 'SPOT',
  'pass-m': 'SLANT',
  'pass-d': 'DEEP',
  option: 'READ',
};

const DEFENSE_MAP: Record<string, DefenseDiagramKey> = {
  'run-d': 'RUN D',
  zone: 'ZONE',
  man: 'MAN',
  blitz: 'BLITZ',
  prevent: 'PREVENT',
};

const G = 'var(--gold)';
const SB = 'var(--storm-blue-bright)';
const BR = 'var(--blitz-red-bright)';
const TC = 'var(--text-secondary)';

function offenseFragments(s: number): Record<OffenseDiagramKey, ReactNode> {
  return {
    SPOT: (
      <>
        <line x1={34 * s} y1={46 * s} x2={34 * s} y2={22 * s} stroke={G} strokeWidth={1.5} />
        <line x1={34 * s} y1={22 * s} x2={44 * s} y2={10 * s} stroke={G} strokeWidth={1.5} />
        <circle cx={44 * s} cy={10 * s} r={3 * s} fill={G} />
        <circle cx={34 * s} cy={46 * s} r={3 * s} fill={TC} />
      </>
    ),
    DEEP: (
      <>
        <line
          x1={34 * s}
          y1={46 * s}
          x2={34 * s}
          y2={8 * s}
          stroke={G}
          strokeWidth={1.5}
          strokeDasharray="3,2"
        />
        <circle cx={34 * s} cy={8 * s} r={3 * s} fill={G} />
        <circle cx={34 * s} cy={46 * s} r={3 * s} fill={TC} />
      </>
    ),
    SLANT: (
      <>
        <line x1={28 * s} y1={46 * s} x2={28 * s} y2={30 * s} stroke={G} strokeWidth={1.5} />
        <line x1={28 * s} y1={30 * s} x2={50 * s} y2={12 * s} stroke={G} strokeWidth={1.5} />
        <circle cx={50 * s} cy={12 * s} r={3 * s} fill={G} />
        <circle cx={28 * s} cy={46 * s} r={3 * s} fill={TC} />
      </>
    ),
    POWER: (
      <>
        <line x1={34 * s} y1={46 * s} x2={34 * s} y2={14 * s} stroke={G} strokeWidth={2.5} />
        <polygon points={`${34 * s},${8 * s} ${30 * s},${17 * s} ${38 * s},${17 * s}`} fill={G} />
        <circle cx={34 * s} cy={46 * s} r={3 * s} fill={TC} />
      </>
    ),
    ISO: (
      <>
        <line x1={34 * s} y1={46 * s} x2={20 * s} y2={30 * s} stroke={G} strokeWidth={1.5} />
        <line x1={20 * s} y1={30 * s} x2={20 * s} y2={14 * s} stroke={G} strokeWidth={1.5} />
        <circle cx={20 * s} cy={14 * s} r={3 * s} fill={G} />
        <circle cx={34 * s} cy={46 * s} r={3 * s} fill={TC} />
      </>
    ),
    SWEEP: (
      <>
        <path
          d={`M ${20 * s} ${46 * s} Q ${60 * s} ${40 * s} ${58 * s} ${14 * s}`}
          stroke={G}
          strokeWidth={1.5}
          fill="none"
        />
        <circle cx={58 * s} cy={14 * s} r={3 * s} fill={G} />
        <circle cx={20 * s} cy={46 * s} r={3 * s} fill={TC} />
      </>
    ),
    READ: (
      <>
        <line x1={18 * s} y1={46 * s} x2={18 * s} y2={26 * s} stroke={G} strokeWidth={1.5} />
        <line x1={18 * s} y1={26 * s} x2={34 * s} y2={14 * s} stroke={G} strokeWidth={1.5} />
        <line x1={46 * s} y1={46 * s} x2={46 * s} y2={26 * s} stroke={TC} strokeWidth={1} />
        <line x1={46 * s} y1={26 * s} x2={34 * s} y2={14 * s} stroke={TC} strokeWidth={1} />
        <circle cx={34 * s} cy={14 * s} r={3 * s} fill={G} />
        <circle cx={18 * s} cy={46 * s} r={3 * s} fill={TC} />
        <circle cx={46 * s} cy={46 * s} r={3 * s} fill={TC} />
      </>
    ),
    TRIPLE: (
      <>
        <line x1={14 * s} y1={46 * s} x2={14 * s} y2={18 * s} stroke={G} strokeWidth={1.5} />
        <line x1={34 * s} y1={46 * s} x2={34 * s} y2={12 * s} stroke={G} strokeWidth={1.5} />
        <line x1={54 * s} y1={46 * s} x2={54 * s} y2={18 * s} stroke={G} strokeWidth={1.5} />
        <circle cx={14 * s} cy={18 * s} r={2.5 * s} fill={G} />
        <circle cx={34 * s} cy={12 * s} r={2.5 * s} fill={G} />
        <circle cx={54 * s} cy={18 * s} r={2.5 * s} fill={G} />
      </>
    ),
  };
}

function defenseFragments(s: number): Record<DefenseDiagramKey, ReactNode> {
  return {
    'COVER 3': (
      <>
        <line x1={10 * s} y1={18 * s} x2={58 * s} y2={18 * s} stroke={SB} strokeWidth={1} strokeDasharray="4,3" />
        <circle cx={10 * s} cy={18 * s} r={3 * s} fill={SB} />
        <circle cx={34 * s} cy={18 * s} r={3 * s} fill={SB} />
        <circle cx={58 * s} cy={18 * s} r={3 * s} fill={SB} />
        <line x1={22 * s} y1={40 * s} x2={46 * s} y2={40 * s} stroke={SB} strokeWidth={1} />
        <circle cx={22 * s} cy={40 * s} r={2.5 * s} fill={SB} />
        <circle cx={46 * s} cy={40 * s} r={2.5 * s} fill={SB} />
      </>
    ),
    BLITZ: (
      <>
        <line x1={18 * s} y1={8 * s} x2={28 * s} y2={44 * s} stroke={BR} strokeWidth={2} />
        <line x1={50 * s} y1={8 * s} x2={40 * s} y2={44 * s} stroke={BR} strokeWidth={2} />
        <circle cx={18 * s} cy={8 * s} r={3 * s} fill={BR} />
        <circle cx={50 * s} cy={8 * s} r={3 * s} fill={BR} />
        <circle cx={34 * s} cy={14 * s} r={3 * s} fill={SB} />
      </>
    ),
    MAN: (
      <>
        <circle cx={18 * s} cy={12 * s} r={3 * s} fill={SB} />
        <circle cx={50 * s} cy={12 * s} r={3 * s} fill={SB} />
        <circle cx={34 * s} cy={8 * s} r={3 * s} fill={SB} />
        <line x1={18 * s} y1={12 * s} x2={22 * s} y2={42 * s} stroke={SB} strokeWidth={1} strokeDasharray="2,2" />
        <line x1={50 * s} y1={12 * s} x2={46 * s} y2={42 * s} stroke={SB} strokeWidth={1} strokeDasharray="2,2" />
      </>
    ),
    ZONE: (
      <>
        <ellipse
          cx={34 * s}
          cy={22 * s}
          rx={26 * s}
          ry={14 * s}
          stroke={SB}
          strokeWidth={1.5}
          fill="rgba(41,121,255,0.1)"
        />
        <circle cx={14 * s} cy={22 * s} r={3 * s} fill={SB} />
        <circle cx={34 * s} cy={14 * s} r={3 * s} fill={SB} />
        <circle cx={54 * s} cy={22 * s} r={3 * s} fill={SB} />
      </>
    ),
    PREVENT: (
      <>
        <line x1={8 * s} y1={10 * s} x2={60 * s} y2={10 * s} stroke={SB} strokeWidth={2} />
        <circle cx={8 * s} cy={10 * s} r={2.5 * s} fill={SB} />
        <circle cx={20 * s} cy={10 * s} r={2.5 * s} fill={SB} />
        <circle cx={34 * s} cy={10 * s} r={2.5 * s} fill={SB} />
        <circle cx={48 * s} cy={10 * s} r={2.5 * s} fill={SB} />
        <circle cx={60 * s} cy={10 * s} r={2.5 * s} fill={SB} />
      </>
    ),
    'RUN D': (
      <>
        <line x1={12 * s} y1={44 * s} x2={56 * s} y2={44 * s} stroke={SB} strokeWidth={2.5} />
        <circle cx={12 * s} cy={44 * s} r={3 * s} fill={SB} />
        <circle cx={24 * s} cy={44 * s} r={3 * s} fill={SB} />
        <circle cx={34 * s} cy={44 * s} r={3 * s} fill={SB} />
        <circle cx={44 * s} cy={44 * s} r={3 * s} fill={SB} />
        <circle cx={56 * s} cy={44 * s} r={3 * s} fill={SB} />
      </>
    ),
  };
}

export interface RouteDiagramBaseProps {
  compact?: boolean;
}

export interface RouteDiagramRogueProps extends RouteDiagramBaseProps {
  cardName: string;
}

export function RouteDiagramOffense({ cardType, compact = false }: RouteDiagramBaseProps & { cardType: string }): JSX.Element {
  const s = compact ? 0.55 : 1;
  const w = 68 * s;
  const h = 52 * s;
  const key = OFFENSE_MAP[cardType] ?? 'SPOT';
  const frag = offenseFragments(s)[key];
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
      {frag}
    </svg>
  );
}

export function RouteDiagramDefense({ cardType, compact = false }: RouteDiagramBaseProps & { cardType: string }): JSX.Element {
  const s = compact ? 0.55 : 1;
  const w = 68 * s;
  const h = 52 * s;
  const key = DEFENSE_MAP[cardType] ?? 'ZONE';
  const frag = defenseFragments(s)[key];
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
      {frag}
    </svg>
  );
}

export function RouteDiagramRogue({ cardName, compact = false }: RouteDiagramRogueProps): JSX.Element {
  const s = compact ? 0.55 : 1;
  const w = 68 * s;
  const h = 52 * s;
  if (cardName.trim().toUpperCase() === 'FILM STUDY') {
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
        <circle
          cx={34 * s}
          cy={26 * s}
          r={16 * s}
          stroke="var(--rogue-purple-bright)"
          strokeWidth={1.5}
          fill="rgba(124,58,237,0.1)"
        />
        <circle
          cx={34 * s}
          cy={26 * s}
          r={7 * s}
          stroke="var(--rogue-purple-bright)"
          strokeWidth={1}
          fill="rgba(124,58,237,0.2)"
        />
        <line
          x1={24 * s}
          y1={16 * s}
          x2={44 * s}
          y2={36 * s}
          stroke="var(--rogue-purple-bright)"
          strokeWidth={1}
          opacity={0.5}
        />
        <line
          x1={44 * s}
          y1={16 * s}
          x2={24 * s}
          y2={36 * s}
          stroke="var(--rogue-purple-bright)"
          strokeWidth={1}
          opacity={0.5}
        />
      </svg>
    );
  }
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden>
      <path
        d={`M ${34 * s} ${46 * s} Q ${14 * s} ${10 * s} ${34 * s} ${6 * s} Q ${54 * s} ${10 * s} ${34 * s} ${46 * s}`}
        stroke="var(--rogue-purple-bright)"
        strokeWidth={1.5}
        fill="rgba(168,85,247,0.15)"
      />
      <circle cx={34 * s} cy={26 * s} r={4 * s} fill="var(--rogue-purple-bright)" />
    </svg>
  );
}
