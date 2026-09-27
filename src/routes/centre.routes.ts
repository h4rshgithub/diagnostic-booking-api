import { Router } from 'express';
import * as centreController from '../controllers/centre.controller';
import { authenticate, requireAdmin } from '../middleware/auth';

const router = Router();

router.post('/', authenticate, requireAdmin, centreController.createCentre);
router.get('/', centreController.listCentres);
router.get('/:id', centreController.getCentre);
router.put('/:id', authenticate, requireAdmin, centreController.updateCentre);
router.delete('/:id', authenticate, requireAdmin, centreController.deleteCentre);

export default router;
