import type { GameContent } from '@/game/types';
import type { DeckDTO } from '@/game/sessionBridge';
import { shortTypeLabel } from '@/components/game/gameUi.types';

export interface DeckOverviewModalProps {
  deck: DeckDTO;
  content: GameContent;
  onClose?: () => void;
  title?: string;
  /** When true, render as inline panel (no dimmed backdrop). */
  inline?: boolean;
  className?: string;
}

/**
 * Full roster view: offense / defense rows + playmakers (read-only).
 */
function DeckOverviewModal({ deck, content, onClose, title = 'Deck', inline = false, className = '' }: DeckOverviewModalProps) {
  const row = (cardId: string, count: number, upgradeId?: string, key?: string) => {
    const c = content.cards.get(cardId);
    const u = upgradeId ? content.upgrades.get(upgradeId) : undefined;
    return (
      <div
        key={key ?? cardId}
        className="flex flex-wrap items-baseline justify-between gap-2 border-b py-2 text-sm last:border-0"
        style={{ borderColor: 'var(--rule)' }}
      >
        <span style={{ fontFamily: 'var(--font-serif)', color: 'var(--ink)' }}>
          <span className="mr-2 rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase" style={{ borderColor: 'var(--rule)' }}>
            {c ? shortTypeLabel(c.type) : '?'}
          </span>
          {c?.name ?? cardId}
          {u ? (
            <span className="ml-2 text-xs italic" style={{ color: 'var(--gold)' }}>
              + {u.name}
            </span>
          ) : null}
        </span>
        <span className="tabular-nums" style={{ fontFamily: 'var(--font-playfair-sc)', color: 'var(--muted)' }}>
          ×{count}
        </span>
      </div>
    );
  };

  const pmLine = (ids: string[], label: string) => (
    <div className="mb-4">
      <h4 className="mb-2 text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--muted)' }}>
        {label}
      </h4>
      <ul className="space-y-1">
        {ids.length === 0 ? (
          <li className="text-sm italic" style={{ color: 'var(--muted)' }}>
            —
          </li>
        ) : (
          ids.map((id) => {
            const p = content.playmakers.get(id);
            return (
              <li key={id} className="text-sm" style={{ fontFamily: 'var(--font-serif)', color: 'var(--ink)' }}>
                {p?.name ?? id}{' '}
                <span className="text-xs opacity-80" style={{ color: 'var(--muted)' }}>
                  ({p?.position})
                </span>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );

  const inner = (
    <div
      className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded border p-5 shadow-xl sm:p-7"
      style={{ borderColor: 'var(--rule)', backgroundColor: 'var(--surface-panel)' }}
    >
      <div className="mb-4 flex items-start justify-between gap-4">
        <h2 id="deck-overview-title" className="text-xl" style={{ fontFamily: 'var(--font-playfair-sc)', color: 'var(--ink)' }}>
          {title}
        </h2>
        {onClose ? (
          <button
            type="button"
            className="shrink-0 rounded border px-3 py-1.5 text-sm"
            style={{ borderColor: 'var(--rule)', color: 'var(--ink)', backgroundColor: 'var(--cream)' }}
            onClick={onClose}
          >
            Close
          </button>
        ) : null}
      </div>
      <p className="mb-4 text-sm tabular-nums" style={{ fontFamily: 'var(--font-playfair-sc)', color: 'var(--gold)' }}>
        DP {deck.dp ?? 0}
      </p>
      <div className="mb-4">
        <h3 className="mb-2 text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--red)' }}>
          Offense
        </h3>
        <div>{deck.offense.map((r, i) => row(r.cardId, r.count, r.upgradeId, `off-${i}`))}</div>
      </div>
      <div className="mb-6">
        <h3 className="mb-2 text-sm font-bold uppercase tracking-wide" style={{ color: 'var(--blue)' }}>
          Defense
        </h3>
        <div>{deck.defense.map((r, i) => row(r.cardId, r.count, r.upgradeId, `def-${i}`))}</div>
      </div>
      {pmLine(deck.offPlaymakers, 'Offense playmakers')}
      {pmLine(deck.defPlaymakers, 'Defense playmakers')}
    </div>
  );

  if (inline) {
    return <div className={className}>{inner}</div>;
  }

  return (
    <div
      className={`fixed inset-0 z-[55] flex items-center justify-center px-4 py-8 ${className}`}
      style={{ backgroundColor: 'rgba(22, 20, 18, 0.55)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="deck-overview-title"
    >
      {inner}
    </div>
  );
}

export default DeckOverviewModal;
