import cron from "node-cron";
import { computeDrift } from "../services/drift/index.js";
import { createLogger } from "../lib/logger.js";

const log = createLogger("cron");

export function startCronJobs() {
  // 毎日 03:00 にドリフト検出を実行
  cron.schedule("0 3 * * *", async () => {
    log.info("drift.compute triggered (scheduled)");
    try {
      const result = await computeDrift();
      log.info("drift.compute completed", {
        detected: result.detected,
        events: "events" in result ? (result as any).events?.length ?? 0 : 0,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      log.error("drift.compute failed", { error: message });
    }
  });

  log.info("scheduled: drift.compute at 03:00 daily");
}
