import { Router, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { loadGameContentForApi } from '../game/content/loadForApi';
import type { GameContent } from '../game/types';

const router = Router();

async function loadContentOrFail(): Promise<GameContent> {
  return loadGameContentForApi();
}

function sortCatalog<T extends { side: string; type?: string; name: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const s = a.side.localeCompare(b.side);
    if (s !== 0) return s;
    const ta = a.type ?? '';
    const tb = b.type ?? '';
    const t = ta.localeCompare(tb);
    if (t !== 0) return t;
    return a.name.localeCompare(b.name);
  });
}

router.get(
  '/cards',
  asyncHandler(async (_req, res: Response) => {
    const content = await loadContentOrFail();
    const list = sortCatalog(Array.from(content.cards.values()));
    res.json(list);
  })
);

router.get(
  '/playmakers',
  asyncHandler(async (_req, res: Response) => {
    const content = await loadContentOrFail();
    const list = sortCatalog(Array.from(content.playmakers.values()));
    res.json(list);
  })
);

router.get(
  '/upgrades',
  asyncHandler(async (_req, res: Response) => {
    const content = await loadContentOrFail();
    const list = [...content.upgrades.values()].sort((a, b) => a.name.localeCompare(b.name));
    res.json(list);
  })
);

router.get(
  '/matchups',
  asyncHandler(async (_req, res: Response) => {
    const content = await loadContentOrFail();
    res.json({
      matrix: content.matchups.matrix,
      labels: content.matchups.labels,
      version: content.matchupVersion,
    });
  })
);

export default router;
