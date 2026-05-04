import { Response } from "express";
import { ApiResponse } from "../types";

export const sendSuccess = <T>(
  res: Response,
  data: T,
  message: string = "Success",
  statusCode: number = 200,
  pagination?: { page: number; limit: number; total: number }
): Response => {
  const response: ApiResponse<T> = {
    success: true,
    message,
    data,
  };
  if (pagination) {
    response.pagination = pagination;
  }
  return res.status(statusCode).json(response);
};

export const sendError = (
  res: Response,
  message: string,
  error: string = "Internal Server Error",
  statusCode: number = 500
): Response => {
  const response: ApiResponse = {
    success: false,
    message,
    error,
  };
  return res.status(statusCode).json(response);
};
