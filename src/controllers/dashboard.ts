import { Request, Response } from "express";
import { and, desc, eq, gte, ilike, inArray, lt, or, sql } from "drizzle-orm";
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

const getTodayRange = () => {
  const now = new Date();
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const date = start.toISOString().slice(0, 10);
  return { start, end, date };
};

export const getDashboardSummary = async (req: Request, res: Response) => {
  const clinicId = req.user!.clinicId;
  const { start, end, date } = getTodayRange();

  const [
    [{ totalPatients }],
    [{ activeTreatments }],
    [{ todaysFollowups }],
    [{ todaysCollection }],
    recentPatients,
  ] = await Promise.all([
    db
      .select({ totalPatients: sql<number>`count(*)` })
      .from(patients)
      .where(and(eq(patients.clinicId, clinicId), eq(patients.isActive, true))),
    db
      .select({ activeTreatments: sql<number>`count(*)` })
      .from(treatments)
      .where(
        and(
          eq(treatments.clinicId, clinicId),
          eq(treatments.isDeleted, false),
          eq(treatments.status, "ongoing")
        )
      ),
    db
      .select({ todaysFollowups: sql<number>`count(*)` })
      .from(followups)
      .where(
        and(
          eq(followups.clinicId, clinicId),
          eq(followups.isDeleted, false),
          eq(followups.status, "scheduled"),
          eq(followups.scheduledDate, date)
        )
      ),
    db
      .select({
        todaysCollection: sql<string>`COALESCE(SUM(${transactions.amount}), 0)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.clinicId, clinicId),
          eq(transactions.isDeleted, false),
          eq(transactions.type, "payment"),
          gte(transactions.createdAt, start),
          lt(transactions.createdAt, end)
        )
      ),
    db
      .select()
      .from(patients)
      .where(and(eq(patients.clinicId, clinicId), eq(patients.isActive, true)))
      .orderBy(desc(patients.createdAt))
      .limit(3),
  ]);

  return sendSuccess(
    res,
    {
      totalPatients: Number(totalPatients),
      activeTreatments: Number(activeTreatments),
      todaysFollowups: Number(todaysFollowups),
      todaysCollection: Number(todaysCollection),
      recentPatients,
    },
    "Dashboard summary fetched",
    200
  );
};

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

  const clinicPatients = await db
    .select()
    .from(patients)
    .where(whereClause);

  const patientIds = clinicPatients.map((patient) => patient.id);
  const [clinicTreatments, clinicTransactions, clinicVisits] = await Promise.all([
    patientIds.length
      ? db
          .select()
          .from(treatments)
          .where(
            and(
              eq(treatments.clinicId, clinicId),
              eq(treatments.isDeleted, false),
              inArray(treatments.patientId, patientIds)
            )
          )
      : Promise.resolve([]),
    patientIds.length
      ? db
          .select()
          .from(transactions)
          .where(
            and(
              eq(transactions.clinicId, clinicId),
              eq(transactions.isDeleted, false),
              inArray(transactions.patientId, patientIds)
            )
          )
      : Promise.resolve([]),
    db
      .select()
      .from(visits)
      .where(and(eq(visits.clinicId, clinicId), eq(visits.isDeleted, false))),
  ]);

  const rows = clinicPatients
    .map((patient) => {
      const patientTreatments = clinicTreatments.filter(
        (treatment) => treatment.patientId === patient.id
      );

      if (status && !patientTreatments.some((treatment) => treatment.status === status)) {
        return null;
      }

      const treatmentIds = new Set(patientTreatments.map((treatment) => treatment.id));
      const patientTransactions = clinicTransactions.filter(
        (transaction) => transaction.patientId === patient.id
      );
      const patientVisits = clinicVisits.filter((visit) => treatmentIds.has(visit.treatmentId));
      const lastVisitDate =
        patientVisits
          .map((visit) => visit.visitDate)
          .sort()
          .at(-1) ?? null;
      const totalFee = patientTreatments.reduce(
        (sum, treatment) => sum + Number(treatment.finalFee),
        0
      );
      const paidAmount = patientTransactions.reduce(
        (sum, transaction) => sum + Number(transaction.amount),
        0
      );

      return {
        id: patient.id,
        name: patient.name,
        phone: patient.phone,
        email: patient.email,
        age: patient.age,
        gender: patient.gender,
        hasIdProof: patient.hasIdProof,
        createdAt: patient.createdAt,
        updatedAt: patient.updatedAt,
        treatmentCount: patientTreatments.length,
        ongoingTreatmentCount: patientTreatments.filter(
          (treatment) => treatment.status === "ongoing"
        ).length,
        completedTreatmentCount: patientTreatments.filter(
          (treatment) => treatment.status === "completed"
        ).length,
        lastVisitDate,
        totalFee,
        paidAmount,
        balance: totalFee - paidAmount,
      };
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  rows.sort((a, b) => {
    const direction = sortOrder === "asc" ? 1 : -1;
    if (sortBy === "name") {
      return a.name.localeCompare(b.name) * direction;
    }
    if (sortBy === "lastVisitDate") {
      return String(a.lastVisitDate ?? "").localeCompare(String(b.lastVisitDate ?? "")) * direction;
    }
    if (sortBy === "balance") {
      return (a.balance - b.balance) * direction;
    }
    return (a.createdAt.getTime() - b.createdAt.getTime()) * direction;
  });

  const data = rows.slice(offset, offset + limit);

  return sendSuccess(res, data, "Dashboard patients fetched", 200, {
    page,
    limit,
    total: rows.length,
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
