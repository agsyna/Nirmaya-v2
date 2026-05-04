import {
  pgTable,
  uuid,
  varchar,
  text,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { clinics } from "../schema/clinics";
import { smsNotifications } from "../schema/smsNotifications";
import { deliveryStatusEnum } from "../schema/enums";

export const smsDeliveryLogs = pgTable(
  "sms_delivery_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clinicId: uuid("clinic_id")
      .notNull()
      .references(() => clinics.id),
    notificationId: uuid("notification_id")
      .notNull()
      .references(() => smsNotifications.id),
    recipient: varchar("recipient", { length: 100 }).notNull(),
    messagePreview: varchar("message_preview", { length: 255 }).notNull(),
    status: deliveryStatusEnum("status").notNull(),
    deliveryStatus: varchar("delivery_status", { length: 100 }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    syncedToSheets: boolean("synced_to_sheets").default(false).notNull(),
    syncTimestamp: timestamp("sync_timestamp", { withTimezone: true }),
    errorDetails: text("error_details"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    clinicNotificationIdx: index("sms_logs_clinic_notification_idx").on(
      table.clinicId,
      table.notificationId
    ),
    clinicDeliveredIdx: index("sms_logs_clinic_delivered_idx").on(
      table.clinicId,
      table.deliveredAt
    ),
    clinicSyncedIdx: index("sms_logs_clinic_synced_idx").on(
      table.clinicId,
      table.syncedToSheets
    ),
  })
);
