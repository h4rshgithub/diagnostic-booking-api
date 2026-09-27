import { z } from 'zod';

export const processPaymentSchema = z.object({
  booking_id: z.string().uuid('Invalid booking ID'),
});

export const webhookSchema = z.object({
  event_id: z.string().min(1, 'event_id is required'),
  booking_id: z.string().uuid('Invalid booking ID'),
  payment_status: z.enum(['SUCCESS', 'FAILED']),
});

export type ProcessPaymentInput = z.infer<typeof processPaymentSchema>;
export type WebhookInput = z.infer<typeof webhookSchema>;
