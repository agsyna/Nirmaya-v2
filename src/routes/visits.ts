import { Router } from "express";
import {
  createVisit,
  createVisitWithDetails,
  deleteVisit,
  getVisit,
  listVisits,
  updateVisit,
} from "../controllers/visits";
import { asyncHandler } from "../middlewares/errorHandler";
import { upload } from "../middlewares/upload";
import { validateBody } from "../middlewares/validate";
import {
  createVisitSchema,
  createVisitWithDetailsSchema,
  updateVisitSchema,
} from "../validators/visits";

const router = Router();

const visitDetailsUpload = upload.fields([
  { name: "reportFiles", maxCount: 10 },
  { name: "prescriptionFiles", maxCount: 10 },
]);

router.post(
  "/with-details",
  visitDetailsUpload,
  validateBody(createVisitWithDetailsSchema),
  asyncHandler(createVisitWithDetails)
);
router.post("/", validateBody(createVisitSchema), asyncHandler(createVisit));
router.get("/", asyncHandler(listVisits));
router.get("/:id", asyncHandler(getVisit));
router.patch("/:id", validateBody(updateVisitSchema), asyncHandler(updateVisit));
router.delete("/:id", asyncHandler(deleteVisit));

export default router;
