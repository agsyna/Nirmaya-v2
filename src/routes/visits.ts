import { Router } from "express";
import {
  createVisit,
  deleteVisit,
  listVisits,
  updateVisit,
} from "../controllers/visits";
import { asyncHandler } from "../middlewares/errorHandler";
import { validateBody } from "../middlewares/validate";
import { createVisitSchema, updateVisitSchema } from "../validators/visits";

const router = Router();

router.post("/", validateBody(createVisitSchema), asyncHandler(createVisit));
router.get("/", asyncHandler(listVisits));
router.patch("/:id", validateBody(updateVisitSchema), asyncHandler(updateVisit));
router.delete("/:id", asyncHandler(deleteVisit));

export default router;
