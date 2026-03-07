import { Router } from "express";

const router = Router();
router.get("/health", (req, res, next) => {
    res.json({
        status: "ok"
    });
})

export default router;