import { Router } from "express";
import {
  createTransaction,
  deleteTransaction,
  listTransactions,
  updateTransaction,
} from "../controllers/transactions";
import { asyncHandler } from "../middlewares/errorHandler";
import { validateBody } from "../middlewares/validate";
import {
  createTransactionSchema,
  updateTransactionSchema,
} from "../validators/transactions";

const router = Router();

router.post(
  "/",
  validateBody(createTransactionSchema),
  asyncHandler(createTransaction)
);
router.get("/", asyncHandler(listTransactions));
router.patch(
  "/:id",
  validateBody(updateTransactionSchema),
  asyncHandler(updateTransaction)
);
router.delete("/:id", asyncHandler(deleteTransaction));

export default router;
