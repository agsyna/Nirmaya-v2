import { Router } from "express";
import {
  createPatient,
  deletePatient,
  getPatient,
  listPatients,
  updatePatient,
} from "../controllers/patients";
import { asyncHandler } from "../middlewares/errorHandler";
import { upload } from "../middlewares/upload";
import { validateBody } from "../middlewares/validate";
import { createPatientSchema, updatePatientSchema } from "../validators/patients";

const router = Router();

const proofUpload = upload.fields([
  { name: "idProofFile", maxCount: 1 },
  { name: "cghsFile", maxCount: 1 },
  { name: "echsFile", maxCount: 1 },
]);

router.post("/", proofUpload, validateBody(createPatientSchema), asyncHandler(createPatient));
router.get("/", asyncHandler(listPatients));
router.get("/:id", asyncHandler(getPatient));
router.patch("/:id", proofUpload, validateBody(updatePatientSchema), asyncHandler(updatePatient));
router.delete("/:id", asyncHandler(deletePatient));

export default router;
