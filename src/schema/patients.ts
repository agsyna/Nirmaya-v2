import {
  pgTable,
  uuid,
  varchar,
  integer,
  numeric,
  boolean,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { clinics } from "../schema/clinics";
import { genderEnum } from "../schema/enums";

export const patients = pgTable(
  "patients",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id),
    name: varchar("name", { length: 200 }).notNull(),
    phone: varchar("phone", { length: 20 }).notNull(),
    email: varchar("email", { length: 255 }),
    age: integer("age"),
    gender: genderEnum("gender"),
    heightCm: numeric("height_cm", { precision: 6, scale: 2 }),
    weightKg: numeric("weight_kg", { precision: 6, scale: 2 }),
    bloodGroup: varchar("blood_group", { length: 10 }),
    hasIdProof: boolean("has_id_proof").default(false).notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    clinicNamePhoneIdx: uniqueIndex("patients_clinic_name_phone_idx").on(
      table.clinicId,
      table.name,
      table.phone
    ),
    clinicCreatedIdx: index("patients_clinic_created_idx").on(
      table.clinicId,
      table.createdAt
    ),
    clinicActiveIdx: index("patients_clinic_active_idx").on(
      table.clinicId,
      table.isActive
    ),
  })
);
