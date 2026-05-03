import { Router } from 'express';
import { checkJwt } from '../../middleware/auth';
import { requireAdmin } from '../../middleware/requireAdmin';
import cards from './cards';
import playmakers from './playmakers';
import upgrades from './upgrades';
import audit from './audit';
import matchups from './matchups';
import stats from './stats';
import users from './users';
import sessions from './sessions';

const router = Router();

router.use(checkJwt, requireAdmin);
router.use('/cards', cards);
router.use('/playmakers', playmakers);
router.use('/upgrades', upgrades);
router.use('/audit', audit);
router.use('/matchups', matchups);
router.use('/stats', stats);
router.use('/users', users);
router.use('/sessions', sessions);

export default router;
