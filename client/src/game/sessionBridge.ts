import type {
  CardType,
  DeckForEngine,
  GameState,
  HandState,
  SnapResult,
  Team,
} from './types';

/** API session document fields the play UI needs (subset of server `IGameSession`). */
export interface GameSessionDTO {
  _id: string;
  deck: string;
  status: 'active' | 'completed' | 'abandoned';
  phase: 'coin-toss' | 'play' | 'locker';
  season: {
    node: 1 | 2 | 3 | 4 | 5;
    wins: number;
    losses: number;
  };
  game: {
    quarter: number;
    totalDowns: number;
    scoreRed: number;
    scoreBlue: number;
    ballYard: number;
    possession: Team;
    down: number;
    yardsToGo: number;
    playerSide: Team;
    perGameBuffs: { powerBoost: number; starPMBoost: number };
    lastThreeTypes: string[];
    filmStudyActive?: boolean;
    rogueWins?: number;
    rogueGames?: number;
    dp?: number;
    pendingDeckAdds?: string[];
    gameWinner?: Team | null;
    redrawUsedThisPossession?: boolean;
  };
  hand?: HandState;
  cpuHand?: HandState;
  pendingAdvance?: SnapResult | null;
}

export interface SnapStateSlice {
  game: GameSessionDTO['game'];
  hand?: HandState;
  cpuHand?: HandState;
  pendingAdvance?: SnapResult | null;
  phase: GameSessionDTO['phase'];
  season: GameSessionDTO['season'];
}

export interface ApiDeckRow {
  cardId: string;
  count: number;
  upgradeId?: string;
}

export interface DeckDTO {
  _id: string;
  name?: string;
  dp?: number;
  offense: ApiDeckRow[];
  defense: ApiDeckRow[];
  offPlaymakers: string[];
  defPlaymakers: string[];
  /** Draft acquisition order (server v0.3). */
  cardAcquisitionOrder?: string[];
}

function handFromApi(h?: HandState | null): HandState {
  if (!h) {
    return { cards: [], playmaker: '' };
  }
  return {
    cards: [...h.cards],
    playmaker: h.playmaker,
    selectedCardId: h.selectedCardId,
    selectedPM: h.selectedPM,
  };
}

export function sessionApiToGameState(session: GameSessionDTO): GameState {
  const g = session.game;
  return {
    scoreRed: g.scoreRed,
    scoreBlue: g.scoreBlue,
    quarter: g.quarter as 1 | 2 | 3 | 4,
    totalDowns: g.totalDowns,
    ballYard: g.ballYard,
    possession: g.possession,
    down: g.down as 1 | 2 | 3 | 4,
    yardsToGo: g.yardsToGo,
    playerSide: g.playerSide,
    hand: handFromApi(session.hand),
    cpu: handFromApi(session.cpuHand),
    pendingAdvance: session.pendingAdvance ?? null,
    filmStudyActive: g.filmStudyActive ?? false,
    lastThreeTypes: (g.lastThreeTypes ?? []) as CardType[],
    rogueWins: g.rogueWins ?? 0,
    rogueGames: g.rogueGames ?? 0,
    dp: g.dp ?? 0,
    perGameBuffs: {
      powerBoost: g.perGameBuffs?.powerBoost ?? 0,
      starPMBoost: g.perGameBuffs?.starPMBoost ?? 0,
    },
    pendingDeckAdds: g.pendingDeckAdds ?? [],
    gameWinner: (g.gameWinner as Team | null) ?? null,
    redrawUsedThisPossession: g.redrawUsedThisPossession ?? false,
  };
}

export function deckApiToEngine(deck: DeckDTO): DeckForEngine {
  return {
    offense: deck.offense.map((r) => ({
      cardId: r.cardId,
      count: r.count,
      upgradeId: r.upgradeId,
    })),
    defense: deck.defense.map((r) => ({
      cardId: r.cardId,
      count: r.count,
      upgradeId: r.upgradeId,
    })),
    offPlaymakers: [...deck.offPlaymakers],
    defPlaymakers: [...deck.defPlaymakers],
  };
}

export function mergeSnapStateIntoSession(
  session: GameSessionDTO,
  slice: SnapStateSlice
): GameSessionDTO {
  return {
    ...session,
    game: slice.game,
    hand: slice.hand,
    cpuHand: slice.cpuHand,
    pendingAdvance: slice.pendingAdvance,
    phase: slice.phase,
    season: slice.season,
  };
}
