import { Hono } from "hono";
import { dispatch as noteDispatch } from "../dispatchers/note.js";
import { dispatch as driftDispatch } from "../dispatchers/drift.js";
import { dispatch as reviewDispatch } from "../dispatchers/review.js";

const command = new Hono();

const dispatchers = [noteDispatch, driftDispatch, reviewDispatch];

command.post("/", async (c) => {
  const body = await c.req.json<{ action: string; payload?: any }>();
  const { action, payload } = body;

  if (!action) {
    return c.json({ error: "action is required" }, 400);
  }

  for (const dispatch of dispatchers) {
    const result = await dispatch(action, payload ?? {});
    if (result !== null) {
      return c.json({ ok: true, data: result });
    }
  }

  return c.json({ error: `Unknown action: ${action}` }, 400);
});

export { command };
