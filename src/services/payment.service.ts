import { v4 as uuidv4 } from 'uuid';
import { Prisma } from '@prisma/client';
import prisma from '../config/prisma';
import { AppError } from '../middleware/errorHandler';
import { ProcessPaymentInput, WebhookInput } from '../schemas/payment.schema';

// Simulated payment rule: amount <= 5000 succeeds, > 5000 fails
function determinePaymentStatus(amount: Prisma.Decimal): 'SUCCESS' | 'FAILED' {
  return amount.lessThanOrEqualTo(5000) ? 'SUCCESS' : 'FAILED';
}

export async function processPayment(userId: string, input: ProcessPaymentInput) {
  const booking = await prisma.booking.findUnique({
    where: { id: input.booking_id },
    include: { payment: true },
  });

  if (!booking) throw new AppError(404, 'Booking not found');
  if (booking.user_id !== userId) throw new AppError(403, 'Access denied');

  if (booking.status !== 'PENDING') {
    const statusMessages: Record<string, string> = {
      CONFIRMED: 'Booking has already been paid',
      FAILED: 'Booking payment previously failed',
      CANCELLED: 'Cannot process payment for a cancelled booking',
    };
    throw new AppError(400, statusMessages[booking.status] ?? 'Booking cannot be paid');
  }

  if (booking.payment) {
    throw new AppError(400, 'Payment record already exists for this booking');
  }

  const paymentStatus = determinePaymentStatus(booking.amount);
  const bookingStatus = paymentStatus === 'SUCCESS' ? 'CONFIRMED' : 'FAILED';

  const [payment] = await prisma.$transaction([
    prisma.payment.create({
      data: {
        booking_id: booking.id,
        amount: booking.amount,
        status: paymentStatus,
        transaction_id: uuidv4(),
      },
    }),
    prisma.booking.update({
      where: { id: booking.id },
      data: { status: bookingStatus },
    }),
  ]);

  return { payment, booking_status: bookingStatus };
}

export async function processWebhook(input: WebhookInput) {
  const booking = await prisma.booking.findUnique({
    where: { id: input.booking_id },
  });

  if (!booking) throw new AppError(404, 'Booking not found');

  const paymentStatus = input.payment_status;
  const bookingStatus = paymentStatus === 'SUCCESS' ? 'CONFIRMED' : 'FAILED';

  /*
   * Idempotency: we insert the event_id inside the same transaction as the
   * booking/payment update. The UNIQUE constraint on event_id means concurrent
   * duplicate requests will have one succeed and the rest get a unique violation.
   * We catch that violation and return 200 to signal the event was already processed,
   * rather than doing a check-then-insert which would have a TOCTOU race.
   */
  try {
    await prisma.$transaction(async (tx) => {
      await tx.processedWebhookEvent.create({
        data: { event_id: input.event_id },
      });

      const existingPayment = await tx.payment.findUnique({
        where: { booking_id: input.booking_id },
      });

      if (!existingPayment) {
        await tx.payment.create({
          data: {
            booking_id: booking.id,
            amount: booking.amount,
            status: paymentStatus,
            transaction_id: uuidv4(),
          },
        });
      }

      await tx.booking.update({
        where: { id: booking.id },
        data: { status: bookingStatus },
      });
    });

    return { processed: true };
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002' &&
      (
        err.meta?.modelName === 'ProcessedWebhookEvent' ||
        (err.meta?.target as string[])?.includes('event_id') ||
        JSON.stringify(err.meta ?? '').includes('event_id')
      )
    ) {
      // Event was already processed - idempotent success
      return { processed: false };
    }
    throw err;
  }
}
