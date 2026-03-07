import { Router } from "express";
import authRouter from "./auth.routes";

const router = Router();
router.use("/auth", authRouter);
router.get("/health", (req, res, next) => {
    res.json({
        status: "ok"
    });
})

export default router;