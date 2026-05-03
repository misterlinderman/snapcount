import { useMemo, useState } from 'react';
import { TD_OFFER_COPY, pickThreeTdOffers } from '@/game/tdRewards';
import type { TdRewardId } from '@/services/sessionsApi';

export interface TouchdownRewardModalProps {
  /** Change when a new TD resolution appears so offers reshuffle. */
  resolutionKey: string;
  onPick: (rewardId: TdRewardId) => Promise<void>;
  className?: string;
}

const btn =
  'min-h-12 w-full rounded border-2 px-4 py-3 text-left text-sm font-semibold transition-opacity focus:outline-none focus:ring-2 focus:ring-[var(--gold)] focus:ring-offset-2 focus:ring-offset-[var(--cream)] disabled:cursor-wait disabled:opacity-50 sm:text-base';

/**
 * Post-touchdown choice: three random rewards from the TD pool (server accepts one via td-reward).
 */
function TouchdownRewardModal({ resolutionKey, onPick, className = '' }: TouchdownRewardModalProps) {
  // eslint-disable-next-line react-hooks/exhaustive-deps -- reshuffle when `resolutionKey` changes (TD event identity)
  const offers = useMemo(() => pickThreeTdOffers(), [resolutionKey]);
  const [pending, setPending] = useState<TdRewardId | null>(null);
  const [error, setError] = useState<string | null>(null);

  const choose = async (id: TdRewardId) => {
    if (pending) return;
    setError(null);
    setPending(id);
    try {
      await onPick(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not apply reward');
    } finally {
      setPending(null);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-[60] flex items-center justify-center px-4 py-8 ${className}`}
      style={{ backgroundColor: 'rgba(22, 20, 18, 0.55)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="td-reward-title"
    >
      <div
        className="w-full max-w-md rounded border p-6 shadow-xl sm:p-8"
        style={{ borderColor: 'var(--gold-mid)', backgroundColor: 'var(--white)' }}
      >
        <h2
          id="td-reward-title"
          className="mb-2 text-center text-xl sm:text-2xl"
          style={{ fontFamily: 'var(--font-playfair-sc)', color: 'var(--ink)' }}
        >
          Touchdown!
        </h2>
        <p
          className="mb-6 text-center text-sm sm:text-base"
          style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--ink2)' }}
        >
          Pick one locker bonus before the next snap.
        </p>
        <div className="flex flex-col gap-3">
          {offers.map((id) => {
            const copy = TD_OFFER_COPY[id];
            return (
              <button
                key={id}
                type="button"
                className={btn}
                style={{
                  borderColor: 'var(--green-turf)',
                  backgroundColor: 'var(--cream)',
                  color: 'var(--ink)',
                  fontFamily: 'var(--font-playfair-sc)',
                }}
                disabled={pending !== null}
                onClick={() => void choose(id)}
              >
                <span className="block">{copy.title}</span>
                <span
                  className="mt-1 block text-xs font-normal sm:text-sm"
                  style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--muted)' }}
                >
                  {copy.blurb}
                </span>
              </button>
            );
          })}
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

export default TouchdownRewardModal;
