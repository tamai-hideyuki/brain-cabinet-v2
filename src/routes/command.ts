import { Hono } from "hono";
import { dispatch as noteDispatch } from "../dispatchers/note.js";
import { dispatch as driftDispatch } from "../dispatchers/drift.js";
import { dispatch as reviewDispatch } from "../dispatchers/review.js";
import { createLogger } from "../lib/logger.js";
import { AppError, ValidationError } from "../lib/errors.js";

const log = createLogger("api");
const command = new Hono();

const dispatchers = [noteDispatch, driftDispatch, reviewDispatch];

command.post("/", async (c) => {
  const timer = log.time("request");
  let action = "unknown";

  try {
    const body = await c.req.json<{ action: string; payload?: any }>();
    action = body.action;
    const payload = body.payload;

    if (!action) {
      throw new ValidationError("action is required");
    }

    log.info(`-> ${action}`, payload ? { payload: JSON.stringify(payload).slice(0, 120) } : undefined);

    for (const dispatch of dispatchers) {
      const result = await dispatch(action, payload ?? {});
      if (result !== null) {
        timer.end({ action, status: 200 });
        return c.json({ ok: true, data: result });
      }
    }

    throw new ValidationError(`Unknown action: ${action}`);
  } catch (err) {
    if (err instanceof AppError) {
      log.warn(`<- ${action} ${err.code}: ${err.message}`);
      timer.end({ action, status: err.statusCode });
      return c.json(
        { error: err.message, code: err.code, ...(err.details && { details: err.details }) },
        err.statusCode as any,
      );
    }

    const message = err instanceof Error ? err.message : "Internal server error";
    const stack = err instanceof Error ? err.stack : undefined;
    log.error(`<- ${action} UNHANDLED: ${message}`, stack ? { stack: stack.split("\n").slice(0, 3).join(" | ") } : undefined);
    timer.end({ action, status: 500 });
    return c.json({ error: message, code: "INTERNAL_ERROR" }, 500);
  }
});

export { command };
