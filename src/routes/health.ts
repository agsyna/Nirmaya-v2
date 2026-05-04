import { Router } from "express";
import { getHealth } from "@/controllers/health";
import { asyncHandler } from "@/middlewares/errorHandler";

const router = Router();

router.get("/health", asyncHandler(getHealth));

export default router;
