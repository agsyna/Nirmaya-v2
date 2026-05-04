import { z } from "zod";

export const paginationQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
});
