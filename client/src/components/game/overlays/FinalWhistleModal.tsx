import type { Team } from '@/game/types';
import type { EndGameResponse } from '@/services/sessionsApi';

export interface FinalWhistleModalProps {
  data: EndGameResponse;
  playerSide: Team;
  onGoLocker: () => void;
  /** Primary button label (default: locker room). */
  ctaLabel?: string;
  className?: string;
}

function teamLabel(t: Team): string {
  return t === 'red' ? 'Blitz FC' : 'Storm SC';
}

/**
 * Post-game summary after POST /sessions/:id/end — score, DP banked, CTA into locker.
 */
function FinalWhistleModal({ data, playerSide, onGoLocker, ctaLabel = 'Go to Locker Room', className = '' }: FinalWhistleModalProps) {
  const userWon = data.winner === playerSide;

  return (
    <div
      className={`fixed inset-0 z-[70] flex items-center justify-center px-4 py-8 ${className}`}
      style={{ backgroundColor: 'rgba(22, 20, 18, 0.6)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="final-whistle-title"
    >
      <div
        className="w-full max-w-md rounded border p-6 shadow-xl sm:p-8"
        style={{ borderColor: 'var(--rule)', backgroundColor: 'var(--white)' }}
      >
        <h2
          id="final-whistle-title"
          className="mb-4 text-center text-2xl sm:text-3xl"
          style={{ fontFamily: 'var(--font-playfair-sc)', color: 'var(--ink)' }}
        >
          Final whistle
        </h2>
        <p
          className="mb-6 text-center text-lg"
          style={{ fontFamily: 'var(--font-serif)', color: 'var(--ink2)' }}
        >
          {userWon ? 'You took this one.' : 'Tough loss — regroup in the locker.'}
        </p>
        <div
          className="mb-6 grid grid-cols-2 gap-3 rounded border px-4 py-4 text-center"
          style={{ borderColor: 'var(--rule)', backgroundColor: 'var(--cream)' }}
        >
          <div>
            <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
              {teamLabel('red')}
            </p>
            <p className="text-2xl tabular-nums" style={{ fontFamily: 'var(--font-playfair-sc)', color: 'var(--ink)' }}>
              {data.totals.scoreRed}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--muted)' }}>
              {teamLabel('blue')}
            </p>
            <p className="text-2xl tabular-nums" style={{ fontFamily: 'var(--font-playfair-sc)', color: 'var(--ink)' }}>
              {data.totals.scoreBlue}
            </p>
          </div>
        </div>
        <p
          className="mb-6 text-center text-base"
          style={{ fontFamily: 'var(--font-playfair-sc)', color: 'var(--gold)' }}
        >
          +{data.dpEarned} DP to your bank
        </p>
        <button
          type="button"
          className="min-h-12 w-full rounded border-2 px-4 py-3 text-base font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--gold)] focus:ring-offset-2 focus:ring-offset-[var(--cream)]"
          style={{
            fontFamily: 'var(--font-playfair-sc)',
            borderColor: 'var(--blue)',
            backgroundColor: 'var(--blue)',
            color: 'var(--white)',
          }}
          onClick={onGoLocker}
        >
          {ctaLabel}
        </button>
      </div>
    </div>
  );
}

export default FinalWhistleModal;
