import { z } from "zod";

export const createInstallmentSchema = z.object({
  treatmentId: z.string().uuid(),
  planName: z.string().min(2),
  totalInstallments: z.number().int().min(1),
  installmentAmount: z.number().min(0),
  dueDate: z.string(),
});

export const updateInstallmentSchema = z.object({
  status: z.enum(["pending", "paid", "overdue"]).optional(),
  dueDate: z.string().optional(),
  paidDate: z.string().optional().nullable(),
});
