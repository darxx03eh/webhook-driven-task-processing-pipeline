import { Router } from "express";
import {
  registerHandler,
  loginHandler,
  meHandler,
} from "../controllers/auth.controller";
import { requireAuth } from "../middlewares/auth.middleware";
import { createRateLimitMiddleware } from "../middlewares/rate-limit.middleware";
import { config } from "../config/env";
import { asyncHandler } from "../utils/async-handler";

const authRouter = Router();
const authRateLimit = createRateLimitMiddleware({
  scope: "auth",
  windowMs: config.rateLimit.authWindowMs,
  maxRequests: config.rateLimit.authMaxRequests,
});

authRouter.post("/register", authRateLimit, asyncHandler(registerHandler));
authRouter.post("/login", authRateLimit, asyncHandler(loginHandler));
authRouter.get("/me", requireAuth, asyncHandler(meHandler));

export default authRouter;

