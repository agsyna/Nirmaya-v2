import db from "../config/db";
import { treatments } from "../schema/treatments";
import { transactions } from "../schema/transactions";
import { and, eq, sql } from "drizzle-orm";

export const getTreatmentBalance = async (params: {
  clinicId: string;
  treatmentId: string;
}) => {
  const [row] = await db
    .select({
      treatmentId: treatments.id,
      finalFee: treatments.finalFee,
      paidAmount: sql<number>`COALESCE(SUM(${transactions.amount}), 0)`,
      balance: sql<number>`(${treatments.finalFee} - COALESCE(SUM(${transactions.amount}), 0))`,
    })
    .from(treatments)
    .leftJoin(
      transactions,
      and(
        eq(treatments.id, transactions.treatmentId),
        eq(transactions.isDeleted, false),
        eq(transactions.clinicId, params.clinicId)
      )
    )
    .where(and(eq(treatments.id, params.treatmentId), eq(treatments.clinicId, params.clinicId)))
    .groupBy(treatments.id);

  return row;
};
