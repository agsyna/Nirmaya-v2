import { z } from "zod";

const optionalNumber = z.preprocess((value) => {
  if (value === "" || value === undefined || value === null) return undefined;
  return Number(value);
}, z.number().positive().optional());

export const createVisitSchema = z.object({
  treatmentId: z.string().uuid(),
  visitDate: z.string(),
  notes: z.string().optional().nullable(),
});

export const updateVisitSchema = createVisitSchema.partial();

export const createVisitWithDetailsSchema = createVisitSchema.extend({
  paymentAmount: optionalNumber,
  paymentMode: z.enum(["cash", "upi", "card", "bank"]).optional().nullable(),
  paymentReferenceId: z.string().optional().nullable(),
  paymentNotes: z.string().optional().nullable(),
});
