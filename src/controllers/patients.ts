import { Request, Response } from "express";
import { and, eq, ilike, or, sql, inArray } from "drizzle-orm";
import db from "@/config/db";
import { patients } from "@/schema/patients";
import { treatments } from "@/schema/treatments";
import { visits } from "@/schema/visits";
import { documents } from "@/schema/documents";
import { transactions } from "@/schema/transactions";
import { followups } from "@/schema/followups";
import { sendSuccess } from "@/utils/response";
import { parsePagination } from "@/utils/pagination";
import { createAuditLog } from "@/services/auditService";
import { enqueueSms } from "@/services/smsService";
import { AppError } from "@/types";

export const createPatient = async (req: Request, res: Response) => {
  const clinicId = req.user!.clinicId;
  const [patient] = await db
    .insert(patients)
    .values({
      clinicId,
      ...req.body,
    })
    .returning();

  await createAuditLog({
    clinicId,
    entity: "patient",
    entityId: patient.id,
    action: "create",
    newData: patient,
    changedBy: req.user!.id,
  });

  await enqueueSms({
    clinicId,
    patientId: patient.id,
    eventType: "patient_created",
    payload: { patientName: patient.name, phone: patient.phone },
  });

  return sendSuccess(res, patient, "Patient created", 201);
};

export const listPatients = async (req: Request, res: Response) => {
  const clinicId = req.user!.clinicId;
  const { page, limit, offset } = parsePagination(req.query);
  const search = (req.query.search as string) || "";

  const whereClause = search
    ? and(
        eq(patients.clinicId, clinicId),
        eq(patients.isActive, true),
        or(
          ilike(patients.phone, `%${search}%`),
          ilike(patients.name, `%${search}%`)
        )
      )
    : and(eq(patients.clinicId, clinicId), eq(patients.isActive, true));

  const data = await db
    .select()
    .from(patients)
    .where(whereClause)
    .limit(limit)
    .offset(offset)
    .orderBy(patients.createdAt);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(patients)
    .where(whereClause);

  return sendSuccess(res, data, "Patients fetched", 200, {
    page,
    limit,
    total: Number(count),
  });
};

export const getPatient = async (req: Request, res: Response) => {
  const clinicId = req.user!.clinicId;
  const patientId = req.params.id;

  const [patient] = await db
    .select()
    .from(patients)
    .where(and(eq(patients.id, patientId), eq(patients.clinicId, clinicId)))
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

  const treatmentIds = patientTreatments.map((t) => t.id);

  const [patientVisits, patientDocuments, patientTransactions, patientFollowups] =
    await Promise.all([
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
    ]);

  return sendSuccess(
    res,
    {
      patient,
      treatments: patientTreatments,
      visits: patientVisits,
      documents: patientDocuments,
      transactions: patientTransactions,
      followups: patientFollowups,
    },
    "Patient fetched",
    200
  );
};

export const updatePatient = async (req: Request, res: Response) => {
  const clinicId = req.user!.clinicId;
  const patientId = req.params.id;

  const [existing] = await db
    .select()
    .from(patients)
    .where(and(eq(patients.id, patientId), eq(patients.clinicId, clinicId)))
    .limit(1);

  if (!existing) {
    throw new AppError(404, "Patient not found", "Not found");
  }

  const [updated] = await db
    .update(patients)
    .set({
      ...req.body,
      updatedAt: new Date(),
    })
    .where(and(eq(patients.id, patientId), eq(patients.clinicId, clinicId)))
    .returning();

  await createAuditLog({
    clinicId,
    entity: "patient",
    entityId: patientId,
    action: "update",
    oldData: existing,
    newData: updated,
    changedBy: req.user!.id,
  });

  return sendSuccess(res, updated, "Patient updated", 200);
};

export const deletePatient = async (req: Request, res: Response) => {
  const clinicId = req.user!.clinicId;
  const patientId = req.params.id;

  const [existing] = await db
    .select()
    .from(patients)
    .where(and(eq(patients.id, patientId), eq(patients.clinicId, clinicId)))
    .limit(1);

  if (!existing) {
    throw new AppError(404, "Patient not found", "Not found");
  }

  const [updated] = await db
    .update(patients)
    .set({ isActive: false, updatedAt: new Date() })
    .where(and(eq(patients.id, patientId), eq(patients.clinicId, clinicId)))
    .returning();

  await createAuditLog({
    clinicId,
    entity: "patient",
    entityId: patientId,
    action: "delete",
    oldData: existing,
    newData: updated,
    changedBy: req.user!.id,
  });

  return sendSuccess(res, updated, "Patient deactivated", 200);
};
