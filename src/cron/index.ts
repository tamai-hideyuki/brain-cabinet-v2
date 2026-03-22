import cron from "node-cron";
import { computeDrift } from "../services/drift/index.js";

export function startCronJobs() {
  // 毎日 03:00 にドリフト検出を実行
  cron.schedule("0 3 * * *", async () => {
    console.log("[cron] drift.compute started");
    try {
      const result = await computeDrift();
      console.log("[cron] drift.compute done:", result);
    } catch (e) {
      console.error("[cron] drift.compute error:", e);
    }
  });

  console.log("[cron] Scheduled: drift.compute at 03:00 daily");
}
