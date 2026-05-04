import { Request, Response } from "express";
import { sendSuccess } from "@/utils/response";
import db from "@/config/db";
import { sql } from "drizzle-orm";

export const getHealth = async (req: Request, res: Response) => {
  try {
    // Test database connection
    const result = await db.execute(sql`SELECT 1 as status`);

    const health = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: {
        connected: !!result,
        status: "connected",
      },
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
    };

    return sendSuccess(res, health, "Health check passed", 200);
  } catch (error) {
    const health = {
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      database: {
        connected: false,
        status: "disconnected",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
    };

    return sendSuccess(res, health, "Health check with issues", 503);
  }
};
