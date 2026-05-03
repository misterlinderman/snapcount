import { useState } from 'react';

export interface CoinTossModalProps {
  sessionId: string;
  onPick: (side: 'offense' | 'defense') => Promise<void>;
  className?: string;
}

const btn =
  'min-h-12 w-full max-w-xs rounded border-2 px-4 py-3 text-base font-semibold transition-opacity focus:outline-none focus:ring-2 focus:ring-[var(--gold)] focus:ring-offset-2 focus:ring-offset-[var(--cream)] disabled:cursor-wait disabled:opacity-50 sm:text-lg';

/**
 * Post-session-start coin toss: user chooses to take offense or defense (see server COIN_TOSS_PICK).
 */
function CoinTossModal({ sessionId, onPick, className = '' }: CoinTossModalProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handle = async (side: 'offense' | 'defense') => {
    if (pending) return;
    setError(null);
    setPending(true);
    try {
      await onPick(side);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Coin toss failed');
    } finally {
      setPending(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center px-4 py-8 ${className}`}
      style={{ backgroundColor: 'rgba(22, 20, 18, 0.55)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={`coin-toss-title-${sessionId}`}
    >
      <div
        className="w-full max-w-md rounded border p-6 shadow-xl sm:p-8"
        style={{
          borderColor: 'var(--rule)',
          backgroundColor: 'var(--white)',
        }}
      >
        <h2
          id={`coin-toss-title-${sessionId}`}
          className="mb-2 text-center text-xl sm:text-2xl"
          style={{ fontFamily: 'var(--font-playfair-sc)', color: 'var(--ink)' }}
        >
          Coin toss
        </h2>
        <p
          className="mb-6 text-center text-sm sm:text-base"
          style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--ink2)' }}
        >
          Call it in the air — do you want the ball first on offense, or defer and play defense?
        </p>
        <div className="flex flex-col items-stretch gap-3">
          <button
            type="button"
            className={btn}
            style={{
              fontFamily: 'var(--font-playfair-sc)',
              borderColor: 'var(--green-turf)',
              color: 'var(--white)',
              backgroundColor: 'var(--green-field)',
            }}
            disabled={pending}
            onClick={() => void handle('offense')}
          >
            Receive — start on offense
          </button>
          <button
            type="button"
            className={btn}
            style={{
              fontFamily: 'var(--font-playfair-sc)',
              borderColor: 'var(--blue)',
              color: 'var(--white)',
              backgroundColor: 'var(--blue)',
            }}
            disabled={pending}
            onClick={() => void handle('defense')}
          >
            Defer — start on defense
          </button>
        </div>
        {error ? (
          <p className="mt-4 text-center text-sm" style={{ color: 'var(--red)' }}>
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default CoinTossModal;
