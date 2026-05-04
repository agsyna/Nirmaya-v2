import {
  pgTable,
  uuid,
  jsonb,
  integer,
  text,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { clinics } from "@/schema/clinics";
import { patients } from "@/schema/patients";
import { treatments } from "@/schema/treatments";
import { smsEventEnum, smsStatusEnum } from "@/schema/enums";

export const smsNotifications = pgTable(
  "sms_notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id),
    patientId: uuid("patient_id").references(() => patients.id),
    treatmentId: uuid("treatment_id").references(() => treatments.id),
    eventType: smsEventEnum("event_type").notNull(),
    payload: jsonb("payload").notNull(),
    status: smsStatusEnum("status").default("pending").notNull(),
    retryCount: integer("retry_count").default(0).notNull(),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    errorMessage: text("error_message"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    clinicStatusIdx: index("sms_notifications_clinic_status_idx").on(
      table.clinicId,
      table.status,
      table.scheduledAt
    ),
    clinicPatientIdx: index("sms_notifications_clinic_patient_idx").on(
      table.clinicId,
      table.patientId
    ),
    clinicTreatmentIdx: index("sms_notifications_clinic_treatment_idx").on(
      table.clinicId,
      table.treatmentId
    ),
    clinicEventIdx: index("sms_notifications_clinic_event_idx").on(
      table.clinicId,
      table.eventType
    ),
  })
);
