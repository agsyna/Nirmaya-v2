import { z } from "zod";

export const loginSchema = z.object({
  phone: z.string().min(6),
  password: z.string().min(6),
});
