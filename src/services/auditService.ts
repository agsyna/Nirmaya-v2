import db from "@/config/db";
import { auditLogs } from "@/schema/auditLogs";

export const createAuditLog = async (params: {
  clinicId: string;
  entity: string;
  entityId: string;
  action: "create" | "update" | "delete";
  oldData?: Record<string, unknown> | null;
  newData: Record<string, unknown>;
  changedBy: string;
}) => {
  return db.insert(auditLogs).values({
    clinicId: params.clinicId,
    entity: params.entity as any,
    entityId: params.entityId,
    action: params.action as any,
    oldData: params.oldData || null,
    newData: params.newData,
    changedBy: params.changedBy,
  });
};
