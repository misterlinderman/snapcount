import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { isAxiosError } from 'axios';
import { Link } from 'react-router-dom';
import { decksApi } from '@/services/decksApi';
import { sessionsApi } from '@/services/sessionsApi';

function Home(): JSX.Element {
  const { isAuthenticated, loginWithRedirect } = useAuth0();
  const qc = useQueryClient();

  const { data: session, isLoading: sessLoading } = useQuery({
    queryKey: ['session', 'active'],
    queryFn: sessionsApi.getActive,
    enabled: isAuthenticated,
  });

  const { data: decks, isLoading: decksLoading } = useQuery({
    queryKey: ['decks', 'list'],
    queryFn: decksApi.list,
    enabled: isAuthenticated,
  });

  const [pickedDeck, setPickedDeck] = useState<string | null>(null);

  const createMut = useMutation({
    mutationFn: (deckId: string) => sessionsApi.create(deckId),
    onSuccess: (data) => {
      qc.setQueryData(['session', 'active'], data);
    },
    onError: async (err) => {
      if (isAxiosError(err) && err.response?.status === 409) {
        const s = await sessionsApi.getActive();
        if (s) qc.setQueryData(['session', 'active'], s);
      }
    },
  });

  return (
    <div className="space-y-12 py-8">
      <section className="mx-auto max-w-2xl space-y-6 text-center">
        <p className="text-xs font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--muted)', fontFamily: 'var(--font-playfair-sc)' }}>
          Gridiron Rogue
        </p>
        <h1 className="text-4xl sm:text-5xl" style={{ fontFamily: 'var(--font-playfair-sc)', color: 'var(--ink)' }}>
          Snapcount
        </h1>
        <p className="text-lg sm:text-xl" style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', color: 'var(--ink2)' }}>
          Card football roguelite — seasons, locker drafts, and newspaper-sports drama.
        </p>

        {!isAuthenticated ? (
          <button
            type="button"
            className="min-h-12 rounded border-2 px-8 py-3 text-lg font-semibold"
            style={{
              fontFamily: 'var(--font-playfair-sc)',
              borderColor: 'var(--blue)',
              backgroundColor: 'var(--blue)',
              color: 'var(--white)',
            }}
            onClick={() => loginWithRedirect()}
          >
            Log in to play
          </button>
        ) : sessLoading ? (
          <p style={{ color: 'var(--muted)' }}>Checking your season…</p>
        ) : session ? (
          <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              to="/season"
              className="inline-flex min-h-12 items-center justify-center rounded border-2 px-8 py-3 font-semibold"
              style={{
                fontFamily: 'var(--font-playfair-sc)',
                borderColor: 'var(--green-turf)',
                backgroundColor: 'var(--green-field)',
                color: 'var(--white)',
              }}
            >
              Continue season
            </Link>
            <Link
              to="/play"
              className="inline-flex min-h-12 items-center justify-center rounded border-2 px-6 py-3 font-semibold"
              style={{
                fontFamily: 'var(--font-serif)',
                borderColor: 'var(--rule)',
                backgroundColor: 'var(--surface-panel)',
                color: 'var(--ink)',
              }}
            >
              Jump to field
            </Link>
          </div>
        ) : (
          <div className="mx-auto max-w-md space-y-4 text-left">
            <p className="text-center text-sm" style={{ fontFamily: 'var(--font-serif)', color: 'var(--ink2)' }}>
              Start a new season — pick a deck to register your run.
            </p>
            {decksLoading ? (
              <p className="text-center" style={{ color: 'var(--muted)' }}>
                Loading decks…
              </p>
            ) : !decks?.length ? (
              <p className="text-center text-sm" style={{ color: 'var(--muted)' }}>
                No decks yet. Uses your default once the API has deck rows.
              </p>
            ) : (
              <div className="space-y-2">
                {decks.map((d) => (
                  <label
                    key={d._id}
                    className="flex min-h-12 cursor-pointer items-center gap-3 rounded border px-3 py-2"
                    style={{ borderColor: pickedDeck === d._id ? 'var(--gold)' : 'var(--rule)', backgroundColor: 'var(--surface-panel)' }}
                  >
                    <input
                      type="radio"
                      name="deckPick"
                      className="h-4 w-4"
                      checked={pickedDeck === d._id}
                      onChange={() => setPickedDeck(d._id)}
                    />
                    <span style={{ fontFamily: 'var(--font-serif)', color: 'var(--ink)' }}>{d.name ?? 'Deck'}</span>
                    <span className="ml-auto tabular-nums text-sm" style={{ color: 'var(--gold)' }}>
                      {d.dp} DP
                    </span>
                  </label>
                ))}
              </div>
            )}
            <button
              type="button"
              className="min-h-12 w-full rounded border-2 px-4 py-3 font-semibold disabled:opacity-45"
              style={{
                fontFamily: 'var(--font-playfair-sc)',
                borderColor: 'var(--blue)',
                backgroundColor: 'var(--blue)',
                color: 'var(--white)',
              }}
              disabled={!pickedDeck || createMut.isPending}
              onClick={() => pickedDeck && createMut.mutate(pickedDeck)}
            >
              {createMut.isPending ? 'Starting…' : 'Start new season'}
            </button>
            {createMut.isError ? (
              <p className="text-center text-sm" style={{ color: 'var(--red)' }}>
                {isAxiosError(createMut.error)
                  ? String(createMut.error.response?.data?.message ?? createMut.error.message)
                  : 'Could not start'}
              </p>
            ) : null}
          </div>
        )}

        {isAuthenticated ? (
          <p className="text-sm" style={{ fontFamily: 'var(--font-serif)' }}>
            <Link to="/how-to-play" className="underline" style={{ color: 'var(--blue)' }}>
              How to play
            </Link>
            <span style={{ color: 'var(--muted)' }}> · </span>
            <Link to="/profile" className="underline" style={{ color: 'var(--blue)' }}>
              Profile
            </Link>
          </p>
        ) : null}
      </section>
    </div>
  );
}

export default Home;
