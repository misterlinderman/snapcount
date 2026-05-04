import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { isAxiosError } from 'axios';
import FinalWhistleModal from '@/components/game/overlays/FinalWhistleModal';
import DPBadge from '@/components/game/DPBadge';
import LockerNavItem from '@/components/game/LockerNavItem';
import { badgeClassForCardType, shortTypeLabel } from '@/components/game/gameUi.types';
import type { Card, Playmaker, Upgrade } from '@/game/types';
import { decksApi } from '@/services/decksApi';
import { fetchGameContentBundle } from '@/services/gameContentApi';
import type { EndGameResponse } from '@/services/sessionsApi';
import { sessionsApi } from '@/services/sessionsApi';

const DECK_CARD_CAP = 20;

function totalDeckCopies(deck: { offense: { count: number }[]; defense: { count: number }[] }): number {
  let n = 0;
  for (const r of deck.offense) n += r.count;
  for (const r of deck.defense) n += r.count;
  return n;
}

/** Each cut removes one copy; return false if over-available or would exceed `cap` after +1 draft. */
function cutsAllowDraft(
  deck: { offense: { cardId: string; count: number }[]; defense: { cardId: string; count: number }[] },
  cuts: string[]
): boolean {
  const counts = new Map<string, number>();
  for (const r of [...deck.offense, ...deck.defense]) {
    counts.set(r.cardId, (counts.get(r.cardId) ?? 0) + r.count);
  }
  for (const id of cuts) {
    const left = counts.get(id) ?? 0;
    if (left < 1) return false;
    counts.set(id, left - 1);
  }
  let sum = 0;
  for (const v of counts.values()) sum += v;
  return sum + 1 <= DECK_CARD_CAP;
}

type TabId = 'draft' | 'upgrade' | 'recruit';

