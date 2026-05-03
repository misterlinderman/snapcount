import type { IGameSession, IHandState } from '../models/GameSession';
import type { IDeck } from '../models/Deck';
import type { CardType, DeckForEngine, GameState, HandState, SnapResult, Team } from '../game/types';

export function deckToEngine(deck: IDeck): DeckForEngine {
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

function handFromDoc(h?: IHandState | null): HandState {
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

export function defaultGameSlice(): IGameSession['game'] {
  return {
    quarter: 1,
    totalDowns: 0,
    scoreRed: 0,
    scoreBlue: 0,
    ballYard: 50,
    possession: 'red',
    down: 1,
    yardsToGo: 10,
    playerSide: 'red',
    perGameBuffs: { powerBoost: 0, starPMBoost: 0 },
    lastThreeTypes: [],
    filmStudyActive: false,
    rogueWins: 0,
    rogueGames: 0,
    dp: 0,
    pendingDeckAdds: [],
    gameWinner: null,
    redrawUsedThisPossession: false,
  };
}

export function sessionToGameState(session: IGameSession): GameState {
  const g = session.game;
  return {
    scoreRed: g.scoreRed,
    scoreBlue: g.scoreBlue,
    quarter: g.quarter as 1 | 2 | 3 | 4,
    totalDowns: g.totalDowns,
    ballYard: g.ballYard,
    possession: g.possession as Team,
    down: g.down as 1 | 2 | 3 | 4,
    yardsToGo: g.yardsToGo,
    playerSide: g.playerSide as Team,
    hand: handFromDoc(session.hand),
    cpu: handFromDoc(session.cpuHand),
    pendingAdvance: (session.pendingAdvance as SnapResult | null) ?? null,
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

export function applyGameStateToSession(session: IGameSession, state: GameState): void {
  session.game.scoreRed = state.scoreRed;
  session.game.scoreBlue = state.scoreBlue;
  session.game.quarter = state.quarter;
  session.game.totalDowns = state.totalDowns;
  session.game.ballYard = state.ballYard;
  session.game.possession = state.possession;
  session.game.down = state.down;
  session.game.yardsToGo = state.yardsToGo;
  session.game.playerSide = state.playerSide;
  session.game.perGameBuffs = { ...state.perGameBuffs };
  session.game.lastThreeTypes = [...state.lastThreeTypes];
  session.game.filmStudyActive = state.filmStudyActive;
  session.game.rogueWins = state.rogueWins;
  session.game.rogueGames = state.rogueGames;
  session.game.dp = state.dp;
  session.game.pendingDeckAdds = [...state.pendingDeckAdds];
  session.game.gameWinner = state.gameWinner;
  session.game.redrawUsedThisPossession = state.redrawUsedThisPossession;

  session.hand = {
    cards: [...state.hand.cards],
    playmaker: state.hand.playmaker,
    selectedCardId: state.hand.selectedCardId,
    selectedPM: state.hand.selectedPM,
  };
  session.cpuHand = {
    cards: [...state.cpu.cards],
    playmaker: state.cpu.playmaker,
    selectedCardId: state.cpu.selectedCardId,
    selectedPM: state.cpu.selectedPM,
  };
  session.pendingAdvance = state.pendingAdvance;
}
