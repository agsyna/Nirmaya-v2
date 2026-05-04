import { Router } from "express";
import {
  createInstallment,
  listInstallments,
  updateInstallment,
} from "../controllers/installments";
import { asyncHandler } from "../middlewares/errorHandler";
import { validateBody } from "../middlewares/validate";
import {
  createInstallmentSchema,
  updateInstallmentSchema,
} from "../validators/installments";

const router = Router();

router.post(
  "/",
  validateBody(createInstallmentSchema),
  asyncHandler(createInstallment)
);
router.get("/", asyncHandler(listInstallments));
router.patch(
  "/:id",
  validateBody(updateInstallmentSchema),
  asyncHandler(updateInstallment)
);

export default router;
