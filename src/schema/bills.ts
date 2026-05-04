import {
  pgTable,
  uuid,
  varchar,
  numeric,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { clinics } from "../schema/clinics";
import { patients } from "../schema/patients";
import { treatments } from "../schema/treatments";

export const bills = pgTable(
  "bills",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    treatmentId: uuid("treatment_id")
      .notNull()
      .references(() => treatments.id),
    billNumber: varchar("bill_number", { length: 50 }).notNull(),
    pdfUrl: varchar("pdf_url", { length: 500 }).notNull(),
    totalAmount: numeric("total_amount", { precision: 12, scale: 2 }).notNull(),
    paidAmount: numeric("paid_amount", { precision: 12, scale: 2 }).notNull(),
    balanceAmount: numeric("balance_amount", { precision: 12, scale: 2 }).notNull(),
    generatedAt: timestamp("generated_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    clinicBillIdx: index("bills_clinic_bill_idx").on(
      table.clinicId,
      table.billNumber
    ),
    clinicPatientIdx: index("bills_clinic_patient_idx").on(
      table.clinicId,
      table.patientId
    ),
    clinicGeneratedIdx: index("bills_clinic_generated_idx").on(
      table.clinicId,
      table.generatedAt
    ),
  })
);
