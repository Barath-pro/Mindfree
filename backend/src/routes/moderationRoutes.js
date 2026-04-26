import { Router } from "express";
import { getMyModerationLogs } from "../controllers/moderationController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = Router();

router.use(requireAuth);
router.get("/me", getMyModerationLogs);

export default router;

