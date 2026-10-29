import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

import { initScheduler } from "./lib/scheduler/followupScheduler.js";

console.log("==========================================");
console.log("   CRM Intelligent Automation Scheduler   ");
console.log("==========================================");
console.log("Target Database:", process.env.DATABASE_URL ? "DATABASE_URL configured" : "Local Postgres Default");

const task = initScheduler(process.env.CRON_SCHEDULE || "* * * * *");
console.log("Scheduler active and waiting for trigger intervals.");

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("Stopping scheduler task...");
  task.stop();
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("Stopping scheduler task...");
  task.stop();
  process.exit(0);
});