import { useMemo, useState } from 'react';
import { TD_OFFER_COPY, pickThreeTdOffers } from '@/game/tdRewards';
import type { TdRewardId } from '@/services/sessionsApi';

export interface TouchdownRewardModalProps {
  /** Change when a new TD resolution appears so offers reshuffle. */
  resolutionKey: string;
  onPick: (rewardId: TdRewardId) => Promise<void>;
  className?: string;
}

interface RewardPickCardProps {
  title: string;
  description: string;
  selected: boolean;
  disabled: boolean;
  onSelect: () => void;
}

function RewardPickCard({ title, description, selected, disabled, onSelect }: RewardPickCardProps): JSX.Element {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onSelect}
      className="flex min-h-[4.5rem] w-full flex-col gap-2 rounded-[var(--radius-lg)] border-2 p-4 text-left transition-all sm:min-h-0"
      style={{
        borderColor: selected ? 'var(--gold)' : 'var(--bg-border)',
        backgroundColor: 'var(--bg-surface)',
        boxShadow: selected ? 'var(--glow-gold)' : undefined,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <span
        className="text-[10px] font-semibold uppercase tracking-[0.12em]"
        style={{ fontFamily: 'var(--font-body)', color: 'var(--gold)' }}
      >
        Locker bonus
      </span>
      <span className="text-lg font-black leading-tight" style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
        {title}
      </span>
      <span className="text-xs leading-snug" style={{ fontFamily: 'var(--font-body)', color: 'var(--text-secondary)' }}>
        {description}
      </span>
    </button>
  );
}

/**
 * Post-touchdown choice: three random rewards from the TD pool (server accepts one via td-reward).
 */
function TouchdownRewardModal({ resolutionKey, onPick, className = '' }: TouchdownRewardModalProps): JSX.Element {
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
      style={{ backgroundColor: 'rgba(8, 10, 12, 0.72)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="td-reward-title"
    >
      <div
        className="w-full max-w-lg rounded-[var(--radius-xl)] border-2 p-6 shadow-[var(--shadow-elevated)] sm:p-8"
        style={{ borderColor: 'var(--gold-dim)', backgroundColor: 'var(--bg-surface)' }}
      >
        <h2
          id="td-reward-title"
          className="mb-2 text-center text-2xl font-black uppercase tracking-wide sm:text-3xl"
          style={{ fontFamily: 'var(--font-display)', color: 'var(--gold-bright)' }}
        >
          Touchdown!
        </h2>
        <p className="mb-6 text-center text-sm sm:text-base" style={{ fontFamily: 'var(--font-body)', color: 'var(--text-secondary)' }}>
          Pick one locker bonus before the next snap.
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
          {offers.map((id) => {
            const copy = TD_OFFER_COPY[id];
            return (
              <div key={id} className="min-w-0 flex-1">
                <RewardPickCard
                  title={copy.title}
                  description={copy.blurb}
                  selected={pending === id}
                  disabled={pending !== null}
                  onSelect={() => void choose(id)}
                />
              </div>
            );
          })}
        </div>
        {error ? (
          <p className="mt-4 text-center text-sm" style={{ color: 'var(--blitz-red-bright)' }}>
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default TouchdownRewardModal;
