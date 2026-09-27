import { Router } from 'express';
import * as testController from '../controllers/test.controller';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.post('/', authenticate, requireAdmin, testController.createTest);
router.get('/', testController.listTests);
router.get('/:id', testController.getTest);
router.put('/:id', authenticate, requireAdmin, testController.updateTest);
router.delete('/:id', authenticate, requireAdmin, testController.deleteTest);

export default router;
