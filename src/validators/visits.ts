import { z } from "zod";

export const createVisitSchema = z.object({
  treatmentId: z.string().uuid(),
  visitDate: z.string(),
  notes: z.string().optional().nullable(),
});

export const updateVisitSchema = createVisitSchema.partial();
