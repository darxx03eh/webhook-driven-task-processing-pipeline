import { config } from "./config/env";
import { runNextPendingJob } from "./services/job-runner.service";

async function startWorker() {
  console.log(
    `[worker] Starting worker with polling interval ${config.pollIntervalMs}ms...`,
  );
  setInterval(async () => {
    try {
      await runNextPendingJob();
    } catch (err) {
      console.error("[worker] Unexpected error in worker loop:", err);
    }
  }, config.pollIntervalMs);
}

startWorker();
