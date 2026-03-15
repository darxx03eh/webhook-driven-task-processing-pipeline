import express from "express";
import cors from "cors";
import router from "./routes/index";
import { config } from "./config/env";
import { errorMiddleware } from "./middleware/error.middleware";
import { requestMetricsMiddleware } from "./middleware/request-metrics.middleware";

const app = express();
app.use(cors());
app.use(express.json({
    verify: (req, res, buf) => {
        (req as express.Request & {
            rawBody?: string
        }).rawBody = buf.toString("utf-8");
    }
}));
app.use(requestMetricsMiddleware);
app.use("/api", router);
app.use(errorMiddleware);
app.listen(config.port, () => {
    console.log(`API server running on port ${config.port}`);
});
