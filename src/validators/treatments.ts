import { z } from "zod";

export const createTreatmentSchema = z.object({
  patientId: z.string().uuid(),
  title: z.string().min(2),
  status: z.enum(["planned", "ongoing", "paused", "completed", "cancelled"]),
  startDate: z.string(),
  estimatedEndDate: z.string().optional().nullable(),
  actualEndDate: z.string().optional().nullable(),
  totalFee: z.number().min(0),
  discountType: z.enum(["percentage", "fixed_amount"]).optional().nullable(),
  discountValue: z.number().min(0).optional().nullable(),
  finalFee: z.number().min(0),
  notes: z.string().optional().nullable(),
});

export const updateTreatmentSchema = createTreatmentSchema.partial();
