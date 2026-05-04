import {
  pgTable,
  uuid,
  jsonb,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { clinics } from "../schema/clinics";
import { users } from "../schema/users";
import { auditActionEnum, auditEntityEnum } from "../schema/enums";

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id),
    entity: auditEntityEnum("entity").notNull(),
    entityId: uuid("entity_id").notNull(),
    action: auditActionEnum("action").notNull(),
    oldData: jsonb("old_data"),
    newData: jsonb("new_data").notNull(),
    changedBy: uuid("changed_by")
      .notNull()
      .references(() => users.id),
    timestamp: timestamp("timestamp", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    clinicEntityIdx: index("audit_logs_clinic_entity_idx").on(
      table.clinicId,
      table.entity,
      table.entityId
    ),
    clinicTimestampIdx: index("audit_logs_clinic_timestamp_idx").on(
      table.clinicId,
      table.timestamp
    ),
    clinicActionIdx: index("audit_logs_clinic_action_idx").on(
      table.clinicId,
      table.action
    ),
  })
);
