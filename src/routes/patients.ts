import { Router } from "express";
import {
  createPatient,
  deletePatient,
  getPatient,
  listPatients,
  updatePatient,
} from "@/controllers/patients";
import { asyncHandler } from "@/middlewares/errorHandler";
import { validateBody } from "@/middlewares/validate";
import { createPatientSchema, updatePatientSchema } from "@/validators/patients";

const router = Router();

router.post("/", validateBody(createPatientSchema), asyncHandler(createPatient));
router.get("/", asyncHandler(listPatients));
router.get("/:id", asyncHandler(getPatient));
router.patch("/:id", validateBody(updatePatientSchema), asyncHandler(updatePatient));
router.delete("/:id", asyncHandler(deletePatient));

export default router;
