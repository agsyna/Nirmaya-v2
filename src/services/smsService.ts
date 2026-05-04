import db from "@/config/db";
import { smsNotifications } from "@/schema/smsNotifications";
import { smsDeliveryLogs } from "@/schema/smsDeliveryLogs";

export const enqueueSms = async (params: {
  clinicId: string;
  patientId?: string | null;
  treatmentId?: string | null;
  eventType: string;
  payload: Record<string, unknown>;
  scheduledAt?: Date;
}) => {
  const [row] = await db
    .insert(smsNotifications)
    .values({
      clinicId: params.clinicId,
      patientId: params.patientId || null,
      treatmentId: params.treatmentId || null,
      eventType: params.eventType as any,
      payload: params.payload,
      scheduledAt: params.scheduledAt || new Date(),
    })
    .returning();
  return row;
};

export const createSmsDeliveryLog = async (params: {
  clinicId: string;
  notificationId: string;
  recipient: string;
  messagePreview: string;
  status: "sent" | "failed" | "bounced";
  deliveryStatus?: string | null;
  deliveredAt?: Date | null;
  errorDetails?: string | null;
}) => {
  return db.insert(smsDeliveryLogs).values({
    clinicId: params.clinicId,
    notificationId: params.notificationId,
    recipient: params.recipient,
    messagePreview: params.messagePreview.slice(0, 255),
    status: params.status as any,
    deliveryStatus: params.deliveryStatus || null,
    deliveredAt: params.deliveredAt || null,
    errorDetails: params.errorDetails || null,
  });
};
