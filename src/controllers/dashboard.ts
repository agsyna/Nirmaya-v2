import { Request, Response } from "express";
import { and, asc, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import db from "../config/db";
import { bills } from "../schema/bills";
import { documents } from "../schema/documents";
import { followups } from "../schema/followups";
import { installments } from "../schema/installments";
import { patients } from "../schema/patients";
import { transactions } from "../schema/transactions";
import { treatments } from "../schema/treatments";
import { visits } from "../schema/visits";
import { AppError } from "../types";
import { parsePagination } from "../utils/pagination";
import { sendSuccess } from "../utils/response";

const paidAmountExpression = sql<number>`(
  SELECT COALESCE(SUM(${transactions.amount}), 0)
  FROM ${transactions}
  WHERE ${transactions.clinicId} = ${patients.clinicId}
    AND ${transactions.patientId} = ${patients.id}
    AND ${transactions.isDeleted} = false
)`;

const totalFeeExpression = sql<number>`(
  SELECT COALESCE(SUM(${treatments.finalFee}), 0)
  FROM ${treatments}
  WHERE ${treatments.clinicId} = ${patients.clinicId}
    AND ${treatments.patientId} = ${patients.id}
    AND ${treatments.isDeleted} = false
)`;

const balanceExpression = sql<number>`(${totalFeeExpression} - ${paidAmountExpression})`;

const lastVisitExpression = sql<string | null>`(
  SELECT MAX(${visits.visitDate})
  FROM ${visits}
  INNER JOIN ${treatments} ON ${treatments.id} = ${visits.treatmentId}
  WHERE ${visits.clinicId} = ${patients.clinicId}
    AND ${treatments.patientId} = ${patients.id}
    AND ${visits.isDeleted} = false
    AND ${treatments.isDeleted} = false
)`;

export const listDashboardPatients = async (req: Request, res: Response) => {
  const clinicId = req.user!.clinicId;
  const { page, limit, offset } = parsePagination(req.query);
  const search = (req.query.search as string | undefined)?.trim();
  const status = req.query.status as string | undefined;
  const sortBy = (req.query.sortBy as string | undefined) || "createdAt";
  const sortOrder = (req.query.sortOrder as string | undefined) === "asc" ? "asc" : "desc";

  let whereClause = and(eq(patients.clinicId, clinicId), eq(patients.isActive, true));

  if (search) {
    whereClause = and(
      whereClause,
      or(ilike(patients.name, `%${search}%`), ilike(patients.phone, `%${search}%`))
    );
  }

  if (status) {
    whereClause = and(
      whereClause,
      sql`EXISTS (
        SELECT 1
        FROM ${treatments}
        WHERE ${treatments.clinicId} = ${patients.clinicId}
          AND ${treatments.patientId} = ${patients.id}
          AND ${treatments.status} = ${status}
          AND ${treatments.isDeleted} = false
      )`
    );
  }

  const sortExpression =
    sortBy === "name"
      ? patients.name
      : sortBy === "lastVisitDate"
        ? lastVisitExpression
        : sortBy === "balance"
          ? balanceExpression
          : patients.createdAt;

  const data = await db
    .select({
      id: patients.id,
      name: patients.name,
      phone: patients.phone,
      email: patients.email,
      age: patients.age,
      gender: patients.gender,
      hasIdProof: patients.hasIdProof,
      createdAt: patients.createdAt,
      updatedAt: patients.updatedAt,
      treatmentCount: sql<number>`(
        SELECT COUNT(*)
        FROM ${treatments}
        WHERE ${treatments.clinicId} = ${patients.clinicId}
          AND ${treatments.patientId} = ${patients.id}
          AND ${treatments.isDeleted} = false
      )`,
      ongoingTreatmentCount: sql<number>`(
        SELECT COUNT(*)
        FROM ${treatments}
        WHERE ${treatments.clinicId} = ${patients.clinicId}
          AND ${treatments.patientId} = ${patients.id}
          AND ${treatments.status} = 'ongoing'
          AND ${treatments.isDeleted} = false
      )`,
      completedTreatmentCount: sql<number>`(
        SELECT COUNT(*)
        FROM ${treatments}
        WHERE ${treatments.clinicId} = ${patients.clinicId}
          AND ${treatments.patientId} = ${patients.id}
          AND ${treatments.status} = 'completed'
          AND ${treatments.isDeleted} = false
      )`,
      lastVisitDate: lastVisitExpression,
      totalFee: totalFeeExpression,
      paidAmount: paidAmountExpression,
      balance: balanceExpression,
    })
    .from(patients)
    .where(whereClause)
    .orderBy(sortOrder === "asc" ? asc(sortExpression) : desc(sortExpression))
    .limit(limit)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(patients)
    .where(whereClause);

  return sendSuccess(res, data, "Dashboard patients fetched", 200, {
    page,
    limit,
    total: Number(count),
  });
};

export const getDashboardPatient = async (req: Request, res: Response) => {
  const clinicId = req.user!.clinicId;
  const patientId = req.query.id as string | undefined;

  if (!patientId) {
    throw new AppError(400, "Patient id is required", "Missing id query parameter");
  }

  const [patient] = await db
    .select()
    .from(patients)
    .where(and(eq(patients.id, patientId), eq(patients.clinicId, clinicId), eq(patients.isActive, true)))
    .limit(1);

  if (!patient) {
    throw new AppError(404, "Patient not found", "Not found");
  }

  const patientTreatments = await db
    .select()
    .from(treatments)
    .where(
      and(
        eq(treatments.patientId, patientId),
        eq(treatments.clinicId, clinicId),
        eq(treatments.isDeleted, false)
      )
    );

  const treatmentIds = patientTreatments.map((treatment) => treatment.id);

  const [
    patientVisits,
    patientDocuments,
    patientTransactions,
    patientFollowups,
    patientInstallments,
    patientBills,
  ] = await Promise.all([
    treatmentIds.length
      ? db
          .select()
          .from(visits)
          .where(
            and(
              eq(visits.clinicId, clinicId),
              eq(visits.isDeleted, false),
              inArray(visits.treatmentId, treatmentIds)
            )
          )
      : Promise.resolve([]),
    db
      .select()
      .from(documents)
      .where(
        and(
          eq(documents.patientId, patientId),
          eq(documents.clinicId, clinicId),
          eq(documents.isDeleted, false)
        )
      ),
    db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.patientId, patientId),
          eq(transactions.clinicId, clinicId),
          eq(transactions.isDeleted, false)
        )
      ),
    db
      .select()
      .from(followups)
      .where(
        and(
          eq(followups.patientId, patientId),
          eq(followups.clinicId, clinicId),
          eq(followups.isDeleted, false)
        )
      ),
    treatmentIds.length
      ? db
          .select()
          .from(installments)
          .where(
            and(
              eq(installments.clinicId, clinicId),
              eq(installments.isDeleted, false),
              inArray(installments.treatmentId, treatmentIds)
            )
          )
      : Promise.resolve([]),
    db
      .select()
      .from(bills)
      .where(and(eq(bills.patientId, patientId), eq(bills.clinicId, clinicId))),
  ]);

  const treatmentsWithBalance = patientTreatments.map((treatment) => {
    const treatmentTransactions = patientTransactions.filter(
      (transaction) => transaction.treatmentId === treatment.id
    );
    const paidAmount = treatmentTransactions.reduce(
      (sum, transaction) => sum + Number(transaction.amount),
      0
    );
    const finalFee = Number(treatment.finalFee);

    return {
      ...treatment,
      paidAmount,
      balance: finalFee - paidAmount,
      visits: patientVisits.filter((visit) => visit.treatmentId === treatment.id),
      transactions: treatmentTransactions,
      installments: patientInstallments.filter(
        (installment) => installment.treatmentId === treatment.id
      ),
      documents: patientDocuments.filter((document) => document.treatmentId === treatment.id),
      bills: patientBills.filter((bill) => bill.treatmentId === treatment.id),
    };
  });

  return sendSuccess(
    res,
    {
      patient,
      treatments: treatmentsWithBalance,
      visits: patientVisits,
      documents: patientDocuments,
      transactions: patientTransactions,
      followups: patientFollowups,
      installments: patientInstallments,
      bills: patientBills,
    },
    "Dashboard patient fetched",
    200
  );
};