function LockerRoomPage(): JSX.Element {
  const { sessionId } = useParams<{ sessionId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabId>('draft');
  const [err, setErr] = useState<string | null>(null);
  const [pendingDraft, setPendingDraft] = useState<Card | null>(null);
  const [cutCardIds, setCutCardIds] = useState<string[]>([]);

  const [whistleData, setWhistleData] = useState<EndGameResponse | null>(null);
  const [showWhistle, setShowWhistle] = useState(false);

  const hasEndGameState = Boolean(
    (location.state as { endGame?: EndGameResponse } | null)?.endGame
  );

  useEffect(() => {
    if (!hasEndGameState) {
      return;
    }
    const eg = (location.state as { endGame?: EndGameResponse }).endGame!;
    setWhistleData(eg);
    setShowWhistle(true);
    navigate(`${location.pathname}${location.search}`, { replace: true, state: {} });
  }, [hasEndGameState, location.pathname, location.search, location.state, navigate]);

  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ['session', 'detail', sessionId],
    queryFn: () => sessionsApi.getById(sessionId!),
    enabled: Boolean(sessionId),
  });

  const { data: deck, isLoading: deckLoading } = useQuery({
    queryKey: ['deck', session?.deck],
    queryFn: () => decksApi.getById(session!.deck),
    enabled: Boolean(session?.deck),
  });

  const { data: content } = useQuery({
    queryKey: ['content', 'bundle'],
    queryFn: fetchGameContentBundle,
    staleTime: 60_000,
  });

  const draftMut = useMutation({
    mutationFn: (p: { cardId: string; cutCardIds?: string[] }) =>
      sessionsApi.lockerDraft(session!._id, p),
    onSuccess: (r) => {
      qc.setQueryData(['deck', session!.deck], r.deck);
      setErr(null);
      setPendingDraft(null);
      setCutCardIds([]);
    },
    onError: (e: unknown) => {
      setErr(
        isAxiosError(e) && typeof e.response?.data === 'object' && e.response.data && 'message' in e.response.data
          ? String((e.response.data as { message: unknown }).message)
          : e instanceof Error
            ? e.message
            : 'Draft failed'
      );
    },
  });

  const upgradeMut = useMutation({
    mutationFn: (p: { cardId: string; upgradeId: string }) =>
      sessionsApi.lockerUpgrade(session!._id, p),
    onSuccess: (r) => {
      qc.setQueryData(['deck', session!.deck], r.deck);
      setErr(null);
    },
    onError: (e: unknown) => {
      setErr(e instanceof Error ? e.message : 'Upgrade failed');
    },
  });

  const recruitMut = useMutation({
    mutationFn: (playmakerId: string) => sessionsApi.lockerRecruit(session!._id, { playmakerId }),
    onSuccess: (r) => {
      qc.setQueryData(['deck', session!.deck], r.deck);
      setErr(null);
    },
    onError: (e: unknown) => {
      setErr(e instanceof Error ? e.message : 'Recruit failed');
    },
  });

  const closeMut = useMutation({
    mutationFn: () => sessionsApi.lockerClose(session!._id),
    onSuccess: (s) => {
      if (s.status === 'completed') {
        qc.setQueryData(['session', 'active'], null);
        if (sessionId) {
          qc.removeQueries({ queryKey: ['session', 'detail', sessionId] });
        }
        navigate('/', { replace: true });
      } else {
        qc.setQueryData(['session', 'active'], s);
        if (sessionId) {
          qc.setQueryData(['session', 'detail', sessionId], s);
        }
        navigate('/play', { replace: true });
      }
    },
    onError: (e: unknown) => {
      setErr(e instanceof Error ? e.message : 'Could not close locker');
    },
  });

  const draftOptions = useMemo(() => {
    if (!content) return [];
    return [...content.cards.values()].filter((c) => c.draftCost != null && c.isActive);
  }, [content]);

  const upgradeOptions = useMemo(() => {
    if (!content || !deck) return [];
    const pairs: Array<{ rowKey: string; cardId: string; upgrade: Upgrade; card: Card }> = [];
    const tryRow = (cardId: string, side: 'off' | 'def') => {
      const card = content.cards.get(cardId);
      if (!card) return;
      [...content.upgrades.values()]
        .filter((u) => u.isActive && u.baseCardId === cardId)
        .forEach((upgrade) => {
          const rows = side === 'off' ? deck.offense : deck.defense;
          const hasRow = rows.some((r) => r.cardId === cardId && !r.upgradeId);
          if (hasRow) pairs.push({ rowKey: `${side}-${cardId}-${upgrade._id}`, cardId, upgrade, card });
        });
    };
    deck.offense.forEach((r) => tryRow(r.cardId, 'off'));
    deck.defense.forEach((r) => tryRow(r.cardId, 'def'));
    return pairs;
  }, [content, deck]);

  const recruitOptions = useMemo(() => {
    if (!content || !deck) return [];
    const roster = new Set([...deck.offPlaymakers, ...deck.defPlaymakers]);
    return [...content.playmakers.values()].filter(
      (p) => p.recruitCost != null && p.isActive && !roster.has(p._id)
    );
  }, [content, deck]);

  if (!sessionId) {
    return <p className="text-center text-[var(--muted)]">Missing session.</p>;
  }

  if (sessionLoading || !session) {
    return <p className="text-center text-[var(--muted)]">Loading locker…</p>;
  }

  if (session.phase !== 'locker') {
    return <Navigate to="/play" replace />;
  }

  if (deckLoading || !deck || !content) {
    return <p className="text-center text-[var(--muted)]">Loading roster…</p>;
  }

  const deckTotal = totalDeckCopies(deck);
  const cutsNeeded = Math.max(0, deckTotal + 1 - DECK_CARD_CAP);
  const draftCutsValid = cutsNeeded === 0 ? true : cutCardIds.length >= cutsNeeded && cutsAllowDraft(deck, cutCardIds);

  return (
    <div className="mx-auto max-w-2xl space-y-6 pb-16">
      {showWhistle && whistleData ? (
        <FinalWhistleModal
          data={whistleData}
          playerSide={session.game.playerSide}
          ctaLabel="Continue"
          onGoLocker={() => {
            setShowWhistle(false);
            setWhistleData(null);
          }}
        />
      ) : null}

      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl" style={{ fontFamily: 'var(--font-playfair-sc)', color: 'var(--ink)' }}>
            Locker room
          </h1>
          <p className="text-sm" style={{ fontFamily: 'var(--font-serif)', color: 'var(--ink2)' }}>
            Game {session.season.node} · W{session.season.wins} L{session.season.losses}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-center">
          <DPBadge value={deck.dp ?? 0} size="md" />
          <div
            className="rounded border px-3 py-2 text-right text-xs tabular-nums"
            style={{ borderColor: 'var(--gold-dim)', backgroundColor: 'var(--bg-raised)' }}
          >
            <span className="uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              Cards
            </span>{' '}
            <span style={{ fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
              {deckTotal}/{DECK_CARD_CAP}
            </span>
          </div>
        </div>
      </header>

      <Link to="/season" className="text-sm font-medium underline" style={{ color: 'var(--blue)' }}>
        ← Season map
      </Link>

      {err ? (
        <p className="rounded border px-3 py-2 text-sm" style={{ borderColor: 'var(--red)', color: 'var(--red)' }}>
          {err}
        </p>
      ) : null}

      <nav
        className="rounded-[var(--radius-md)] border"
        style={{ borderColor: 'var(--bg-border)', backgroundColor: 'var(--surface-panel)' }}
        aria-label="Locker sections"
      >
        <div className="flex flex-col sm:flex-row sm:divide-x sm:divide-[var(--bg-border)]">
          <LockerNavItem
            icon="📋"
            label="Draft"
            description="Spend DP on a new card"
            active={tab === 'draft'}
            onClick={() => {
              setTab('draft');
              setErr(null);
              setPendingDraft(null);
              setCutCardIds([]);
            }}
          />
          <LockerNavItem
            icon="⬆️"
            label="Upgrade"
            description="Power up a roster card"
            active={tab === 'upgrade'}
            onClick={() => {
              setTab('upgrade');
              setErr(null);
              setPendingDraft(null);
              setCutCardIds([]);
            }}
          />
          <LockerNavItem
            icon="🏈"
            label="Recruit"
            description="Add a playmaker"
            active={tab === 'recruit'}
            onClick={() => {
              setTab('recruit');
              setErr(null);
              setPendingDraft(null);
              setCutCardIds([]);
            }}
          />
        </div>
      </nav>

          {tab === 'draft' ? (
            <ul className="space-y-2">
              {pendingDraft ? (
                <li
                  className="mb-4 rounded border px-3 py-3 text-sm"
                  style={{ borderColor: 'var(--gold)', backgroundColor: 'var(--cream)' }}
                >
                  <p className="mb-2 font-semibold" style={{ fontFamily: 'var(--font-serif)', color: 'var(--ink)' }}>
                    Cut roster to draft {pendingDraft.name}
                  </p>
                  <p className="mb-2 text-xs" style={{ color: 'var(--ink2)' }}>
                    Remove at least {cutsNeeded} card copy{cutsNeeded === 1 ? '' : 'ies'} (tap a slot once per copy). Cuts
                    selected: {cutCardIds.length}.
                  </p>
                  <ul className="mb-3 grid max-h-48 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3">
                    {[...deck.offense, ...deck.defense].flatMap((row, ri) =>
                      Array.from({ length: row.count }, (_, ci) => (
                        <li key={`${row.cardId}-${ri}-${ci}`}>
                          <button
                            type="button"
                            className="min-h-11 w-full rounded border px-2 py-2 text-left text-xs"
                            style={{ borderColor: 'var(--rule)', backgroundColor: 'var(--surface-panel)', color: 'var(--ink)' }}
                            disabled={draftMut.isPending}
                            onClick={() => setCutCardIds((prev) => [...prev, row.cardId])}
                          >
                            {content.cards.get(row.cardId)?.name ?? row.cardId}
                            <span className="block text-[10px]" style={{ color: 'var(--muted)' }}>
                              −1 copy
                            </span>
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="min-h-11 rounded border px-3 py-2 text-sm"
                      style={{ borderColor: 'var(--rule)', color: 'var(--ink)' }}
                      disabled={draftMut.isPending}
                      onClick={() => setCutCardIds((prev) => prev.slice(0, -1))}
                    >
                      Undo last cut
                    </button>
                    <button
                      type="button"
                      className="min-h-11 rounded border px-3 py-2 text-sm"
                      style={{ borderColor: 'var(--rule)', color: 'var(--ink)' }}
                      disabled={draftMut.isPending}
                      onClick={() => {
                        setPendingDraft(null);
                        setCutCardIds([]);
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="min-h-11 flex-1 rounded border-2 px-3 py-2 text-sm font-semibold disabled:opacity-40"
                      style={{
                        borderColor: 'var(--blue)',
                        backgroundColor: 'var(--blue)',
                        color: 'var(--white)',
                      }}
                      disabled={draftMut.isPending || !draftCutsValid}
                      onClick={() => {
                        if (!pendingDraft) return;
                        draftMut.mutate({ cardId: pendingDraft._id, cutCardIds });
                      }}
                    >
                      Confirm draft
                    </button>
                  </div>
                </li>
              ) : null}
              {draftOptions.map((c) => {
                const cost = c.draftCost ?? 1;
                const can = (deck.dp ?? 0) >= cost;
                return (
                  <li key={c._id}>
                    <button
                      type="button"
                      className="flex w-full min-h-12 items-center justify-between gap-3 rounded border px-3 py-2 text-left text-sm disabled:opacity-40"
                      style={{ borderColor: 'var(--rule)', backgroundColor: 'var(--surface-panel)', color: 'var(--ink)' }}
                      disabled={!can || draftMut.isPending || Boolean(pendingDraft)}
                      onClick={() => {
                        if (cutsNeeded > 0) {
                          setPendingDraft(c);
                          setCutCardIds([]);
                          return;
                        }
                        draftMut.mutate({ cardId: c._id, cutCardIds: [] });
                      }}
                    >
                      <span>
                        <span className={`mr-2 inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${badgeClassForCardType(c.type)}`}>
                          {shortTypeLabel(c.type)}
                        </span>
                        <span style={{ fontFamily: 'var(--font-serif)' }}>{c.name}</span>
                        <span className="ml-2 text-xs capitalize opacity-80" style={{ color: 'var(--muted)' }}>
                          {c.side}
                        </span>
                      </span>
                      <span style={{ fontFamily: 'var(--font-playfair-sc)', color: 'var(--gold)' }}>{cost} DP</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}

          {tab === 'upgrade' ? (
            <ul className="space-y-2">
              {upgradeOptions.length === 0 ? (
                <li className="text-sm italic" style={{ color: 'var(--muted)' }}>
                  No eligible upgrades (need base card in deck without an upgrade).
                </li>
              ) : (
                upgradeOptions.map((o) => {
                  const can = (deck.dp ?? 0) >= o.upgrade.dpCost;
                  return (
                    <li key={o.rowKey}>
                      <button
                        type="button"
                        className="flex w-full min-h-12 flex-col items-stretch gap-1 rounded border px-3 py-2 text-left text-sm disabled:opacity-40 sm:flex-row sm:items-center sm:justify-between"
                        style={{ borderColor: 'var(--rule)', backgroundColor: 'var(--surface-panel)', color: 'var(--ink)' }}
                        disabled={!can || upgradeMut.isPending}
                        onClick={() => upgradeMut.mutate({ cardId: o.cardId, upgradeId: o.upgrade._id })}
                      >
                        <span style={{ fontFamily: 'var(--font-serif)' }}>
                          {o.card.name} → <span style={{ color: 'var(--gold)' }}>{o.upgrade.name}</span>
                        </span>
                        <span style={{ fontFamily: 'var(--font-playfair-sc)', color: 'var(--gold)' }}>{o.upgrade.dpCost} DP</span>
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          ) : null}

          {tab === 'recruit' ? (
            <ul className="space-y-2">
              {recruitOptions.map((p: Playmaker) => {
                const cost = p.recruitCost ?? 0;
                const can = (deck.dp ?? 0) >= cost;
                const full =
                  (p.side === 'offense' && deck.offPlaymakers.length >= 5) ||
                  (p.side === 'defense' && deck.defPlaymakers.length >= 5);
                return (
                  <li key={p._id}>
                    <button
                      type="button"
                      className="flex w-full min-h-12 items-center justify-between gap-3 rounded border px-3 py-2 text-left text-sm disabled:opacity-40"
                      style={{ borderColor: 'var(--rule)', backgroundColor: 'var(--surface-panel)', color: 'var(--ink)' }}
                      disabled={!can || full || recruitMut.isPending}
                      onClick={() => recruitMut.mutate(p._id)}
                    >
                      <span style={{ fontFamily: 'var(--font-serif)' }}>
                        {p.name}{' '}
                        <span className="text-xs opacity-80" style={{ color: 'var(--muted)' }}>
                          {p.position} · {p.side}
                        </span>
                      </span>
                      <span style={{ fontFamily: 'var(--font-playfair-sc)', color: 'var(--gold)' }}>{cost} DP</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}

          <button
            type="button"
            className="min-h-12 w-full rounded border-2 px-4 py-3 font-semibold focus:outline-none focus:ring-2 focus:ring-[var(--gold)] disabled:opacity-50"
            style={{
              fontFamily: 'var(--font-playfair-sc)',
              borderColor: 'var(--green-turf)',
              backgroundColor: 'var(--green-field)',
              color: 'var(--white)',
            }}
            disabled={closeMut.isPending}
            onClick={() => closeMut.mutate()}
          >
            {closeMut.isPending ? 'Starting next game…' : 'Close locker room'}
          </button>
    </div>
  );
}

export default LockerRoomPage;
