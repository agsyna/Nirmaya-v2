import { z } from "zod";

export const toUtcDateOnly = (value: unknown): string | undefined | null => {
  if (value === "" || value === undefined) return undefined;
  if (value === null) return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return undefined;
    return value.toISOString().slice(0, 10);
  }

  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed.toISOString().slice(0, 10);
};

export const utcDateString = z.preprocess(
  toUtcDateOnly,
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected a valid UTC date")
);

export const optionalUtcDateString = z.preprocess(
  toUtcDateOnly,
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Expected a valid UTC date")
    .optional()
    .nullable()
);

export const utcDateTime = z.preprocess((value) => {
  if (value === "" || value === undefined || value === null) return undefined;
  const parsed = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed;
}, z.date());

export const optionalUtcDateTime = z.preprocess((value) => {
  if (value === "" || value === undefined || value === null) return undefined;
  const parsed = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(parsed.getTime())) return undefined;
  return parsed;
}, z.date().optional().nullable());
