import { z } from 'zod';

export const createBookingSchema = z.object({
  test_id: z.string().uuid('Invalid test ID'),
  centre_id: z.string().uuid('Invalid centre ID'),
  appointment_datetime: z
    .string()
    .datetime({ message: 'appointment_datetime must be a valid ISO 8601 datetime' })
    .refine(
      (val) => new Date(val) > new Date(),
      { message: 'appointment_datetime must be in the future' },
    ),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
