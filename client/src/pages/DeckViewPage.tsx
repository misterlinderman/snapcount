import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import DeckOverviewModal from '@/components/game/overlays/DeckOverviewModal';
import { decksApi } from '@/services/decksApi';
import { fetchGameContentBundle } from '@/services/gameContentApi';

/**
 * Read-only roster for the user's deck (any phase).
 */
function DeckViewPage(): JSX.Element {
  const { deckId } = useParams<{ deckId: string }>();

  const { data: deck, isLoading: dLoading } = useQuery({
    queryKey: ['deck', deckId],
    queryFn: () => decksApi.getById(deckId!),
    enabled: Boolean(deckId),
  });

  const { data: content, isLoading: cLoading } = useQuery({
    queryKey: ['content', 'bundle'],
    queryFn: fetchGameContentBundle,
    staleTime: 60_000,
  });

  if (!deckId) return <p className="text-center text-[var(--muted)]">Missing deck.</p>;
  if (dLoading || cLoading || !deck || !content) {
    return <p className="text-center text-[var(--muted)]">Loading deck…</p>;
  }

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <Link to="/season" className="text-sm font-medium underline" style={{ color: 'var(--blue)' }}>
        ← Season map
      </Link>
      <DeckOverviewModal
        inline
        deck={deck}
        content={content}
        title={deck.name?.trim() || 'Your deck'}
      />
    </div>
  );
}

export default DeckViewPage;
