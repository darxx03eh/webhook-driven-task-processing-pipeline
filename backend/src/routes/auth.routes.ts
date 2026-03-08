import { Router } from "express";
import {
    registerHandler,
    loginHandler,
    meHandler
} from "../controllers/auth.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { asyncHandler } from "../utils/async-handler";

const authRouter = Router();
authRouter.post("/register", asyncHandler(registerHandler));
authRouter.post("/login", asyncHandler(loginHandler));
authRouter.get("/me", requireAuth, asyncHandler(meHandler));

export default authRouter;