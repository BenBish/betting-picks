import { stringify as csvStringify } from "csv-stringify/sync";
import type { Context, Next } from "hono";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { prettyJSON } from "hono/pretty-json";
import { getActivities } from "./lib/activity-service";
import {
  type Agent,
  createAgent,
  deleteAgent,
  getAgentById,
  getAllAgents,
  rotateAgentKey,
  updateAgent,
} from "./lib/agent-service";
import {
  getAnalytics,
  getAnalyticsByAgent,
  getAnalyticsByCompetition,
  getAnalyticsByMarket,
  getDailyPnL,
} from "./lib/analytics-service";
import {
  batchCreatePicks,
  batchSettleResults,
  batchUpdateClosingLines,
  createPick,
  deletePick,
  getAllPicks,
  getPickById,
  settleResult,
  unsettlePick,
  updateClosingLine,
  updatePick,
} from "./lib/picks-service";
import { sseEmitter } from "./lib/sse-emitter";
import {
  BatchClosingLinesSchema,
  BatchCreatePicksSchema,
  BatchResultsSchema,
  ClosingLineSchema,
  CreateAgentSchema,
  CreatePickSchema,
  LoginSchema,
  ResultSettlementSchema,
  UpdateAgentSchema,
  UpdatePickSchema,
} from "./lib/validations";
import {
  createSessionToken,
  hashPassword,
  sessions,
  verifyPassword,
} from "./middleware/auth";
import { agentAuthMiddleware } from "./middleware/rate-limit";

// Helper to extract typed variables from Hono context
function getUser(c: Context): string {
  return c.get("user") as string;
}

function getAgent(c: Context): Agent {
  return c.get("agent") as Agent;
}

// --- Auth middleware ---

const sessionAuthMiddleware = async (c: Context, next: Next) => {
  const cookie = c.req.raw.headers.get("Cookie") || "";
  const sessionCookie = cookie
    .split(";")
    .map((s) => s.trim())
    .find((s) => s.startsWith("session="));

  if (!sessionCookie) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const token = sessionCookie.split("=")[1];
  if (!(token && sessions.has(token))) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  c.set("user", sessions.get(token) || "admin");
  await next();
};

const app = new Hono();

// Middleware
app.use("*", cors());
app.use("*", logger());
app.use("*", prettyJSON());

// Admin password (from env or default)
const ADMIN_PASSWORD_HASH = hashPassword(process.env.APP_PASSWORD || "admin");

// --- Auth routes ---

app.post("/api/login", async (c) => {
  const body = await c.req.json();
  const result = LoginSchema.safeParse(body);

  if (!result.success) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  if (!verifyPassword(result.data.password, ADMIN_PASSWORD_HASH)) {
    return c.json({ error: "Invalid credentials" }, 401);
  }

  const token = createSessionToken();
  sessions.set(token, "admin");

  return c.json(
    { success: true },
    {
      headers: {
        "Set-Cookie": `session=${token}; HttpOnly; Path=/; SameSite=Lax; Max-Age=86400`,
      },
    }
  );
});

app.post("/api/logout", (c) =>
  c.json(
    { success: true },
    {
      headers: {
        "Set-Cookie": "session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0",
      },
    }
  )
);

// --- Agent routes (admin-only) ---

const agentRoutes = new Hono();
agentRoutes.use("*", sessionAuthMiddleware);

agentRoutes.post("/", async (c) => {
  const body = await c.req.json();
  const result = CreateAgentSchema.safeParse(body);

  if (!result.success) {
    return c.json({ error: result.error.issues }, 400);
  }

  const { agent, key } = createAgent(result.data.name);
  return c.json({ agent, key }, 201);
});

agentRoutes.get("/", (c) => {
  const agents = getAllAgents();
  return c.json({ agents });
});

agentRoutes.get("/:id", (c) => {
  const agent = getAgentById(c.req.param("id"));
  if (!agent) {
    return c.json({ error: "Agent not found" }, 404);
  }
  return c.json({ agent });
});

agentRoutes.put("/:id", async (c) => {
  const body = await c.req.json();
  const result = UpdateAgentSchema.safeParse(body);

  if (!result.success) {
    return c.json({ error: result.error.issues }, 400);
  }

  const agent = updateAgent(c.req.param("id"), result.data);
  if (!agent) {
    return c.json({ error: "Agent not found" }, 404);
  }
  return c.json({ agent });
});

agentRoutes.post("/:id/rotate-key", (c) => {
  const newKey = rotateAgentKey(c.req.param("id"));
  if (!newKey) {
    return c.json({ error: "Agent not found" }, 404);
  }
  return c.json({ key: newKey });
});

