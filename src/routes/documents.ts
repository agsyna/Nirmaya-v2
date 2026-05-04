import { Router } from "express";
import {
  deleteDocument,
  listDocuments,
  uploadDocument,
} from "@/controllers/documents";
import { asyncHandler } from "@/middlewares/errorHandler";
import { validateBody } from "@/middlewares/validate";
import { upload } from "@/middlewares/upload";
import { uploadDocumentSchema } from "@/validators/documents";

const router = Router();

router.post(
  "/upload",
  upload.single("file"),
  validateBody(uploadDocumentSchema),
  asyncHandler(uploadDocument)
);
router.get("/", asyncHandler(listDocuments));
router.delete("/:id", asyncHandler(deleteDocument));

export default router;
