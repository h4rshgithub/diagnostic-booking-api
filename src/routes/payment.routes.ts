import { Router } from 'express';
import * as paymentController from '../controllers/payment.controller';
import { authenticate } from '../middleware/auth';
import { paymentRateLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/', authenticate, paymentRateLimiter, paymentController.processPayment);
router.post('/webhook', paymentController.handleWebhook);

export default router;