agentRoutes.delete("/:id", (c) => {
  const success = deleteAgent(c.req.param("id"));
  if (!success) {
    return c.json({ error: "Agent not found" }, 404);
  }
  return c.json({ success: true });
});

// --- Picks routes (admin-only) ---

const picksRoutes = new Hono();
picksRoutes.use("*", sessionAuthMiddleware);

picksRoutes.get("/", (c) => {
  const source = c.req.query("source");
  const competition = c.req.query("competition");
  const result = c.req.query("result");
  const team = c.req.query("team");
  const date_from = c.req.query("date_from");
  const date_to = c.req.query("date_to");
  const unsettled_only = c.req.query("unsettled_only") === "true";
  const agent_id = c.req.query("agent_id");

  const picks = getAllPicks({
    source,
    competition,
    result,
    team,
    date_from,
    date_to,
    unsettled_only,
    agent_id,
  });

  return c.json({ picks });
});

picksRoutes.get("/:id", (c) => {
  const pick = getPickById(c.req.param("id"));
  if (!pick) {
    return c.json({ error: "Pick not found" }, 404);
  }
  return c.json({ pick });
});

picksRoutes.post("/", async (c) => {
  const body = await c.req.json();
  const result = CreatePickSchema.safeParse(body);

  if (!result.success) {
    return c.json({ error: result.error.issues }, 400);
  }

  const user = getUser(c);
  const pick = createPick({
    ...result.data,
    created_by: user,
  });

  return c.json({ pick }, 201);
});

picksRoutes.put("/:id", async (c) => {
  const body = await c.req.json();
  const result = UpdatePickSchema.safeParse(body);

  if (!result.success) {
    return c.json({ error: result.error.issues }, 400);
  }

  const user = getUser(c);
  const pick = updatePick(c.req.param("id"), result.data, user);
  if (!pick) {
    return c.json({ error: "Pick not found" }, 404);
  }
  return c.json({ pick });
});

picksRoutes.put("/:id/closing-line", async (c) => {
  const body = await c.req.json();
  const result = ClosingLineSchema.safeParse(body);

  if (!result.success) {
    return c.json({ error: result.error.issues }, 400);
  }

  const user = getUser(c);
  const pick = updateClosingLine(
    c.req.param("id"),
    result.data.closing_odds,
    user
  );
  if (!pick) {
    return c.json({ error: "Pick not found" }, 404);
  }
  return c.json({ pick });
});

picksRoutes.put("/:id/result", async (c) => {
  const body = await c.req.json();
  const result = ResultSettlementSchema.safeParse(body);

  if (!result.success) {
    return c.json({ error: result.error.issues }, 400);
  }

  const user = getUser(c);
  const pick = settleResult(c.req.param("id"), result.data.result, user);
  if (!pick) {
    return c.json({ error: "Pick not found" }, 404);
  }
  return c.json({ pick });
});

picksRoutes.put("/:id/unsettle", (c) => {
  const user = getUser(c);
  const pick = unsettlePick(c.req.param("id"), user);
  if (!pick) {
    return c.json({ error: "Pick not found or not settled" }, 404);
  }
  return c.json({ pick });
});

picksRoutes.delete("/:id", (c) => {
  const success = deletePick(c.req.param("id"));
  if (!success) {
    return c.json({ error: "Pick not found" }, 404);
  }
  return c.json({ success: true });
});

// --- Agent-facing routes ---

const agentPicksRoutes = new Hono();
agentPicksRoutes.use("*", agentAuthMiddleware);

agentPicksRoutes.post("/", async (c) => {
  const body = await c.req.json();
  const result = CreatePickSchema.safeParse(body);
  const agent = getAgent(c);

  if (!result.success) {
    return c.json({ error: result.error.issues }, 400);
  }

  const pick = createPick({
    ...result.data,
    created_by: agent.name,
    agent_id: agent.id,
  });

  return c.json({ pick }, 201);
});

agentPicksRoutes.post("/batch", async (c) => {
  const body = await c.req.json();
  const result = BatchCreatePicksSchema.safeParse(body);
  const agent = getAgent(c);

  if (!result.success) {
    return c.json({ error: result.error.issues }, 400);
  }

  const picksWithAgent = result.data.picks.map((p) => ({
    ...p,
    created_by: agent.name,
    agent_id: agent.id,
  }));

  const results = batchCreatePicks(picksWithAgent);

  // Return 207 Multi-Status
  const multiStatus = results.map((r, i) => ({
    index: i,
    status: r.success ? 201 : 400,
    pick: r.pick,
    error: r.error,
  }));

  return c.json(multiStatus, 207);
});

