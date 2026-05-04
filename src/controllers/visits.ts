import { Request, Response } from "express";
import { and, eq, sql, gte, lte } from "drizzle-orm";
import db from "@/config/db";
import { visits } from "@/schema/visits";
import { treatments } from "@/schema/treatments";
import { sendSuccess } from "@/utils/response";
import { parsePagination } from "@/utils/pagination";
import { createAuditLog } from "@/services/auditService";
import { enqueueSms } from "@/services/smsService";
import { AppError } from "@/types";

export const createVisit = async (req: Request, res: Response) => {
  const clinicId = req.user!.clinicId;

  const [visit] = await db
    .insert(visits)
    .values({
      clinicId,
      ...req.body,
    })
    .returning();

  await createAuditLog({
    clinicId,
    entity: "visit",
    entityId: visit.id,
    action: "create",
    newData: visit,
    changedBy: req.user!.id,
  });

  const [treatment] = await db
    .select()
    .from(treatments)
    .where(and(eq(treatments.id, visit.treatmentId), eq(treatments.clinicId, clinicId)))
    .limit(1);

  if (treatment) {
    await enqueueSms({
      clinicId,
      patientId: treatment.patientId,
      eventType: "visit_added",
      payload: {
        visitDate: visit.visitDate,
        treatmentTitle: treatment.title,
      },
    });
  }

  return sendSuccess(res, visit, "Visit created", 201);
};

export const listVisits = async (req: Request, res: Response) => {
  const clinicId = req.user!.clinicId;
  const { page, limit, offset } = parsePagination(req.query);
  const treatmentId = req.query.treatmentId as string | undefined;
  const dateFrom = req.query.dateFrom as string | undefined;
  const dateTo = req.query.dateTo as string | undefined;

  let whereClause = and(eq(visits.clinicId, clinicId), eq(visits.isDeleted, false));

  if (treatmentId) {
    whereClause = and(whereClause, eq(visits.treatmentId, treatmentId));
  }
  if (dateFrom) {
    whereClause = and(whereClause, gte(visits.visitDate, dateFrom));
  }
  if (dateTo) {
    whereClause = and(whereClause, lte(visits.visitDate, dateTo));
  }

  const data = await db
    .select()
    .from(visits)
    .where(whereClause)
    .limit(limit)
    .offset(offset)
    .orderBy(visits.visitDate);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(visits)
    .where(whereClause);

  return sendSuccess(res, data, "Visits fetched", 200, {
    page,
    limit,
    total: Number(count),
  });
};

export const updateVisit = async (req: Request, res: Response) => {
  const clinicId = req.user!.clinicId;
  const visitId = req.params.id as string;

  const [existing] = await db
    .select()
    .from(visits)
    .where(and(eq(visits.id, visitId), eq(visits.clinicId, clinicId)))
    .limit(1);

  if (!existing) {
    throw new AppError(404, "Visit not found", "Not found");
  }

  const [updated] = await db
    .update(visits)
    .set({
      ...req.body,
      updatedAt: new Date(),
    })
    .where(and(eq(visits.id, visitId), eq(visits.clinicId, clinicId)))
    .returning();

  await createAuditLog({
    clinicId,
    entity: "visit",
    entityId: visitId,
    action: "update",
    oldData: existing,
    newData: updated,
    changedBy: req.user!.id,
  });

  return sendSuccess(res, updated, "Visit updated", 200);
};

export const deleteVisit = async (req: Request, res: Response) => {
  const clinicId = req.user!.clinicId;
  const visitId = req.params.id as string;

  const [existing] = await db
    .select()
    .from(visits)
    .where(and(eq(visits.id, visitId), eq(visits.clinicId, clinicId)))
    .limit(1);

  if (!existing) {
    throw new AppError(404, "Visit not found", "Not found");
  }

  const [updated] = await db
    .update(visits)
    .set({ isDeleted: true, updatedAt: new Date() })
    .where(and(eq(visits.id, visitId), eq(visits.clinicId, clinicId)))
    .returning();

  await createAuditLog({
    clinicId,
    entity: "visit",
    entityId: visitId,
    action: "delete",
    oldData: existing,
    newData: updated,
    changedBy: req.user!.id,
  });

  return sendSuccess(res, updated, "Visit deleted", 200);
};
