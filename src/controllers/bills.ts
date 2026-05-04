import { Request, Response } from "express";
import PDFDocument from "pdfkit";
import { and, eq } from "drizzle-orm";
import db from "../config/db";
import { bills } from "../schema/bills";
import { treatments } from "../schema/treatments";
import { patients } from "../schema/patients";
import { transactions } from "../schema/transactions";
import { sendSuccess } from "../utils/response";
import { uploadToStorage } from "../services/documentService";
import { createAuditLog } from "../services/auditService";
import { AppError } from "../types";

const buildPdfBuffer = async (data: {
  patient: any;
  treatment: any;
  transactions: any[];
  total: number;
  paid: number;
  balance: number;
}) => {
  const doc = new PDFDocument({ size: "A4", margin: 40 });
  const chunks: Buffer[] = [];

  doc.on("data", (chunk) => chunks.push(chunk as Buffer));

  doc.fontSize(18).text("Clinic Bill", { align: "center" });
  doc.moveDown();
  doc.fontSize(12).text(`Patient: ${data.patient.name}`);
  doc.text(`Phone: ${data.patient.phone}`);
  doc.text(`Treatment: ${data.treatment.title}`);
  doc.text(`Start Date: ${data.treatment.startDate}`);
  doc.moveDown();

  doc.fontSize(12).text("Transactions:");
  data.transactions.forEach((t) => {
    doc.text(`- ${t.createdAt}: INR ${t.amount} (${t.paymentMode || ""})`);
  });

  doc.moveDown();
  doc.text(`Total: INR ${data.total}`);
  doc.text(`Paid: INR ${data.paid}`);
  doc.text(`Balance: INR ${data.balance}`);

  doc.end();

  return new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });
};

export const generateBill = async (req: Request, res: Response) => {
  const clinicId = req.user!.clinicId;
  const treatmentId = req.body.treatmentId;

  const [treatment] = await db
    .select()
    .from(treatments)
    .where(and(eq(treatments.id, treatmentId), eq(treatments.clinicId, clinicId)))
    .limit(1);

  if (!treatment) {
    throw new AppError(404, "Treatment not found", "Not found");
  }

  const [patient] = await db
    .select()
    .from(patients)
    .where(and(eq(patients.id, treatment.patientId), eq(patients.clinicId, clinicId)))
    .limit(1);

  if (!patient) {
    throw new AppError(404, "Patient not found", "Not found");
  }

  const treatmentTransactions = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.treatmentId, treatmentId), eq(transactions.clinicId, clinicId), eq(transactions.isDeleted, false)));

  const paidAmount = treatmentTransactions.reduce(
    (sum, t) => sum + Number(t.amount),
    0
  );
  const totalAmount = Number(treatment.finalFee);
  const balanceAmount = totalAmount - paidAmount;

  const pdfBuffer = await buildPdfBuffer({
    patient,
    treatment,
    transactions: treatmentTransactions,
    total: totalAmount,
    paid: paidAmount,
    balance: balanceAmount,
  });

  const uploaded = await uploadToStorage({
    clinicId,
    patientId: patient.id,
    fileName: `bill-${treatment.id}.pdf`,
    fileBuffer: pdfBuffer,
    contentType: "application/pdf",
    folder: "bills",
  });

  const [bill] = await db
    .insert(bills)
    .values({
      clinicId,
      patientId: patient.id,
      treatmentId: treatment.id,
      billNumber: `BILL-${Date.now()}`,
      pdfUrl: uploaded.publicUrl,
      totalAmount: String(totalAmount),
      paidAmount: String(paidAmount),
      balanceAmount: String(balanceAmount),
    })
    .returning();

  await createAuditLog({
    clinicId,
    entity: "bill",
    entityId: bill.id,
    action: "create",
    newData: bill,
    changedBy: req.user!.id,
  });

  return sendSuccess(res, bill, "Bill generated", 201);
};

export const getBill = async (req: Request, res: Response) => {
  const clinicId = req.user!.clinicId;
  const billId = req.params.id as string;

  const [bill] = await db
    .select()
    .from(bills)
    .where(and(eq(bills.id, billId), eq(bills.clinicId, clinicId)))
    .limit(1);

  if (!bill) {
    throw new AppError(404, "Bill not found", "Not found");
  }

  const billTransactions = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.treatmentId, bill.treatmentId), eq(transactions.clinicId, clinicId), eq(transactions.isDeleted, false)));

  return sendSuccess(
    res,
    { bill, transactions: billTransactions },
    "Bill fetched",
    200
  );
};