agentPicksRoutes.post("/batch-closing-lines", async (c) => {
  const body = await c.req.json();
  const result = BatchClosingLinesSchema.safeParse(body);
  const agent = getAgent(c);

  if (!result.success) {
    return c.json({ error: result.error.issues }, 400);
  }

  const results = batchUpdateClosingLines(result.data.updates, agent.name);

  const multiStatus = results.map((r, i) => ({
    index: i,
    status: r.success ? 200 : 404,
    error: r.error,
  }));

  return c.json(multiStatus, 207);
});

agentPicksRoutes.post("/batch-results", async (c) => {
  const body = await c.req.json();
  const result = BatchResultsSchema.safeParse(body);
  const agent = getAgent(c);

  if (!result.success) {
    return c.json({ error: result.error.issues }, 400);
  }

  const results = batchSettleResults(result.data.updates, agent.name);

  const multiStatus = results.map((r, i) => ({
    index: i,
    status: r.success ? 200 : 404,
    error: r.error,
  }));

  return c.json(multiStatus, 207);
});

// --- Analytics routes (admin-only) ---

const analyticsRoutes = new Hono();
analyticsRoutes.use("*", sessionAuthMiddleware);

analyticsRoutes.get("/", (c) => {
  const analytics = getAnalytics();
  return c.json({ analytics });
});

analyticsRoutes.get("/by-agent", (c) => {
  const data = getAnalyticsByAgent();
  return c.json({ data });
});

analyticsRoutes.get("/by-market", (c) => {
  const data = getAnalyticsByMarket();
  return c.json({ data });
});

analyticsRoutes.get("/by-competition", (c) => {
  const data = getAnalyticsByCompetition();
  return c.json({ data });
});

analyticsRoutes.get("/daily-pnl", (c) => {
  const data = getDailyPnL();
  return c.json({ data });
});

// --- Export routes ---

const exportRoutes = new Hono();
exportRoutes.use("*", sessionAuthMiddleware);

exportRoutes.get("/csv", (_c) => {
  const picks = getAllPicks({});

  const rows = picks.map((p) => ({
    id: p.id,
    created_at: p.created_at,
    created_by: p.created_by,
    source: p.source || "",
    match_date: p.match_date,
    competition: p.competition || "",
    home_team: p.home_team,
    away_team: p.away_team,
    market: p.market,
    selection: p.selection,
    recommended_odds: p.recommended_odds,
    closing_odds: p.closing_odds ?? "",
    stake: p.stake,
    result: p.result || "",
    profit_loss: p.profit_loss ?? "",
    clv_percent: p.clv_percent === null ? "" : p.clv_percent.toFixed(2),
    notes: p.notes || "",
  }));

  const csv = csvStringify(rows, { header: true });

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": "attachment; filename=picks.csv",
    },
  });
});

// --- Activity routes (paginated REST requires auth) ---

const activityRoutes = new Hono();
activityRoutes.get("/", sessionAuthMiddleware, (c) => {
  const limit = Number.parseInt(c.req.query("limit") || "50", 10);
  const offset = Number.parseInt(c.req.query("offset") || "0", 10);
  const agent_id = c.req.query("agent_id");
  const action = c.req.query("action");

  const activities = getActivities({
    limit,
    offset,
    agent_id,
    action,
  });
  return c.json({ activities });
});

// SSE stream endpoint
activityRoutes.get("/stream", async (c) => {
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Subscribe to SSE events
  const unsubscribe = sseEmitter.subscribe(async (chunk: Uint8Array) => {
    try {
      await writer.write(chunk);
    } catch {
      // Client disconnected
    }
  });

  // Send initial comment to keep connection alive
  await writer.write(encoder.encode(": connected\n\n"));

  // Send buffered events (recent activity)
  const recent = getActivities({ limit: 20 });
  for (const activity of recent) {
    await writer.write(
      encoder.encode(`event: activity\ndata: ${JSON.stringify(activity)}\n\n`)
    );
  }

  c.req.raw.signal?.addEventListener("abort", () => {
    unsubscribe();
    writer.close();
  });

  return new Response(stream.readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
});

// Mount routes
app.route("/api/admin/agents", agentRoutes);
app.route("/api/admin/picks", picksRoutes);
app.route("/api/agent/picks", agentPicksRoutes);
app.route("/api/admin/analytics", analyticsRoutes);
app.route("/api/admin/export", exportRoutes);
app.route("/api/activity", activityRoutes);

// Health check
app.get("/api/health", (c) =>
  c.json({ status: "ok", timestamp: new Date().toISOString() })
);

export default app;
