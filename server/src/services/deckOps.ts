import type { IDeck } from '../models/Deck';

export const DECK_CARD_CAP = 20;

export function totalDeckCardCopies(deck: Pick<IDeck, 'offense' | 'defense'>): number {
  let n = 0;
  for (const r of deck.offense) n += r.count;
  for (const r of deck.defense) n += r.count;
  return n;
}

/** Remove one copy of `cardId` from the first matching row (offense then defense). Returns whether a row was changed. */
export function removeOneDeckCopy(deck: IDeck, cardId: string): boolean {
  for (const rows of [deck.offense, deck.defense]) {
    const idx = rows.findIndex((r) => r.cardId === cardId);
    if (idx === -1) continue;
    const row = rows[idx]!;
    if (row.count > 1) {
      row.count -= 1;
      return true;
    }
    rows.splice(idx, 1);
    return true;
  }
  return false;
}

/**
 * Each `cutCardIds` entry removes one copy (in order). Throws if a slug cannot be removed.
 */
export function applyDeckCuts(deck: IDeck, cutCardIds: readonly string[]): void {
  for (const id of cutCardIds) {
    if (!removeOneDeckCopy(deck, id)) {
      throw new Error(`cut: card not in deck: ${id}`);
    }
  }
}

export function trimAcquisitionOrder(deck: IDeck): void {
  const ord = deck.cardAcquisitionOrder;
  if (!ord?.length) return;
  deck.cardAcquisitionOrder = ord.filter((id) =>
    [...deck.offense, ...deck.defense].some((r) => r.cardId === id)
  );
}

export function appendAcquisition(deck: IDeck, cardId: string): void {
  if (!deck.cardAcquisitionOrder) {
    deck.cardAcquisitionOrder = [];
  }
  deck.cardAcquisitionOrder.push(cardId);
}

/**
 * Blowout loss (v0.3): remove up to `n` copies walking `cardAcquisitionOrder` from the end.
 */
export function removeLastNAcquisitions(deck: IDeck, n: number): number {
  trimAcquisitionOrder(deck);
  const ord = deck.cardAcquisitionOrder;
  if (!ord?.length) return 0;

  let removed = 0;
  while (removed < n && ord.length > 0) {
    const id = ord.pop()!;
    if (removeOneDeckCopy(deck, id)) {
      removed += 1;
    }
  }
  trimAcquisitionOrder(deck);
  return removed;
}
