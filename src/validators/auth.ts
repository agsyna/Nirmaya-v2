import { z } from "zod";
import { phone10 } from "../validators/patients";

export const loginSchema = z.object({
  phone: phone10,
  password: z.string().min(6),
});
