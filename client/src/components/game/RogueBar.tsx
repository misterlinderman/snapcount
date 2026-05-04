import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import DeckOverviewModal from '@/components/game/overlays/DeckOverviewModal';
import { decksApi } from '@/services/decksApi';
import { fetchGameContentBundle } from '@/services/gameContentApi';
import { sessionsApi } from '@/services/sessionsApi';

const nodeNums = [1, 2, 3, 4, 5] as const;

/**
 * Season strip: current node, W/L, deck DP; tap DP pill for roster modal.
 */
function RogueBar(): JSX.Element {
  const [deckOpen, setDeckOpen] = useState(false);
  const { data: session } = useQuery({
    queryKey: ['session', 'active'],
    queryFn: sessionsApi.getActive,
  });
  const { data: deck } = useQuery({
    queryKey: ['deck', session?.deck],
    queryFn: () => decksApi.getById(session!.deck),
    enabled: Boolean(session?.deck),
  });
  const { data: content } = useQuery({
    queryKey: ['content', 'bundle'],
    queryFn: fetchGameContentBundle,
    staleTime: 60_000,
  });

  const current = session?.season.node ?? 1;
  const wins = session?.season.wins ?? 0;
  const losses = session?.season.losses ?? 0;
  const dp = deck?.dp ?? 0;

  return (
    <>
      <div
        className="flex h-[var(--rogue-bar-height)] shrink-0 items-center justify-between gap-3 border-b px-[var(--shell-pad-x)]"
        style={{
          backgroundColor: 'var(--bg-deep)',
          borderColor: 'var(--bg-border)',
          color: 'var(--text-primary)',
        }}
      >
        <Link
          to="/season"
          className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2"
          aria-label="Open season map"
        >
          {nodeNums.map((n) => {
            const active = n === current;
            const past = n < current;
            return (
              <div
                key={n}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded border text-xs font-semibold sm:h-10 sm:w-10 sm:text-sm"
                style={{
                  fontFamily: 'var(--font-playfair-sc)',
                  borderColor: active ? 'var(--gold)' : 'var(--bg-border)',
                  backgroundColor: past ? 'var(--green-turf)' : active ? 'var(--surface-panel)' : 'transparent',
                  color: 'var(--text-primary)',
                  boxShadow: active ? 'var(--glow-gold)' : undefined,
                }}
              >
                {n}
              </div>
            );
          })}
          <span
            className="ml-2 hidden min-w-0 truncate text-xs sm:inline sm:text-sm"
            style={{ fontFamily: 'var(--font-serif)', color: 'var(--muted)' }}
          >
            W{wins} L{losses}
          </span>
        </Link>
        <button
          type="button"
          className="flex shrink-0 items-center gap-2 rounded border px-2.5 py-1 text-sm tabular-nums sm:px-3"
          style={{
            borderColor: 'var(--bg-border)',
            backgroundColor: 'var(--surface-panel)',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-playfair-sc)',
          }}
          onClick={() => session && deck && setDeckOpen(true)}
          disabled={!session || !deck}
          aria-label="View deck and DP"
        >
          <span className="text-xs uppercase tracking-wider opacity-80" style={{ color: 'var(--muted)' }}>
            DP
          </span>
          <span style={{ color: 'var(--gold)' }}>{dp}</span>
        </button>
      </div>
      {deckOpen && session && deck && content ? (
        <DeckOverviewModal deck={deck} content={content} onClose={() => setDeckOpen(false)} title={deck.name?.trim() || 'Your deck'} />
      ) : null}
    </>
  );
}

export default RogueBar;
