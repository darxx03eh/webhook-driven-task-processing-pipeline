import { Router } from "express";
import {
    registerHandler,
    loginHandler,
    meHandler
} from "../controllers/auth.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";

const router = Router();
router.post("/register", asyncHandler(registerHandler));
router.post("/login", asyncHandler(loginHandler));
router.get("/me", requireAuth, asyncHandler(meHandler));

export default router;