import { Router } from "express";
import {
  getDashboardPatient,
  listDashboardPatients,
} from "../controllers/dashboard";
import { asyncHandler } from "../middlewares/errorHandler";

const router = Router();

router.get("/patients", asyncHandler(listDashboardPatients));
router.get("/patient", asyncHandler(getDashboardPatient));

export default router;
