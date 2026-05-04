import { Router } from "express";
import { generateBill, getBill } from "@/controllers/bills";
import { asyncHandler } from "@/middlewares/errorHandler";
import { validateBody } from "@/middlewares/validate";
import { generateBillSchema } from "@/validators/bills";

const router = Router();

router.post("/generate", validateBody(generateBillSchema), asyncHandler(generateBill));
router.get("/:id", asyncHandler(getBill));

export default router;
