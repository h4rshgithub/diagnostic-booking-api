import { Request, Response, NextFunction } from 'express';
import { createBookingSchema } from '../schemas/booking.schema';
import { paginationSchema } from '../schemas/centre.schema';
import * as bookingService from '../services/booking.service';
import { success } from '../utils/response';

export async function createBooking(req: Request, res: Response, next: NextFunction) {
  try {
    const input = createBookingSchema.parse(req.body);
    const booking = await bookingService.createBooking(req.user!.userId, input);
    success(res, booking, 201);
  } catch (err) {
    next(err);
  }
}

export async function listBookings(req: Request, res: Response, next: NextFunction) {
  try {
    const pagination = paginationSchema.parse(req.query);
    const result = await bookingService.listBookings(req.user!.userId, pagination);
    success(res, result);
  } catch (err) {
    next(err);
  }
}

export async function getBooking(req: Request, res: Response, next: NextFunction) {
  try {
    const booking = await bookingService.getBooking(req.params.id as string, req.user!.userId);
    success(res, booking);
  } catch (err) {
    next(err);
  }
}

export async function cancelBooking(req: Request, res: Response, next: NextFunction) {
  try {
    const booking = await bookingService.cancelBooking(req.params.id as string, req.user!.userId);
    success(res, booking);
  } catch (err) {
    next(err);
  }
}
