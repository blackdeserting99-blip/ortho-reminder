// @ts-nocheck
import openNextWorker from "./.open-next/worker.js";

type WorkerEnv = {
  WORKER_SELF_REFERENCE?: Fetcher;
  REMINDER_API_TOKEN?: string;
  DATABASE_URL?: string;
  NEON_DATABASE_URL?: string;
  NEXTAUTH_SECRET?: string;
  SESSION_SECRET?: string;
  AUTH_SECRET?: string;
  VONAGE_APPLICATION_ID?: string;
  VONAGE_API_KEY?: string;
  VONAGE_API_SECRET?: string;
  VONAGE_PRIVATE_KEY?: string;
  VONAGE_WHATSAPP_NUMBER?: string;
  VONAGE_MESSAGES_API_URL?: string;
  VONAGE_TEMPLATE_MESSAGES_API_URL?: string;
  VONAGE_STATUS_WEBHOOK_URL?: string;
  VONAGE_WHATSAPP_TEMPLATE_NAME?: string;
  VONAGE_WHATSAPP_TEMPLATE_LOCALE?: string;
  VONAGE_WHATSAPP_TEMPLATE_PARAMETER_ORDER?: string;
  REMINDER_TIME_ZONE?: string;
  REMINDER_MORNING_HOUR?: string;
};

const WORKER_REMINDER_AUTH_HEADER = "x-worker-reminder-auth";

function normalizeRuntimeValue(value?: string) {
  if (!value || value === "undefined") {
    return value;
  }

  const trimmed = value.trim();
  if (
    trimmed.length >= 2 &&
    ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'")))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

function applyRuntimeSecrets(env: WorkerEnv) {
  const runtimeUrl = normalizeRuntimeValue(env.DATABASE_URL || env.NEON_DATABASE_URL);
  if (runtimeUrl && runtimeUrl !== "undefined") {
    process.env.DATABASE_URL ??= runtimeUrl;
    process.env.NEON_DATABASE_URL ??= runtimeUrl;
    (globalThis as typeof globalThis & { __DATABASE_URL__?: string }).__DATABASE_URL__ ??= runtimeUrl;
  }

  const sessionSecret = normalizeRuntimeValue(
    env.NEXTAUTH_SECRET || env.SESSION_SECRET || env.AUTH_SECRET
  );
  if (sessionSecret && sessionSecret !== "undefined") {
    process.env.NEXTAUTH_SECRET ??= sessionSecret;
    process.env.SESSION_SECRET ??= sessionSecret;
    process.env.AUTH_SECRET ??= sessionSecret;
  }

  for (const name of [
    "VONAGE_APPLICATION_ID",
    "VONAGE_API_KEY",
    "VONAGE_API_SECRET",
    "VONAGE_PRIVATE_KEY",
    "VONAGE_WHATSAPP_NUMBER",
    "VONAGE_MESSAGES_API_URL",
    "VONAGE_TEMPLATE_MESSAGES_API_URL",
    "VONAGE_STATUS_WEBHOOK_URL",
    "VONAGE_WHATSAPP_TEMPLATE_NAME",
    "VONAGE_WHATSAPP_TEMPLATE_LOCALE",
    "VONAGE_WHATSAPP_TEMPLATE_PARAMETER_ORDER",
    "REMINDER_TIME_ZONE",
    "REMINDER_MORNING_HOUR",
  ] as const) {
    const value = normalizeRuntimeValue(env[name]);
    if (value && value !== "undefined") {
      process.env[name] ??= value;
    }
  }
}

async function runScheduledReminders(controller: ScheduledController, env: WorkerEnv) {
  if (!env.REMINDER_API_TOKEN) {
    console.warn("[scheduler] REMINDER_API_TOKEN is missing; reminders run skipped.");
    return;
  }

  if (!env.WORKER_SELF_REFERENCE) {
    console.warn("[scheduler] WORKER_SELF_REFERENCE binding is missing; reminders run skipped.");
    return;
  }

  for (const reminderType of ["3days", "sameDay"] as const) {
    let response: Response;
    try {
      response = await env.WORKER_SELF_REFERENCE.fetch("https://internal/api/reminders/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-reminder-token": env.REMINDER_API_TOKEN,
          "x-reminder-cron": controller.cron,
        },
        body: JSON.stringify({
          baseDate: new Date(controller.scheduledTime).toISOString(),
          reminderType,
        }),
      });
    } catch (error) {
      console.error(`[scheduler] ${reminderType} reminders run request failed:`, error instanceof Error ? error.message : "Unknown error");
      continue;
    }

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      console.error(
        `[scheduler] ${reminderType} reminders run failed (${response.status}): ${errorBody || "No response body"}`
      );
      continue;
    }

    console.log(`[scheduler] ${reminderType} reminders run completed.`);
  }
}

const worker = openNextWorker as {
  fetch: (request: Request, env: WorkerEnv, ctx: ExecutionContext) => Promise<Response>;
};

function authenticateReminderRequest(request: Request, env: WorkerEnv) {
  const url = new URL(request.url);
  if (url.pathname !== "/api/reminders/run") {
    return request;
  }

  const requestToken = request.headers.get("x-reminder-token");
  if (!env.REMINDER_API_TOKEN || requestToken !== env.REMINDER_API_TOKEN) {
    return new Response(JSON.stringify({ error: "WORKER_AUTH_REJECTED" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const headers = new Headers(request.headers);
  headers.delete(WORKER_REMINDER_AUTH_HEADER);
  headers.set(WORKER_REMINDER_AUTH_HEADER, env.REMINDER_API_TOKEN);

  return new Request(request, { headers });
}

export default {
  async fetch(request: Request, env: WorkerEnv, ctx: ExecutionContext) {
    let passedReminderAuthentication = false;
    try {
      applyRuntimeSecrets(env);
      const authenticatedRequest = authenticateReminderRequest(request, env);
      if (authenticatedRequest instanceof Response) {
        return authenticatedRequest;
      }
      passedReminderAuthentication = new URL(request.url).pathname === "/api/reminders/run";
      const response = await worker.fetch(authenticatedRequest, env, ctx);
      if (
        passedReminderAuthentication &&
        request.headers.get("x-debug-reminder") === "1"
      ) {
        const body = await response.text();
        return new Response(
          JSON.stringify({
            error: "OPENNEXT_RESPONSE",
            status: response.status,
            contentType: response.headers.get("content-type"),
            body: body.slice(0, 4000),
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      return response;
    } catch (error) {
      const caughtError = error instanceof Error ? error : new Error(String(error));
      console.error("[WORKER_OUTER_EXCEPTION]", {
        errorName: caughtError.name,
        errorMessage: caughtError.message,
        errorStack: caughtError.stack,
      });
      if (
        passedReminderAuthentication &&
        request.headers.get("x-debug-reminder") === "1"
      ) {
        return new Response(
          JSON.stringify({
            error: "OPENNEXT_DISPATCH_ERROR",
            errorName: caughtError.name,
            errorMessage: caughtError.message,
            stack: caughtError.stack,
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
      throw error;
    }
  },
  async scheduled(controller: ScheduledController, env: WorkerEnv, ctx: ExecutionContext) {
    applyRuntimeSecrets(env);
    ctx.waitUntil(runScheduledReminders(controller, env));
  },
};