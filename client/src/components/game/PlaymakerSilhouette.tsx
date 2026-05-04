import type { SilhouettePosition } from './playmakerSilhouetteUtils';
import { normalizeSilhouettePosition } from './playmakerSilhouetteUtils';
import type { Side } from '@/game/types';

export interface PlaymakerSilhouetteProps {
  position: string;
  side: Side;
  color: string;
}

function PlaymakerSilhouette({ position, side, color }: PlaymakerSilhouetteProps): JSX.Element {
  const pos = normalizeSilhouettePosition(position, side);
  const shapes: Record<SilhouettePosition, JSX.Element> = {
    QB: (
      <>
        <ellipse cx={16} cy={10} rx={4} ry={4} fill={color} opacity={0.9} />
        <path d="M 10 28 L 10 16 L 22 16 L 22 28" fill={color} opacity={0.8} />
        <line x1={16} y1={16} x2={16} y2={28} stroke={color} strokeWidth={2} opacity={0.5} />
      </>
    ),
    WR: (
      <>
        <ellipse cx={16} cy={9} rx={3.5} ry={3.5} fill={color} opacity={0.9} />
        <path d="M 8 26 L 10 14 L 22 14 L 24 26" fill={color} opacity={0.8} />
      </>
    ),
    RB: (
      <>
        <ellipse cx={16} cy={9} rx={4} ry={4} fill={color} opacity={0.9} />
        <path d="M 9 26 L 11 15 L 21 15 L 23 26" fill={color} opacity={0.8} />
      </>
    ),
    LB: (
      <>
        <ellipse cx={16} cy={9} rx={4.5} ry={4.5} fill={color} opacity={0.9} />
        <rect x={9} y={15} width={14} height={12} rx={2} fill={color} opacity={0.8} />
      </>
    ),
    CB: (
      <>
        <ellipse cx={16} cy={9} rx={3.5} ry={3.5} fill={color} opacity={0.9} />
        <path d="M 10 26 L 12 14 L 20 14 L 22 26" fill={color} opacity={0.7} />
      </>
    ),
    S: (
      <>
        <ellipse cx={16} cy={9} rx={3.5} ry={3.5} fill={color} opacity={0.9} />
        <path d="M 8 26 L 12 14 L 20 14 L 24 26" fill={color} opacity={0.7} />
      </>
    ),
  };

  return (
    <svg width={32} height={32} viewBox="0 0 32 32" aria-hidden>
      {shapes[pos]}
    </svg>
  );
}

export default PlaymakerSilhouette;
