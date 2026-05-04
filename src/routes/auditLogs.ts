import { Router } from "express";
import { listAuditLogs } from "../controllers/auditLogs";
import { asyncHandler } from "../middlewares/errorHandler";

const router = Router();

router.get("/", asyncHandler(listAuditLogs));

export default router;
