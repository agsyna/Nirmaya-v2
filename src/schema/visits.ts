import {
  pgTable,
  uuid,
  date,
  text,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { clinics } from "../schema/clinics";
import { treatments } from "../schema/treatments";

export const visits = pgTable(
  "visits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id),
    treatmentId: uuid("treatment_id")
      .notNull()
      .references(() => treatments.id),
    visitDate: date("visit_date").notNull(),
    notes: text("notes"),
    isDeleted: boolean("is_deleted").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    clinicTreatmentIdx: index("visits_clinic_treatment_idx").on(
      table.clinicId,
      table.treatmentId
    ),
    clinicVisitDateIdx: index("visits_clinic_visit_date_idx").on(
      table.clinicId,
      table.visitDate
    ),
  })
);
