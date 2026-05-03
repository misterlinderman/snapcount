import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import ActionBar from '@/components/game/ActionBar';
import CoinTossModal from '@/components/game/CoinTossModal';
import Field from '@/components/game/Field';
import Hand from '@/components/game/Hand';
import type { HandCardSlot } from '@/components/game/Hand';
import ResolutionPanel from '@/components/game/ResolutionPanel';
import RoleBanner from '@/components/game/RoleBanner';
import Scoreboard from '@/components/game/Scoreboard';
import StatusTicker from '@/components/game/StatusTicker';
import TouchdownRewardModal from '@/components/game/overlays/TouchdownRewardModal';
import { getEffectivePower } from '@/game/engine/helpers';
import { reduceGame } from '@/game/engine/reducers';
import { rngFromPlay } from '@/game/sessionRng';
import { shortTypeLabel } from '@/components/game/gameUi.types';
import {
  deckApiToEngine,
  mergeSnapStateIntoSession,
  type GameSessionDTO,
} from '@/game/sessionBridge';
import { GameSessionProvider, useGameSessionContext } from '@/game/state/GameSessionContext';
import { warnIfSnapMismatch } from '@/game/warnSnapMismatch';
import type { GameContent, GameState } from '@/game/types';
import { decksApi } from '@/services/decksApi';
import { fetchGameContentBundle } from '@/services/gameContentApi';
import type { TdRewardId } from '@/services/sessionsApi';
import { sessionsApi } from '@/services/sessionsApi';

function userHandSide(state: GameState): 'offense' | 'defense' {
  return state.possession === state.playerSide ? 'offense' : 'defense';
}

function affinityLine(pmId: string, content: GameContent): string {
  const pm = content.playmakers.get(pmId);
  if (!pm) return '—';
  return pm.affinityTypes.map(shortTypeLabel).join(' · ') || '—';
}

function useContentBundle() {
  return useQuery({
    queryKey: ['content', 'bundle'],
    queryFn: fetchGameContentBundle,
    staleTime: 60_000,
  });
}

interface PlayFieldProps {
  session: GameSessionDTO;
}

