import { z } from "zod";

export const createFollowupSchema = z.object({
  patientId: z.string().uuid(),
  treatmentId: z.string().uuid(),
  scheduledDate: z.string(),
  status: z.enum(["scheduled", "completed", "missed", "rescheduled"]),
  notes: z.string().optional().nullable(),
});

export const updateFollowupSchema = createFollowupSchema.partial();
