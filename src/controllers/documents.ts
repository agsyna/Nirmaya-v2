import { Request, Response } from "express";
import { and, eq, sql } from "drizzle-orm";
import db from "@/config/db";
import { documents } from "@/schema/documents";
import { treatments } from "@/schema/treatments";
import { visits } from "@/schema/visits";
import { patients } from "@/schema/patients";
import { sendSuccess } from "@/utils/response";
import { parsePagination } from "@/utils/pagination";
import { createAuditLog } from "@/services/auditService";
import { enqueueSms } from "@/services/smsService";
import { uploadToStorage } from "@/services/documentService";
import { AppError } from "@/types";

export const uploadDocument = async (req: Request, res: Response) => {
  const clinicId = req.user!.clinicId;
  const file = req.file;

  if (!file) {
    throw new AppError(400, "File is required", "Missing file");
  }

  const { patientId, treatmentId, visitId, category } = req.body;
  const folder = category || "other";

  const uploaded = await uploadToStorage({
    clinicId,
    patientId,
    fileName: file.originalname,
    fileBuffer: file.buffer,
    contentType: file.mimetype,
    folder,
  });

  const [document] = await db
    .insert(documents)
    .values({
      clinicId,
      patientId,
      treatmentId: treatmentId || null,
      visitId: visitId || null,
      category,
      fileUrl: uploaded.publicUrl,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype,
      uploadedBy: req.user!.id,
    })
    .returning();

  await createAuditLog({
    clinicId,
    entity: "document",
    entityId: document.id,
    action: "create",
    newData: document,
    changedBy: req.user!.id,
  });

  if (category === "prescription") {
    let patientIdForSms = patientId;
    let patientName: string | undefined;
    if (!patientIdForSms && visitId) {
      const [visit] = await db
        .select()
        .from(visits)
        .where(and(eq(visits.id, visitId), eq(visits.clinicId, clinicId)))
        .limit(1);
      if (visit) {
        const [treatment] = await db
          .select()
          .from(treatments)
          .where(and(eq(treatments.id, visit.treatmentId), eq(treatments.clinicId, clinicId)))
          .limit(1);
        if (treatment) {
          patientIdForSms = treatment.patientId;
        }
      }
    }

    if (patientIdForSms) {
      const [patient] = await db
        .select({ name: patients.name })
        .from(patients)
        .where(and(eq(patients.id, patientIdForSms), eq(patients.clinicId, clinicId)))
        .limit(1);
      patientName = patient?.name;
    }

    await enqueueSms({
      clinicId,
      patientId: patientIdForSms,
      eventType: "prescription_uploaded",
      payload: {
        patientId: patientIdForSms,
        patientName,
        documentName: file.originalname,
      },
    });
  }

  return sendSuccess(res, document, "Document uploaded", 201);
};

export const listDocuments = async (req: Request, res: Response) => {
  const clinicId = req.user!.clinicId;
  const { page, limit, offset } = parsePagination(req.query);
  const patientId = req.query.patientId as string | undefined;
  const treatmentId = req.query.treatmentId as string | undefined;
  const category = req.query.category as string | undefined;

  let whereClause = and(eq(documents.clinicId, clinicId), eq(documents.isDeleted, false));
  if (patientId) {
    whereClause = and(whereClause, eq(documents.patientId, patientId));
  }
  if (treatmentId) {
    whereClause = and(whereClause, eq(documents.treatmentId, treatmentId));
  }
  if (category) {
    whereClause = and(whereClause, eq(documents.category, category as any));
  }

  const data = await db
    .select()
    .from(documents)
    .where(whereClause)
    .limit(limit)
    .offset(offset)
    .orderBy(documents.createdAt);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(documents)
    .where(whereClause);

  return sendSuccess(res, data, "Documents fetched", 200, {
    page,
    limit,
    total: Number(count),
  });
};

export const deleteDocument = async (req: Request, res: Response) => {
  const clinicId = req.user!.clinicId;
  const documentId = req.params.id as string;

  const [existing] = await db
    .select()
    .from(documents)
    .where(and(eq(documents.id, documentId), eq(documents.clinicId, clinicId)))
    .limit(1);

  if (!existing) {
    throw new AppError(404, "Document not found", "Not found");
  }

  const [updated] = await db
    .update(documents)
    .set({ isDeleted: true, updatedAt: new Date() })
    .where(and(eq(documents.id, documentId), eq(documents.clinicId, clinicId)))
    .returning();

  await createAuditLog({
    clinicId,
    entity: "document",
    entityId: documentId,
    action: "delete",
    oldData: existing,
    newData: updated,
    changedBy: req.user!.id,
  });

  return sendSuccess(res, updated, "Document deleted", 200);
};
