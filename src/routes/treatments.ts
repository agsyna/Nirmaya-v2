import { Router } from "express";
import {
  createTreatment,
  deleteTreatment,
  getTreatment,
  listTreatments,
  updateTreatment,
} from "../controllers/treatments";
import { asyncHandler } from "../middlewares/errorHandler";
import { validateBody } from "../middlewares/validate";
import {
  createTreatmentSchema,
  updateTreatmentSchema,
} from "../validators/treatments";

const router = Router();

router.post("/", validateBody(createTreatmentSchema), asyncHandler(createTreatment));
router.get("/", asyncHandler(listTreatments));
router.get("/:id", asyncHandler(getTreatment));
router.patch("/:id", validateBody(updateTreatmentSchema), asyncHandler(updateTreatment));
router.delete("/:id", asyncHandler(deleteTreatment));

export default router;
