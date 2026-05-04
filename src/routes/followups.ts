import { Router } from "express";
import {
  createFollowup,
  listFollowups,
  updateFollowup,
} from "../controllers/followups";
import { asyncHandler } from "../middlewares/errorHandler";
import { validateBody } from "../middlewares/validate";
import { createFollowupSchema, updateFollowupSchema } from "../validators/followups";

const router = Router();

router.post(
  "/",
  validateBody(createFollowupSchema),
  asyncHandler(createFollowup)
);
router.get("/", asyncHandler(listFollowups));
router.patch(
  "/:id",
  validateBody(updateFollowupSchema),
  asyncHandler(updateFollowup)
);

export default router;
