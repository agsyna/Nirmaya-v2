import { z } from "zod";
import { optionalUtcDateString, utcDateString } from "../utils/dateTime";

export const createInstallmentSchema = z.object({
  treatmentId: z.string().uuid(),
  planName: z.string().min(2),
  totalInstallments: z.number().int().min(1),
  installmentAmount: z.number().min(0),
  dueDate: utcDateString,
});

export const updateInstallmentSchema = z.object({
  status: z.enum(["pending", "paid", "overdue"]).optional(),
  dueDate: optionalUtcDateString,
  paidDate: optionalUtcDateString,
});
