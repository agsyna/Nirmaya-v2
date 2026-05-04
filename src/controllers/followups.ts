import { Request, Response } from "express";
import { and, eq, sql } from "drizzle-orm";
import db from "../config/db";
import { followups } from "../schema/followups";
import { sendSuccess } from "../utils/response";
import { parsePagination } from "../utils/pagination";
import { createAuditLog } from "../services/auditService";
import { enqueueSms } from "../services/smsService";
import { AppError } from "../types";

export const createFollowup = async (req: Request, res: Response) => {
  const clinicId = req.user!.clinicId;

  const [followup] = await db
    .insert(followups)
    .values({ clinicId, ...req.body })
    .returning();

  await createAuditLog({
    clinicId,
    entity: "followup",
    entityId: followup.id,
    action: "create",
    newData: followup,
    changedBy: req.user!.id,
  });

  await enqueueSms({
    clinicId,
    patientId: followup.patientId,
    eventType: "followup_created",
    payload: { scheduledDate: followup.scheduledDate },
  });

  return sendSuccess(res, followup, "Follow-up created", 201);
};

export const listFollowups = async (req: Request, res: Response) => {
  const clinicId = req.user!.clinicId;
  const { page, limit, offset } = parsePagination(req.query);
  const patientId = req.query.patientId as string | undefined;
  const treatmentId = req.query.treatmentId as string | undefined;
  const status = req.query.status as string | undefined;

  let whereClause = and(eq(followups.clinicId, clinicId), eq(followups.isDeleted, false));

  if (patientId) {
    whereClause = and(whereClause, eq(followups.patientId, patientId));
  }
  if (treatmentId) {
    whereClause = and(whereClause, eq(followups.treatmentId, treatmentId));
  }
  if (status) {
    whereClause = and(whereClause, eq(followups.status, status as any));
  }

  const data = await db
    .select()
    .from(followups)
    .where(whereClause)
    .limit(limit)
    .offset(offset)
    .orderBy(followups.scheduledDate);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(followups)
    .where(whereClause);

  return sendSuccess(res, data, "Follow-ups fetched", 200, {
    page,
    limit,
    total: Number(count),
  });
};

export const updateFollowup = async (req: Request, res: Response) => {
  const clinicId = req.user!.clinicId;
  const followupId = req.params.id as string;

  const [existing] = await db
    .select()
    .from(followups)
    .where(and(eq(followups.id, followupId), eq(followups.clinicId, clinicId)))
    .limit(1);

  if (!existing) {
    throw new AppError(404, "Follow-up not found", "Not found");
  }

  const [updated] = await db
    .update(followups)
    .set({ ...req.body, updatedAt: new Date() })
    .where(and(eq(followups.id, followupId), eq(followups.clinicId, clinicId)))
    .returning();

  await createAuditLog({
    clinicId,
    entity: "followup",
    entityId: followupId,
    action: "update",
    oldData: existing,
    newData: updated,
    changedBy: req.user!.id,
  });

  return sendSuccess(res, updated, "Follow-up updated", 200);
};
