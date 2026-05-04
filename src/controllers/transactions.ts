import { Request, Response } from "express";
import { and, eq, sql, gte, lte } from "drizzle-orm";
import db from "@/config/db";
import { transactions } from "@/schema/transactions";
import { sendSuccess } from "@/utils/response";
import { parsePagination } from "@/utils/pagination";
import { createAuditLog } from "@/services/auditService";
import { enqueueSms } from "@/services/smsService";
import { AppError } from "@/types";

export const createTransaction = async (req: Request, res: Response) => {
  const clinicId = req.user!.clinicId;

  const [transaction] = await db
    .insert(transactions)
    .values({
      clinicId,
      ...req.body,
    })
    .returning();

  await createAuditLog({
    clinicId,
    entity: "transaction",
    entityId: transaction.id,
    action: "create",
    newData: transaction,
    changedBy: req.user!.id,
  });

  await enqueueSms({
    clinicId,
    patientId: transaction.patientId,
    treatmentId: transaction.treatmentId,
    eventType: "payment_added",
    payload: {
      amount: transaction.amount,
      paymentMode: transaction.paymentMode,
    },
  });

  return sendSuccess(res, transaction, "Transaction created", 201);
};

export const listTransactions = async (req: Request, res: Response) => {
  const clinicId = req.user!.clinicId;
  const { page, limit, offset } = parsePagination(req.query);
  const treatmentId = req.query.treatmentId as string | undefined;
  const patientId = req.query.patientId as string | undefined;
  const paymentMode = req.query.paymentMode as string | undefined;
  const dateFrom = req.query.dateFrom as string | undefined;
  const dateTo = req.query.dateTo as string | undefined;
  const month = req.query.month as string | undefined;

  let whereClause = and(eq(transactions.clinicId, clinicId), eq(transactions.isDeleted, false));

  if (treatmentId) {
    whereClause = and(whereClause, eq(transactions.treatmentId, treatmentId));
  }
  if (patientId) {
    whereClause = and(whereClause, eq(transactions.patientId, patientId));
  }
  if (paymentMode) {
    whereClause = and(whereClause, eq(transactions.paymentMode, paymentMode as any));
  }
  if (dateFrom) {
    whereClause = and(whereClause, gte(transactions.createdAt, new Date(dateFrom)));
  }
  if (dateTo) {
    whereClause = and(whereClause, lte(transactions.createdAt, new Date(dateTo)));
  }
  if (month) {
    whereClause = and(
      whereClause,
      sql`DATE_TRUNC('month', ${transactions.createdAt}) = DATE_TRUNC('month', ${month}::date)`
    );
  }

  const data = await db
    .select()
    .from(transactions)
    .where(whereClause)
    .limit(limit)
    .offset(offset)
    .orderBy(transactions.createdAt);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(transactions)
    .where(whereClause);

  return sendSuccess(res, data, "Transactions fetched", 200, {
    page,
    limit,
    total: Number(count),
  });
};

export const updateTransaction = async (req: Request, res: Response) => {
  const clinicId = req.user!.clinicId;
  const transactionId = req.params.id as string;

  const [existing] = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, transactionId), eq(transactions.clinicId, clinicId)))
    .limit(1);

  if (!existing) {
    throw new AppError(404, "Transaction not found", "Not found");
  }

  await db
    .update(transactions)
    .set({ isDeleted: true, updatedAt: new Date() })
    .where(and(eq(transactions.id, transactionId), eq(transactions.clinicId, clinicId)));

  const [newTransaction] = await db
    .insert(transactions)
    .values({
      clinicId,
      treatmentId: existing.treatmentId,
      patientId: existing.patientId,
      visitId: existing.visitId,
      type: existing.type,
      amount: req.body.amount ?? existing.amount,
      paymentMode: req.body.paymentMode ?? existing.paymentMode,
      referenceId: req.body.referenceId ?? existing.referenceId,
      notes: req.body.notes ?? existing.notes,
    })
    .returning();

  await createAuditLog({
    clinicId,
    entity: "transaction",
    entityId: transactionId,
    action: "update",
    oldData: existing,
    newData: newTransaction,
    changedBy: req.user!.id,
  });

  await enqueueSms({
    clinicId,
    patientId: newTransaction.patientId,
    treatmentId: newTransaction.treatmentId,
    eventType: "payment_updated",
    payload: {
      oldAmount: existing.amount,
      newAmount: newTransaction.amount,
    },
  });

  return sendSuccess(
    res,
    { oldTransactionId: transactionId, newTransactionId: newTransaction.id },
    "Transaction updated",
    200
  );
};

export const deleteTransaction = async (req: Request, res: Response) => {
  const clinicId = req.user!.clinicId;
  const transactionId = req.params.id as string;

  const [existing] = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, transactionId), eq(transactions.clinicId, clinicId)))
    .limit(1);

  if (!existing) {
    throw new AppError(404, "Transaction not found", "Not found");
  }

  const [updated] = await db
    .update(transactions)
    .set({ isDeleted: true, updatedAt: new Date() })
    .where(and(eq(transactions.id, transactionId), eq(transactions.clinicId, clinicId)))
    .returning();

  await createAuditLog({
    clinicId,
    entity: "transaction",
    entityId: transactionId,
    action: "delete",
    oldData: existing,
    newData: updated,
    changedBy: req.user!.id,
  });

  return sendSuccess(res, updated, "Transaction deleted", 200);
};
