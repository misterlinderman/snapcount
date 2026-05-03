import { Deck, User } from '../../models';
import { buildStarterDeckRows } from '../../services/starterDeck';

export async function createUserWithStarterDeck(userId: string): Promise<{ deckId: string }> {
  await User.create({
    _id: userId,
    email: `${userId}@test.local`,
    displayName: 'Integration Tester',
    role: 'user',
  });
  const starter = buildStarterDeckRows();
  const deck = await Deck.create({
    user: userId,
    name: 'Test Deck',
    isDefault: true,
    offense: starter.offense,
    defense: starter.defense,
    offPlaymakers: starter.offPlaymakers,
    defPlaymakers: starter.defPlaymakers,
    cardAcquisitionOrder: starter.cardAcquisitionOrder,
    dp: 10,
  });
  return { deckId: String(deck._id) };
}
