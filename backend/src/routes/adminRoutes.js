import { Router } from "express";
import { getAllUsers, removeSuspension, addUser, removeUser } from "../controllers/adminController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = Router();
router.use(requireAuth);

router.get("/users", getAllUsers);
router.post("/users", addUser);
router.delete("/users/:id", removeUser);
router.post("/users/:id/unsuspend", removeSuspension);

export default router;
