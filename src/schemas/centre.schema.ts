import { z } from 'zod';

export const createCentreSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  location: z.string().min(1, 'Location is required').max(500),
});

export const updateCentreSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  location: z.string().min(1).max(500).optional(),
}).refine((data) => data.name !== undefined || data.location !== undefined, {
  message: 'At least one field must be provided',
});

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreateCentreInput = z.infer<typeof createCentreSchema>;
export type UpdateCentreInput = z.infer<typeof updateCentreSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
