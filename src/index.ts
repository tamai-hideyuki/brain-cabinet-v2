import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "@hono/node-server/serve-static";
import { command } from "./routes/command.js";
import { startCronJobs } from "./cron/index.js";

const app = new Hono();

app.use("*", cors());

// Command API
app.route("/api/v1", command);

// Static files (React build)
app.use("/ui/*", serveStatic({ root: "./ui/dist", rewriteRequestPath: (path) => path.replace(/^\/ui/, "") }));

// SPA fallback
app.get("/ui/*", serveStatic({ root: "./ui/dist", rewriteRequestPath: () => "/index.html" }));

const port = Number(process.env.PORT) || 3000;

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Brain Cabinet v2 running on http://localhost:${info.port}`);
});

startCronJobs();
