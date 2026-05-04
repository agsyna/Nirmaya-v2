import { z } from "zod";

export const createPatientSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(6),
  email: z.string().email().optional().nullable(),
  age: z.number().int().min(0).optional().nullable(),
  gender: z.enum(["male", "female", "other"]).optional().nullable(),
  heightCm: z.number().min(0).optional().nullable(),
  weightKg: z.number().min(0).optional().nullable(),
  bloodGroup: z.string().optional().nullable(),
  hasIdProof: z.boolean().optional(),
});

export const updatePatientSchema = createPatientSchema.partial();
