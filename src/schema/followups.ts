import {
  pgTable,
  uuid,
  date,
  text,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { clinics } from "@/schema/clinics";
import { patients } from "@/schema/patients";
import { treatments } from "@/schema/treatments";
import { followupStatusEnum } from "@/schema/enums";

export const followups = pgTable(
  "followups",
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
    scheduledDate: date("scheduled_date").notNull(),
    status: followupStatusEnum("status").notNull(),
    notes: text("notes"),
    isDeleted: boolean("is_deleted").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    clinicPatientIdx: index("followups_clinic_patient_idx").on(
      table.clinicId,
      table.patientId
    ),
    clinicTreatmentIdx: index("followups_clinic_treatment_idx").on(
      table.clinicId,
      table.treatmentId
    ),
    clinicScheduledIdx: index("followups_clinic_scheduled_idx").on(
      table.clinicId,
      table.scheduledDate
    ),
    clinicStatusIdx: index("followups_clinic_status_idx").on(
      table.clinicId,
      table.status
    ),
  })
);
