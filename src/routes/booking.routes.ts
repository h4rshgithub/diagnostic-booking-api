import { Router } from 'express';
import * as bookingController from '../controllers/booking.controller';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/', authenticate, bookingController.createBooking);
router.get('/', authenticate, bookingController.listBookings);
router.get('/:id', authenticate, bookingController.getBooking);
router.post('/:id/cancel', authenticate, bookingController.cancelBooking);

export default router;
