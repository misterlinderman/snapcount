import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { sessionsApi } from '@/services/sessionsApi';

const nodes = [1, 2, 3, 4, 5] as const;

/**
 * Season progress: five games, record, CTAs between games.
 */
function SeasonMapPage(): JSX.Element {
  const { data: session, isLoading } = useQuery({
    queryKey: ['session', 'active'],
    queryFn: sessionsApi.getActive,
  });

  if (isLoading) {
    return <p className="text-center text-[var(--muted)]">Loading season…</p>;
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-md space-y-4 text-center">
        <h1 className="text-2xl" style={{ fontFamily: 'var(--font-playfair-sc)', color: 'var(--ink)' }}>
          No active season
        </h1>
        <p style={{ fontFamily: 'var(--font-serif)', color: 'var(--ink2)' }}>
          Start from home with a deck, or continue an existing save.
        </p>
        <Link
          to="/"
          className="inline-block min-h-12 rounded border-2 px-6 py-3 font-semibold"
          style={{
            fontFamily: 'var(--font-playfair-sc)',
            borderColor: 'var(--blue)',
            backgroundColor: 'var(--blue)',
            color: 'var(--white)',
          }}
        >
          Home
        </Link>
      </div>
    );
  }

  const current = session.season.node;
  const record = (
    <span className="tabular-nums" style={{ fontFamily: 'var(--font-playfair-sc)', color: 'var(--ink)' }}>
      W{session.season.wins} · L{session.season.losses}
    </span>
  );

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <header>
        <h1 className="text-2xl sm:text-3xl" style={{ fontFamily: 'var(--font-playfair-sc)', color: 'var(--ink)' }}>
          Season map
        </h1>
        <p className="mt-1 text-sm" style={{ fontFamily: 'var(--font-serif)', color: 'var(--ink2)' }}>
          Game {current} of 5 · {record}
        </p>
      </header>

      <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3" aria-label="Season nodes">
        {nodes.map((n) => {
          const done = n < current;
          const active = n === current;
          return (
            <div
              key={n}
              className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded border text-sm font-semibold sm:h-14 sm:w-14 sm:text-base"
              style={{
                fontFamily: 'var(--font-playfair-sc)',
                borderColor: active ? 'var(--gold)' : 'var(--rule)',
                backgroundColor: done ? 'var(--green-field)' : active ? 'var(--surface-panel)' : 'var(--cream)',
                color: active ? 'var(--ink)' : 'var(--ink)',
                boxShadow: active ? '0 0 0 2px var(--gold-mid)' : undefined,
                opacity: done ? 0.92 : 1,
              }}
            >
              {n}
              {done ? <span className="text-[9px] font-bold uppercase text-white">Done</span> : null}
            </div>
          );
        })}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        {session.phase === 'locker' ? (
          <Link
            to={`/locker/${session._id}`}
            className="inline-flex min-h-12 flex-1 items-center justify-center rounded border-2 px-4 py-3 text-center font-semibold"
            style={{
              fontFamily: 'var(--font-playfair-sc)',
              borderColor: 'var(--blue)',
              backgroundColor: 'var(--blue)',
              color: 'var(--white)',
            }}
          >
            Open locker room
          </Link>
        ) : (
          <Link
            to="/play"
            className="inline-flex min-h-12 flex-1 items-center justify-center rounded border-2 px-4 py-3 text-center font-semibold"
            style={{
              fontFamily: 'var(--font-playfair-sc)',
              borderColor: 'var(--green-turf)',
              backgroundColor: 'var(--green-field)',
              color: 'var(--white)',
            }}
          >
            {session.phase === 'coin-toss' ? 'Start next game' : 'Continue game'}
          </Link>
        )}
        <Link
          to={`/decks/${session.deck}`}
          className="inline-flex min-h-12 flex-1 items-center justify-center rounded border-2 px-4 py-3 text-center font-semibold"
          style={{
            fontFamily: 'var(--font-serif)',
            borderColor: 'var(--rule)',
            backgroundColor: 'var(--surface-panel)',
            color: 'var(--ink)',
          }}
        >
          View deck
        </Link>
      </div>
    </div>
  );
}

export default SeasonMapPage;
