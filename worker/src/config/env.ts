import dotenv from "dotenv";

dotenv.config();

export const config = {
  databaseUrl: process.env.DATABASE_URL || "",
  pollIntervalMs: Number(process.env.WORKER_POLL_INTERVAL_MS) || 5000,
};
