import { Request, Response, NextFunction } from "express";
import { sendError } from "../utils/response";
import { AppError } from "../types";

export const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  console.error("[Error]", err);

  if (err instanceof AppError) {
    sendError(res, err.message, err.error || err.message, err.statusCode);
    return;
  }

  if (err instanceof SyntaxError) {
    sendError(res, "Invalid request", "Bad Request", 400);
    return;
  }

  sendError(
    res,
    "Internal server error",
    err.message || "Unknown error",
    500
  );
};

export const asyncHandler =
  (
    fn: (
      req: Request,
      res: Response,
      next: NextFunction
    ) => Promise<unknown> | unknown
  ) =>
  (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
