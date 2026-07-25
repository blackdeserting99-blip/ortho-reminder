// @ts-nocheck
import openNextWorker from "./.open-next/worker.js";

type WorkerEnv = {
  WORKER_SELF_REFERENCE?: Fetcher;
  REMINDER_API_TOKEN?: string;
  DATABASE_URL?: string;
};

async function runScheduledReminders(controller: ScheduledController, env: WorkerEnv) {
  if (!env.REMINDER_API_TOKEN) {
    console.warn("[scheduler] REMINDER_API_TOKEN is missing; reminders run skipped.");
    return;
  }

  if (!env.WORKER_SELF_REFERENCE) {
    console.warn("[scheduler] WORKER_SELF_REFERENCE binding is missing; reminders run skipped.");
    return;
  }

  const response = await env.WORKER_SELF_REFERENCE.fetch("https://internal/api/reminders/run", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-reminder-token": env.REMINDER_API_TOKEN,
      "x-reminder-cron": controller.cron,
    },
    body: JSON.stringify({
      baseDate: new Date(controller.scheduledTime).toISOString(),
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    console.error(
      `[scheduler] reminders run failed (${response.status}): ${errorBody || "No response body"}`
    );
    return;
  }

  console.log(`[scheduler] reminders run completed for cron ${controller.cron}.`);
}

const worker = openNextWorker as {
  fetch: (request: Request, env: WorkerEnv, ctx: ExecutionContext) => Promise<Response>;
};

export default {
  async fetch(request: Request, env: WorkerEnv, ctx: ExecutionContext) {
    // Ensure DATABASE_URL is available in process.env for Prisma
    // The nodejs_compat_populate_process_env flag doesn't reliably work with bundled code
    if (env.DATABASE_URL) {
      process.env.DATABASE_URL = env.DATABASE_URL;
    }
    if (env.REMINDER_TIME_ZONE) {
      process.env.REMINDER_TIME_ZONE = env.REMINDER_TIME_ZONE;
    }
    if (env.REMINDER_MORNING_HOUR) {
      process.env.REMINDER_MORNING_HOUR = env.REMINDER_MORNING_HOUR;
    }
    
    return worker.fetch(request, env, ctx);
  },
  async scheduled(controller: ScheduledController, env: WorkerEnv, ctx: ExecutionContext) {
    // Ensure environment variables are set for scheduled tasks
    if (env.DATABASE_URL) {
      process.env.DATABASE_URL = env.DATABASE_URL;
    }
    if (env.REMINDER_TIME_ZONE) {
      process.env.REMINDER_TIME_ZONE = env.REMINDER_TIME_ZONE;
    }
    if (env.REMINDER_MORNING_HOUR) {
      process.env.REMINDER_MORNING_HOUR = env.REMINDER_MORNING_HOUR;
    }
    
    ctx.waitUntil(runScheduledReminders(controller, env));
  },
};