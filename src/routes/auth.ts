import { Router } from "express";
import { login, verifyToken } from "@/controllers/auth";
import { asyncHandler } from "@/middlewares/errorHandler";
import { validateBody } from "@/middlewares/validate";
import { loginSchema } from "@/validators/auth";
import { requireAuth } from "@/middlewares/auth";

const router = Router();

router.post("/login", validateBody(loginSchema), asyncHandler(login));
router.get("/verify", requireAuth, asyncHandler(verifyToken));

export default router;
