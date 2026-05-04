import {
  pgTable,
  uuid,
  varchar,
  integer,
  numeric,
  date,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { clinics } from "../schema/clinics";
import { treatments } from "../schema/treatments";
import { installmentStatusEnum } from "../schema/enums";

export const installments = pgTable(
  "installments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id),
    treatmentId: uuid("treatment_id")
      .notNull()
      .references(() => treatments.id),
    planName: varchar("plan_name", { length: 100 }).notNull(),
    totalInstallments: integer("total_installments").notNull(),
    installmentAmount: numeric("installment_amount", {
      precision: 12,
      scale: 2,
    }).notNull(),
    dueDate: date("due_date").notNull(),
    paidDate: date("paid_date"),
    status: installmentStatusEnum("status").notNull(),
    isDeleted: boolean("is_deleted").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    clinicTreatmentIdx: index("installments_clinic_treatment_idx").on(
      table.clinicId,
      table.treatmentId
    ),
    clinicStatusIdx: index("installments_clinic_status_idx").on(
      table.clinicId,
      table.status
    ),
    clinicDueDateIdx: index("installments_clinic_due_date_idx").on(
      table.clinicId,
      table.dueDate
    ),
  })
);
