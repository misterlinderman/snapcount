import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type Dispatch,
  type ReactNode,
} from 'react';
import type { GameEvent, GameState } from '../types';
import type { GameSessionDTO } from '../sessionBridge';
import { sessionApiToGameState } from '../sessionBridge';

export interface OptimisticSnapPayload {
  playId: string;
  gameState: GameState;
  events: GameEvent[];
}

export type GameSessionUiAction =
  | { type: 'RESET_UI' }
  | { type: 'SELECT_CARD'; cardId: string | undefined }
  | { type: 'SELECT_PM'; playmakerId: string | undefined }
  | { type: 'BEGIN_OPTIMISTIC_SNAP'; payload: OptimisticSnapPayload }
  | { type: 'CLEAR_OPTIMISTIC' };

export interface GameSessionUiState {
  selectedCardId?: string;
  selectedPM?: string;
  optimistic: OptimisticSnapPayload | null;
}

const initialUi: GameSessionUiState = {
  selectedCardId: undefined,
  selectedPM: undefined,
  optimistic: null,
};

function uiReducer(state: GameSessionUiState, action: GameSessionUiAction): GameSessionUiState {
  switch (action.type) {
    case 'RESET_UI':
      return { ...initialUi };
    case 'SELECT_CARD':
      return { ...state, selectedCardId: action.cardId };
    case 'SELECT_PM':
      return { ...state, selectedPM: action.playmakerId };
    case 'BEGIN_OPTIMISTIC_SNAP':
      return {
        ...state,
        optimistic: action.payload,
        selectedCardId: undefined,
        selectedPM: undefined,
      };
    case 'CLEAR_OPTIMISTIC':
      return { ...state, optimistic: null };
    default:
      return state;
  }
}

export interface GameSessionContextValue extends GameSessionUiState {
  dispatch: Dispatch<GameSessionUiAction>;
  /** Server session merged with local picks, or full optimistic state while a snap is in flight. */
  getDisplayState: (session: GameSessionDTO | null | undefined) => GameState | null;
}

const GameSessionContext = createContext<GameSessionContextValue | null>(null);

export interface GameSessionProviderProps {
  sessionId: string | undefined;
  children: ReactNode;
}

export function GameSessionProvider({ sessionId, children }: GameSessionProviderProps): JSX.Element {
  const [state, dispatch] = useReducer(uiReducer, initialUi);

  useEffect(() => {
    dispatch({ type: 'RESET_UI' });
  }, [sessionId]);

  const getDisplayState = useCallback(
    (session: GameSessionDTO | null | undefined): GameState | null => {
      if (!session) return null;
      if (state.optimistic) {
        return state.optimistic.gameState;
      }
      const base = sessionApiToGameState(session);
      return {
        ...base,
        hand: {
          ...base.hand,
          selectedCardId: state.selectedCardId ?? base.hand.selectedCardId,
          selectedPM: state.selectedPM ?? base.hand.selectedPM,
        },
      };
    },
    [state.optimistic, state.selectedCardId, state.selectedPM]
  );

  const value = useMemo<GameSessionContextValue>(
    () => ({
      ...state,
      dispatch,
      getDisplayState,
    }),
    [state, getDisplayState]
  );

  return <GameSessionContext.Provider value={value}>{children}</GameSessionContext.Provider>;
}

/** Context consumer; colocated with provider. */
// eslint-disable-next-line react-refresh/only-export-components -- standard context + hook pattern
export function useGameSessionContext(): GameSessionContextValue {
  const ctx = useContext(GameSessionContext);
  if (!ctx) {
    throw new Error('useGameSessionContext must be used within GameSessionProvider');
  }
  return ctx;
}

