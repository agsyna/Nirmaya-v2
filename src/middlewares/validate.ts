import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";
import { AppError } from "../types";

export const validateBody = (schema: ZodSchema) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return next(
        new AppError(400, "Validation failed", result.error.message)
      );
    }
    req.body = result.data;
    return next();
  };

export const validateQuery = (schema: ZodSchema) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return next(
        new AppError(400, "Validation failed", result.error.message)
      );
    }
    req.query = result.data;
    return next();
  };
