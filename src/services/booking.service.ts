import prisma from '../config/prisma';
import { AppError } from '../middleware/errorHandler';
import { CreateBookingInput } from '../schemas/booking.schema';
import { PaginationInput } from '../schemas/centre.schema';

export async function createBooking(userId: string, input: CreateBookingInput) {
  const [test, centre] = await Promise.all([
    prisma.diagnosticTest.findUnique({ where: { id: input.test_id } }),
    prisma.centre.findUnique({ where: { id: input.centre_id } }),
  ]);

  if (!test) throw new AppError(404, 'Test not found');
  if (!centre) throw new AppError(404, 'Centre not found');

  const centreTest = await prisma.centreTest.findUnique({
    where: {
      centre_id_test_id: {
        centre_id: input.centre_id,
        test_id: input.test_id,
      },
    },
  });

  if (!centreTest) {
    throw new AppError(400, 'This test is not offered at the selected centre');
  }

  return prisma.booking.create({
    data: {
      user_id: userId,
      test_id: input.test_id,
      centre_id: input.centre_id,
      appointment_datetime: new Date(input.appointment_datetime),
      amount: test.price,
      status: 'PENDING',
    },
    include: {
      test: { select: { id: true, name: true, price: true } },
      centre: { select: { id: true, name: true, location: true } },
    },
  });
}

export async function listBookings(userId: string, pagination: PaginationInput) {
  const { page, limit } = pagination;
  const skip = (page - 1) * limit;

  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where: { user_id: userId },
      skip,
      take: limit,
      orderBy: { created_at: 'desc' },
      include: {
        test: { select: { id: true, name: true, price: true } },
        centre: { select: { id: true, name: true, location: true } },
        payment: true,
      },
    }),
    prisma.booking.count({ where: { user_id: userId } }),
  ]);

  return {
    bookings,
    pagination: { page, limit, total, pages: Math.ceil(total / limit) },
  };
}

export async function getBooking(bookingId: string, userId: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      test: { select: { id: true, name: true, price: true } },
      centre: { select: { id: true, name: true, location: true } },
      payment: true,
    },
  });

  if (!booking) throw new AppError(404, 'Booking not found');
  if (booking.user_id !== userId) throw new AppError(403, 'Access denied');

  return booking;
}

export async function cancelBooking(bookingId: string, userId: string) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });

  if (!booking) throw new AppError(404, 'Booking not found');
  if (booking.user_id !== userId) throw new AppError(403, 'Access denied');

  if (booking.status === 'CANCELLED') {
    throw new AppError(409, 'Booking is already cancelled');
  }

  if (booking.status === 'FAILED') {
    throw new AppError(409, 'Cannot cancel a failed booking');
  }

  // Cancelling a CONFIRMED booking requires a refund flow which is out of scope
  if (booking.status === 'CONFIRMED') {
    throw new AppError(409, 'Cannot cancel a confirmed booking through this endpoint');
  }

  return prisma.booking.update({
    where: { id: bookingId },
    data: { status: 'CANCELLED' },
  });
}
