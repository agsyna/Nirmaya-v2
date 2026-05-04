import { z } from "zod";

export const uploadDocumentSchema = z.object({
  patientId: z.string().uuid(),
  treatmentId: z.string().uuid().optional().nullable(),
  visitId: z.string().uuid().optional().nullable(),
  name: z.string().optional().nullable(),
  category: z.enum([
    "prescription",
    "report",
    "cghs",
    "echs",
    "id_proof",
    "other",
  ]),
});
