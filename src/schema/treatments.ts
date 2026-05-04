import {
  pgTable,
  uuid,
  varchar,
  date,
  numeric,
  text,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { clinics } from "../schema/clinics";
import { patients } from "../schema/patients";
import { discountTypeEnum, treatmentStatusEnum } from "../schema/enums";

export const treatments = pgTable(
  "treatments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    title: varchar("title", { length: 200 }).notNull(),
    status: treatmentStatusEnum("status").notNull(),
    startDate: date("start_date").notNull(),
    estimatedEndDate: date("estimated_end_date"),
    actualEndDate: date("actual_end_date"),
    totalFee: numeric("total_fee", { precision: 12, scale: 2 }).notNull(),
    discountType: discountTypeEnum("discount_type"),
    discountValue: numeric("discount_value", { precision: 12, scale: 2 }),
    finalFee: numeric("final_fee", { precision: 12, scale: 2 }).notNull(),
    notes: text("notes"),
    isDeleted: boolean("is_deleted").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    clinicPatientIdx: index("treatments_clinic_patient_idx").on(
      table.clinicId,
      table.patientId
    ),
    clinicStatusIdx: index("treatments_clinic_status_idx").on(
      table.clinicId,
      table.status
    ),
    clinicCreatedIdx: index("treatments_clinic_created_idx").on(
      table.clinicId,
      table.createdAt
    ),
  })
);