function PlayField({ session }: PlayFieldProps): JSX.Element {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const ctx = useGameSessionContext();
  const { data: content, isError: contentError } = useContentBundle();
  const { data: deck } = useQuery({
    queryKey: ['deck', session.deck],
    queryFn: () => decksApi.getById(session.deck),
    enabled: Boolean(session.deck),
  });

  const display = ctx.getDisplayState(session);
  const deckE = deck ? deckApiToEngine(deck) : undefined;

  const lastPlayRef = useRef('—');
  const [liveLine, setLiveLine] = useState('');

  useEffect(() => {
    if (!display) return;
    const ordinal = (d: number) => ['1st', '2nd', '3rd', '4th'][d - 1] ?? `${d}th`;
    const team = display.possession === 'red' ? 'Blitz' : 'Storm';
    setLiveLine(
      `${ordinal(display.down)} & ${display.yardsToGo} — ${team} ball at the ${Math.round(display.ballYard)}`
    );
    const pa = display.pendingAdvance;
    if (pa) {
      const y = pa.yards > 0 ? `+${pa.yards}` : `${pa.yards}`;
      lastPlayRef.current = `${pa.matchupLabel || 'Play resolved'} — ${y} yds`;
    }
  }, [display]);

  const handSlots: HandCardSlot[] = useMemo(() => {
    if (!display || !content || !deckE) return [];
    const side = userHandSide(display);
    const pm = content.playmakers.get(display.hand.playmaker);
    if (!pm) return [];
    const slots: HandCardSlot[] = [];
    for (const id of display.hand.cards) {
      const c = content.cards.get(id);
      if (!c || c.side !== side) continue;
      const p = Math.round(getEffectivePower(c, pm, content, display.perGameBuffs));
      slots.push({
        id: c._id,
        cardType: c.type,
        name: c.name,
        power: p,
        variant: display.hand.selectedCardId === c._id ? 'selected' : 'selectable',
      });
    }
    return slots;
  }, [display, content, deckE]);

  const resolution = display?.pendingAdvance;

  const userOnOffense = display ? display.possession === display.playerSide : false;
  const showFieldGoal =
    Boolean(display && display.down === 4 && userOnOffense && display.gameWinner === null);

  const resolutionKey = useMemo(() => {
    if (!resolution) return '';
    return `${resolution.offense.cardId}|${resolution.defense.cardId}|${resolution.yards}|${resolution.margin}|${resolution.playKind ?? 'snap'}`;
  }, [resolution]);

  const [tdClearedFor, setTdClearedFor] = useState<string | null>(null);
  useEffect(() => {
    setTdClearedFor(null);
  }, [resolutionKey]);

  const hasTouchdown = resolution?.events?.some((e) => e.type === 'TOUCHDOWN') ?? false;
  const needsTdReward = Boolean(resolutionKey && hasTouchdown && tdClearedFor !== resolutionKey);

  const canEndMatch = display?.gameWinner != null && !needsTdReward;

  const snapMut = useMutation({
    mutationFn: async (input: { cardId: string; playmakerId: string }) => {
      if (!display || !content || !deckE) throw new Error('Missing game data');
      const playId = crypto.randomUUID();
      const rng = await rngFromPlay(session._id, playId);
      const state: GameState = {
        ...display,
        hand: {
          ...display.hand,
          selectedCardId: input.cardId,
          selectedPM: input.playmakerId,
        },
      };
      const r = reduceGame(state, { type: 'SNAP', playId }, content, rng, deckE);
      ctx.dispatch({
        type: 'BEGIN_OPTIMISTIC_SNAP',
        payload: { playId, gameState: r.state, events: r.events },
      });
      const res = await sessionsApi.snap(session._id, {
        playId,
        cardId: input.cardId,
        playmakerId: input.playmakerId,
      });
      return { res, optimisticPending: r.state.pendingAdvance };
    },
    onSuccess: ({ res, optimisticPending }) => {
      warnIfSnapMismatch(optimisticPending, res.state.pendingAdvance ?? null);
      qc.setQueryData<GameSessionDTO | null>(['session', 'active'], (prev) =>
        prev ? mergeSnapStateIntoSession(prev, res.state) : prev
      );
      ctx.dispatch({ type: 'CLEAR_OPTIMISTIC' });
    },
    onError: () => {
      ctx.dispatch({ type: 'CLEAR_OPTIMISTIC' });
    },
  });

  const redrawMut = useMutation({
    mutationFn: () => sessionsApi.redraw(session._id),
    onSuccess: (data) => {
      qc.setQueryData(['session', 'active'], data);
      ctx.dispatch({ type: 'RESET_UI' });
    },
  });

  const fieldGoalMut = useMutation({
    mutationFn: async () => {
      if (!display || !content || !deckE) throw new Error('Missing game data');
      const playId = crypto.randomUUID();
      const rng = await rngFromPlay(session._id, playId);
      const r = reduceGame(display, { type: 'FIELD_GOAL' }, content, rng, deckE);
      ctx.dispatch({
        type: 'BEGIN_OPTIMISTIC_SNAP',
        payload: { playId, gameState: r.state, events: r.events },
      });
      const res = await sessionsApi.fieldGoal(session._id, { playId });
      return { res, optimisticPending: r.state.pendingAdvance };
    },
    onSuccess: ({ res, optimisticPending }) => {
      warnIfSnapMismatch(optimisticPending, res.state.pendingAdvance ?? null);
      qc.setQueryData<GameSessionDTO | null>(['session', 'active'], (prev) =>
        prev ? mergeSnapStateIntoSession(prev, res.state) : prev
      );
      ctx.dispatch({ type: 'CLEAR_OPTIMISTIC' });
    },
    onError: () => {
      ctx.dispatch({ type: 'CLEAR_OPTIMISTIC' });
    },
  });

  const nextPlayMut = useMutation({
    mutationFn: () => sessionsApi.nextPlay(session._id),
    onSuccess: (data) => {
      qc.setQueryData(['session', 'active'], data);
      ctx.dispatch({ type: 'RESET_UI' });
    },
  });

  const tdRewardMut = useMutation({
    mutationFn: (rewardId: TdRewardId) => sessionsApi.tdReward(session._id, { rewardId }),
    onSuccess: (data) => {
      qc.setQueryData(['session', 'active'], data);
      setTdClearedFor(resolutionKey);
    },
  });

  const endMatchMut = useMutation({
    mutationFn: () => sessionsApi.endGame(session._id),
    onSuccess: (endPayload) => {
      qc.invalidateQueries({ queryKey: ['session', 'active'] });
      qc.invalidateQueries({ queryKey: ['deck', session.deck] });
      navigate(`/locker/${session._id}`, { replace: true, state: { endGame: endPayload } });
    },
  });

  const onSnap = useCallback(() => {
    const cardId = display?.hand.selectedCardId;
    const playmakerId = display?.hand.selectedPM;
    if (!cardId || !playmakerId || snapMut.isPending) return;
    snapMut.mutate({ cardId, playmakerId });
  }, [display, snapMut]);

  if (contentError) {
    return (
      <p className="text-center" style={{ color: 'var(--red)' }}>
        Could not load game content. Try again later.
      </p>
    );
  }

  if (!display || !content || !deck) {
    return <p className="text-center text-[var(--muted)]">Loading play data…</p>;
  }

  const role = userHandSide(display);
  const pmVisual = display.hand.playmaker
    ? {
        name: content.playmakers.get(display.hand.playmaker)?.name ?? 'Playmaker',
        affinityLabel: affinityLine(display.hand.playmaker, content),
        variant: display.hand.selectedPM === display.hand.playmaker ? ('selected' as const) : ('selectable' as const),
      }
    : { name: '—', affinityLabel: '—', variant: 'selectable' as const };

  const showResolution = Boolean(resolution);

  return (
    <div className="space-y-4 pb-24">
      <Scoreboard
        homeLabel="Blitz FC"
        awayLabel="Storm SC"
        homeScore={display.scoreRed}
        awayScore={display.scoreBlue}
        possession={display.possession}
        quarter={display.quarter}
        down={display.down}
        yardsToGo={display.yardsToGo}
        homeIsRed
      />

      <StatusTicker liveLine={liveLine} lastLine={lastPlayRef.current} />

      <RoleBanner role={role} team={display.playerSide} />

      <Field ballYard={display.ballYard} />

      {canEndMatch ? (
        <div
          className="space-y-3 rounded border px-4 py-4 text-center"
          style={{ borderColor: 'var(--gold)', backgroundColor: 'var(--cream)' }}
        >
          <p className="text-lg" style={{ fontFamily: 'var(--font-playfair-sc)', color: 'var(--ink)' }}>
            Final — {display.gameWinner === display.playerSide ? 'You win' : 'You lose'}
          </p>
          <button
            type="button"
            className="mx-auto min-h-12 w-full max-w-xs rounded border-2 px-4 py-3 font-semibold disabled:opacity-45"
            style={{
              fontFamily: 'var(--font-playfair-sc)',
              borderColor: 'var(--blue)',
              backgroundColor: 'var(--blue)',
              color: 'var(--white)',
            }}
            disabled={endMatchMut.isPending}
            onClick={() => endMatchMut.mutate()}
          >
            {endMatchMut.isPending ? 'Saving…' : 'Collect DP & enter locker'}
          </button>
        </div>
      ) : null}

      {needsTdReward ? (
        <TouchdownRewardModal
          resolutionKey={resolutionKey}
          onPick={async (id) => {
            await tdRewardMut.mutateAsync(id);
          }}
        />
      ) : null}

      {showResolution && resolution ? (
        resolution.playKind === 'field_goal' && resolution.fieldGoal ? (
          <div
            className="space-y-3 rounded border px-4 py-4 text-center"
            style={{ borderColor: 'var(--gold-mid)', backgroundColor: 'var(--cream)' }}
          >
            <p className="text-lg" style={{ fontFamily: 'var(--font-playfair-sc)', color: 'var(--ink)' }}>
              Field goal — {resolution.fieldGoal.made ? 'Good (+3)' : 'No good'}
            </p>
            <p className="text-sm" style={{ fontFamily: 'var(--font-serif)', color: 'var(--ink2)' }}>
              {resolution.fieldGoal.made
                ? `${resolution.fieldGoal.distanceYards}-yard try`
                : `Missed from ${resolution.fieldGoal.distanceYards}`}
            </p>
            <p className="text-xs italic" style={{ color: 'var(--muted)' }}>
              {resolution.matchupLabel}
            </p>
          </div>
        ) : (
          <ResolutionPanel
            offense={{
              roleLabel: 'Offense',
              cardType: resolution.offense.type,
              name: resolution.offense.name,
              powerDisplay: String(resolution.offense.finalPower),
            }}
            defense={{
              roleLabel: 'Defense',
              cardType: resolution.defense.type,
              name: resolution.defense.name,
              powerDisplay: String(resolution.defense.finalPower),
            }}
            matchupLabel={resolution.matchupLabel}
            yards={resolution.yards}
          />
        )
      ) : null}

      {!showResolution ? (
        <Hand
          cards={handSlots}
          playmaker={pmVisual}
          onCardSelect={(id) => ctx.dispatch({ type: 'SELECT_CARD', cardId: id })}
          onPlaymakerClick={() =>
            ctx.dispatch({
              type: 'SELECT_PM',
              playmakerId: display.hand.playmaker,
            })
          }
        />
      ) : null}

      <ActionBar
        mode={showResolution ? 'next-play' : 'snap'}
        redrawDisabled={
          showResolution || redrawMut.isPending || display.redrawUsedThisPossession || display.dp < 1
        }
        showFieldGoal={!showResolution && showFieldGoal}
        fieldGoalDisabled={
          display.gameWinner !== null || fieldGoalMut.isPending || snapMut.isPending || redrawMut.isPending
        }
        snapDisabled={
          display.gameWinner !== null ||
          snapMut.isPending ||
          !display.hand.selectedCardId ||
          display.hand.selectedPM !== display.hand.playmaker
        }
        nextPlayDisabled={needsTdReward || nextPlayMut.isPending}
        onRedraw={() => redrawMut.mutate()}
        onFieldGoal={() => fieldGoalMut.mutate()}
        onSnap={onSnap}
        onNextPlay={() => nextPlayMut.mutate()}
      />
    </div>
  );
}

