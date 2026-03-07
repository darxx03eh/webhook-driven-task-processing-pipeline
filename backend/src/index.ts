import express from "express";
import cors from "cors";
import router from "./routes/index";
import { config } from "./config/env";

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api", router);

app.listen(config.port, () => {
    console.log(`API server running on port ${config.port}`);
});