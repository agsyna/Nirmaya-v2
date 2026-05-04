import {
  pgTable,
  uuid,
  varchar,
  integer,
  text,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { clinics } from "@/schema/clinics";
import { patients } from "@/schema/patients";
import { treatments } from "@/schema/treatments";
import { visits } from "@/schema/visits";
import { users } from "@/schema/users";
import { documentCategoryEnum } from "@/schema/enums";

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id),
    patientId: uuid("patient_id")
      .notNull()
      .references(() => patients.id),
    treatmentId: uuid("treatment_id").references(() => treatments.id),
    visitId: uuid("visit_id").references(() => visits.id),
    category: documentCategoryEnum("category").notNull(),
    fileUrl: text("file_url").notNull(),
    fileName: varchar("file_name", { length: 255 }).notNull(),
    fileSize: integer("file_size"),
    mimeType: varchar("mime_type", { length: 100 }),
    uploadedBy: uuid("uploaded_by")
      .notNull()
      .references(() => users.id),
    isDeleted: boolean("is_deleted").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    clinicPatientIdx: index("documents_clinic_patient_idx").on(
      table.clinicId,
      table.patientId
    ),
    clinicTreatmentIdx: index("documents_clinic_treatment_idx").on(
      table.clinicId,
      table.treatmentId
    ),
    clinicCategoryIdx: index("documents_clinic_category_idx").on(
      table.clinicId,
      table.category
    ),
  })
);