export default function PlayPage(): JSX.Element {
  const qc = useQueryClient();
  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ['session', 'active'],
    queryFn: sessionsApi.getActive,
  });
  const { data: defaultDeck, isLoading: deckLoading } = useQuery({
    queryKey: ['deck', 'default'],
    queryFn: decksApi.getDefault,
  });

  const createMut = useMutation({
    mutationFn: () => sessionsApi.create(defaultDeck!._id),
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

  const coinTossMut = useMutation({
    mutationFn: ({ id, side }: { id: string; side: 'offense' | 'defense' }) =>
      sessionsApi.coinToss(id, { side }),
    onSuccess: (data) => {
      qc.setQueryData(['session', 'active'], data);
    },
  });

  if (sessionLoading || deckLoading) {
    return <p className="text-center text-[var(--muted)]">Loading…</p>;
  }

  if (!defaultDeck) {
    return (
      <p className="text-center" style={{ color: 'var(--muted)' }}>
        No default deck found. Build a deck in the locker first.
      </p>
    );
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-md space-y-4 text-center">
        <h1 className="text-2xl" style={{ fontFamily: 'var(--font-playfair-sc)' }}>
          Kickoff
        </h1>
        <p style={{ fontFamily: 'var(--font-serif)', color: 'var(--ink2)' }}>
          Start a new session with your default deck. Any active session will continue where you left off.
        </p>
        <button
          type="button"
          className="min-h-12 w-full rounded border-2 px-4 py-3 font-semibold"
          style={{
            fontFamily: 'var(--font-playfair-sc)',
            borderColor: 'var(--green-turf)',
            backgroundColor: 'var(--green-field)',
            color: 'var(--white)',
          }}
          disabled={createMut.isPending}
          onClick={() => createMut.mutate()}
        >
          {createMut.isPending ? 'Starting…' : 'Start game'}
        </button>
        {createMut.isError ? (
          <p className="text-sm" style={{ color: 'var(--red)' }}>
            {isAxiosError(createMut.error) ? String(createMut.error.response?.data?.message ?? createMut.error.message) : 'Could not start'}
          </p>
        ) : null}
      </div>
    );
  }

  if (session.phase === 'locker') {
    return <Navigate to={`/locker/${session._id}`} replace />;
  }

  return (
    <GameSessionProvider sessionId={session._id}>
      {session.phase === 'coin-toss' ? (
        <CoinTossModal
          sessionId={session._id}
          onPick={async (side) => {
            await coinTossMut.mutateAsync({ id: session._id, side });
          }}
        />
      ) : null}
      <PlayField session={session} />
    </GameSessionProvider>
  );
}
