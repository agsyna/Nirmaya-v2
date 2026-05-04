import {
  pgTable,
  uuid,
  varchar,
  numeric,
  text,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { clinics } from "@/schema/clinics";
import { treatments } from "@/schema/treatments";
import { patients } from "@/schema/patients";
import { visits } from "@/schema/visits";
import { paymentModeEnum, transactionTypeEnum } from "@/schema/enums";

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id),
    treatmentId: uuid("treatment_id")
      .notNull()
      .references(() => treatments.id),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    visitId: uuid("visit_id").references(() => visits.id),
    type: transactionTypeEnum("type").notNull(),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    paymentMode: paymentModeEnum("payment_mode"),
    referenceId: varchar("reference_id", { length: 100 }),
    notes: text("notes"),
    isDeleted: boolean("is_deleted").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    clinicTreatmentIdx: index("transactions_clinic_treatment_idx").on(
      table.clinicId,
      table.treatmentId
    ),
    clinicPatientIdx: index("transactions_clinic_patient_idx").on(
      table.clinicId,
      table.patientId
    ),
    clinicCreatedIdx: index("transactions_clinic_created_idx").on(
      table.clinicId,
      table.createdAt
    ),
    clinicPaymentModeIdx: index("transactions_clinic_payment_mode_idx").on(
      table.clinicId,
      table.paymentMode
    ),
  })
);
