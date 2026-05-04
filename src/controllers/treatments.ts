import { Request, Response } from "express";
import { and, eq, sql, lt } from "drizzle-orm";
import db from "../config/db";
import { treatments } from "../schema/treatments";
import { transactions } from "../schema/transactions";
import { visits } from "../schema/visits";
import { sendSuccess } from "../utils/response";
import { parsePagination } from "../utils/pagination";
import { createAuditLog } from "../services/auditService";
import { enqueueSms } from "../services/smsService";
import { getTreatmentBalance } from "../services/treatmentService";
import { AppError } from "../types";

export const createTreatment = async (req: Request, res: Response) => {
  const clinicId = req.user!.clinicId;
  const [treatment] = await db
    .insert(treatments)
    .values({
      clinicId,
      ...req.body,
    })
    .returning();

  await createAuditLog({
    clinicId,
    entity: "treatment",
    entityId: treatment.id,
    action: "create",
    newData: treatment,
    changedBy: req.user!.id,
  });

  await enqueueSms({
    clinicId,
    patientId: treatment.patientId,
    treatmentId: treatment.id,
    eventType: "treatment_created",
    payload: {
      treatmentTitle: treatment.title,
      totalFee: treatment.totalFee,
    },
  });

  return sendSuccess(res, treatment, "Treatment created", 201);
};

export const listTreatments = async (req: Request, res: Response) => {
  const clinicId = req.user!.clinicId;
  const { page, limit, offset } = parsePagination(req.query);
  const patientId = req.query.patientId as string | undefined;
  const status = req.query.status as string | undefined;
  const filter = req.query.filter as string | undefined;

  let whereClause = and(
    eq(treatments.clinicId, clinicId),
    eq(treatments.isDeleted, false)
  );

  if (patientId) {
    whereClause = and(whereClause, eq(treatments.patientId, patientId));
  }
  if (status) {
    whereClause = and(whereClause, eq(treatments.status, status as any));
  }

  if (filter === "overdue") {
    whereClause = and(
      whereClause,
      lt(treatments.estimatedEndDate, sql`CURRENT_DATE`)
    );
  }

  const baseQuery = db
    .select({
      id: treatments.id,
      title: treatments.title,
      status: treatments.status,
      startDate: treatments.startDate,
      estimatedEndDate: treatments.estimatedEndDate,
      finalFee: treatments.finalFee,
      patientId: treatments.patientId,
      createdAt: treatments.createdAt,
      paidAmount: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
      balance: sql<number>`(${treatments.finalFee} - COALESCE(SUM(${transactions.amount}), 0))`,
    })
    .from(treatments)
    .leftJoin(
      transactions,
      and(
        eq(treatments.id, transactions.treatmentId),
        eq(transactions.isDeleted, false)
      )
    )
    .where(whereClause)
    .groupBy(treatments.id);

  if (filter === "completed") {
    baseQuery.having(sql`(${treatments.finalFee} - COALESCE(SUM(${transactions.amount}), 0)) = 0`);
  }
  if (filter === "pending") {
    baseQuery.having(sql`(${treatments.finalFee} - COALESCE(SUM(${transactions.amount}), 0)) > 0`);
  }
  if (filter === "overdue") {
    baseQuery.having(sql`(${treatments.finalFee} - COALESCE(SUM(${transactions.amount}), 0)) > 0`);
  }

  const data = await baseQuery
    .limit(limit)
    .offset(offset)
    .orderBy(treatments.createdAt);

  const countQuery = db
    .select({ count: sql<number>`count(*)` })
    .from(baseQuery.as("treatments_filtered"));

  const [{ count }] = await countQuery;

  return sendSuccess(res, data, "Treatments fetched", 200, {
    page,
    limit,
    total: Number(count),
  });
};

export const getTreatment = async (req: Request, res: Response) => {
  const clinicId = req.user!.clinicId;
  const treatmentId = req.params.id as string;

  const [treatment] = await db
    .select()
    .from(treatments)
    .where(and(eq(treatments.id, treatmentId), eq(treatments.clinicId, clinicId)))
    .limit(1);

  if (!treatment) {
    throw new AppError(404, "Treatment not found", "Not found");
  }

  const [treatmentVisits, treatmentTransactions, balance] = await Promise.all([
    db
      .select()
      .from(visits)
      .where(and(eq(visits.treatmentId, treatmentId), eq(visits.clinicId, clinicId), eq(visits.isDeleted, false))),
    db
      .select()
      .from(transactions)
      .where(and(eq(transactions.treatmentId, treatmentId), eq(transactions.clinicId, clinicId), eq(transactions.isDeleted, false))),
    getTreatmentBalance({ clinicId, treatmentId }),
  ]);

  return sendSuccess(
    res,
    {
      treatment,
      visits: treatmentVisits,
      transactions: treatmentTransactions,
      balance,
    },
    "Treatment fetched",
    200
  );
};

export const updateTreatment = async (req: Request, res: Response) => {
  const clinicId = req.user!.clinicId;
  const treatmentId = req.params.id as string;

  const [existing] = await db
    .select()
    .from(treatments)
    .where(and(eq(treatments.id, treatmentId), eq(treatments.clinicId, clinicId)))
    .limit(1);

  if (!existing) {
    throw new AppError(404, "Treatment not found", "Not found");
  }

  const [updated] = await db
    .update(treatments)
    .set({
      ...req.body,
      updatedAt: new Date(),
    })
    .where(and(eq(treatments.id, treatmentId), eq(treatments.clinicId, clinicId)))
    .returning();

  await createAuditLog({
    clinicId,
    entity: "treatment",
    entityId: treatmentId,
    action: "update",
    oldData: existing,
    newData: updated,
    changedBy: req.user!.id,
  });

  return sendSuccess(res, updated, "Treatment updated", 200);
};

export const deleteTreatment = async (req: Request, res: Response) => {
  const clinicId = req.user!.clinicId;
  const treatmentId = req.params.id as string;

  const [existing] = await db
    .select()
    .from(treatments)
    .where(and(eq(treatments.id, treatmentId), eq(treatments.clinicId, clinicId)))
    .limit(1);

  if (!existing) {
    throw new AppError(404, "Treatment not found", "Not found");
  }

  const [updated] = await db
    .update(treatments)
    .set({ isDeleted: true, updatedAt: new Date() })
    .where(and(eq(treatments.id, treatmentId), eq(treatments.clinicId, clinicId)))
    .returning();

  await createAuditLog({
    clinicId,
    entity: "treatment",
    entityId: treatmentId,
    action: "delete",
    oldData: existing,
    newData: updated,
    changedBy: req.user!.id,
  });

  return sendSuccess(res, updated, "Treatment deleted", 200);
};
