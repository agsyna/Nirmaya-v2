import { Request, Response } from "express";
import { and, eq, gte, lte, sql } from "drizzle-orm";
import db from "@/config/db";
import { auditLogs } from "@/schema/auditLogs";
import { sendSuccess } from "@/utils/response";
import { parsePagination } from "@/utils/pagination";

export const listAuditLogs = async (req: Request, res: Response) => {
  const clinicId = req.user!.clinicId;
  const { page, limit, offset } = parsePagination(req.query);
  const entity = req.query.entity as string | undefined;
  const entityId = req.query.entityId as string | undefined;
  const action = req.query.action as string | undefined;
  const dateFrom = req.query.dateFrom as string | undefined;
  const dateTo = req.query.dateTo as string | undefined;

  let whereClause = and(eq(auditLogs.clinicId, clinicId));

  if (entity) {
    whereClause = and(whereClause, eq(auditLogs.entity, entity as any));
  }
  if (entityId) {
    whereClause = and(whereClause, eq(auditLogs.entityId, entityId));
  }
  if (action) {
    whereClause = and(whereClause, eq(auditLogs.action, action as any));
  }
  if (dateFrom) {
    whereClause = and(whereClause, gte(auditLogs.timestamp, new Date(dateFrom)));
  }
  if (dateTo) {
    whereClause = and(whereClause, lte(auditLogs.timestamp, new Date(dateTo)));
  }

  const data = await db
    .select()
    .from(auditLogs)
    .where(whereClause)
    .limit(limit)
    .offset(offset)
    .orderBy(auditLogs.timestamp);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(auditLogs)
    .where(whereClause);

  return sendSuccess(res, data, "Audit logs fetched", 200, {
    page,
    limit,
    total: Number(count),
  });
};
