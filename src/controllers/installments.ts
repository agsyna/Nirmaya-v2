import { Request, Response } from "express";
import { and, eq, sql } from "drizzle-orm";
import db from "@/config/db";
import { installments } from "@/schema/installments";
import { sendSuccess } from "@/utils/response";
import { parsePagination } from "@/utils/pagination";
import { createAuditLog } from "@/services/auditService";
import { AppError } from "@/types";

export const createInstallment = async (req: Request, res: Response) => {
  const clinicId = req.user!.clinicId;
  const [installment] = await db
    .insert(installments)
    .values({ clinicId, ...req.body })
    .returning();

  await createAuditLog({
    clinicId,
    entity: "installment",
    entityId: installment.id,
    action: "create",
    newData: installment,
    changedBy: req.user!.id,
  });

  return sendSuccess(res, installment, "Installment created", 201);
};

export const listInstallments = async (req: Request, res: Response) => {
  const clinicId = req.user!.clinicId;
  const { page, limit, offset } = parsePagination(req.query);
  const treatmentId = req.query.treatmentId as string | undefined;
  const status = req.query.status as string | undefined;

  let whereClause = and(eq(installments.clinicId, clinicId), eq(installments.isDeleted, false));

  if (treatmentId) {
    whereClause = and(whereClause, eq(installments.treatmentId, treatmentId));
  }
  if (status) {
    whereClause = and(whereClause, eq(installments.status, status as any));
  }

  const data = await db
    .select()
    .from(installments)
    .where(whereClause)
    .limit(limit)
    .offset(offset)
    .orderBy(installments.dueDate);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(installments)
    .where(whereClause);

  return sendSuccess(res, data, "Installments fetched", 200, {
    page,
    limit,
    total: Number(count),
  });
};

export const updateInstallment = async (req: Request, res: Response) => {
  const clinicId = req.user!.clinicId;
  const installmentId = req.params.id;

  const [existing] = await db
    .select()
    .from(installments)
    .where(and(eq(installments.id, installmentId), eq(installments.clinicId, clinicId)))
    .limit(1);

  if (!existing) {
    throw new AppError(404, "Installment not found", "Not found");
  }

  const [updated] = await db
    .update(installments)
    .set({ ...req.body, updatedAt: new Date() })
    .where(and(eq(installments.id, installmentId), eq(installments.clinicId, clinicId)))
    .returning();

  await createAuditLog({
    clinicId,
    entity: "installment",
    entityId: installmentId,
    action: "update",
    oldData: existing,
    newData: updated,
    changedBy: req.user!.id,
  });

  return sendSuccess(res, updated, "Installment updated", 200);
};
