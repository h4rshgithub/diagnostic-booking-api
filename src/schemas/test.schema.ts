import { z } from 'zod';

export const createTestSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  price: z.number().positive('Price must be positive'),
  centreIds: z.array(z.string().uuid()).optional(),
});

export const updateTestSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  price: z.number().positive().optional(),
  centreIds: z.array(z.string().uuid()).optional(),
}).refine(
  (data) =>
    data.name !== undefined ||
    data.price !== undefined ||
    data.centreIds !== undefined,
  { message: 'At least one field must be provided' },
);

export type CreateTestInput = z.infer<typeof createTestSchema>;
export type UpdateTestInput = z.infer<typeof updateTestSchema>;
