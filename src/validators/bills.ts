import { z } from "zod";

export const generateBillSchema = z.object({
  treatmentId: z.string().uuid(),
});
