import { z } from "zod";
import { utcDateString } from "../utils/dateTime";

export const createFollowupSchema = z.object({
  patientId: z.string().uuid(),
  treatmentId: z.string().uuid(),
  scheduledDate: utcDateString,
  status: z.enum(["scheduled", "completed", "missed", "rescheduled"]),
  notes: z.string().optional().nullable(),
});

export const updateFollowupSchema = createFollowupSchema.partial();
