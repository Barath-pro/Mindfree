import { Router } from "express";
import { googleLogin, login, me, register } from "../controllers/authController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { handleValidation } from "../utils/validation.js";
import { googleLoginValidator, loginValidator, registerValidator } from "../utils/validators.js";

const router = Router();

router.post("/register", registerValidator, handleValidation, register);
router.post("/login", loginValidator, handleValidation, login);
router.post("/google", googleLoginValidator, handleValidation, googleLogin);
router.get("/me", requireAuth, me);

export default router;
