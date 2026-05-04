import { Router } from "express";
import {
  getDashboardPatient,
  getDashboardSummary,
  listDashboardPatients,
} from "../controllers/dashboard";
import { asyncHandler } from "../middlewares/errorHandler";

const router = Router();

router.get("/summary", asyncHandler(getDashboardSummary));
router.get("/patients", asyncHandler(listDashboardPatients));
router.get("/patient", asyncHandler(getDashboardPatient));

export default router;
