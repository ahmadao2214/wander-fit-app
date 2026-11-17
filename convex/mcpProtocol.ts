/**
 * The MCP surface a chat client (Claude, ChatGPT) talks to.
 *
 * Plain JSON-RPC over Streamable HTTP, stateless: every POST carries one
 * message and gets one JSON response. No Convex imports here, so the protocol
 * can be tested without a database. `convex/http.ts` supplies `callTool`.
 */

export const SERVER_INFO = { name: "wander-fit", version: "0.1.0" } as const;

/** Newest first. A client asking for a version not listed gets the newest. */
export const SUPPORTED_PROTOCOL_VERSIONS = ["2025-11-25", "2025-06-18", "2025-03-26"] as const;

export const INSTRUCTIONS = [
  "Wander Fit is the athlete's own training program. The app built it from intake, and it stays the coach.",
  "State a phase, week, day, workout, or exercise only when a tool returned it in this turn. Never guess one.",
  "This connection does not return sets, reps, or weights, so do not state them. The athlete sees those in the app.",
  "If read_program returns no program, say intake is not finished and stop. Do not invent a program.",
  "To change a day: call the preview tool, show the athlete the day as it will look, and wait for a clear yes.",
  "Call a commit tool with accepted: true only after that yes. If it returns stale, read the day again and show the new preview.",
  "Logging sets, choosing easier or harder versions, and changing phase or skill stay in the app.",
].join("\n");

const phase = { type: "string", enum: ["GPP", "SPP", "SSP"] } as const;
const slot = {
  type: "object",
  properties: {
    phase,
    week: { type: "integer", minimum: 1, description: "Week of the phase, starting at 1" },
    day: { type: "integer", minimum: 1, description: "Training day of the week, starting at 1" },
  },
  required: ["phase", "week", "day"],
  additionalProperties: false,
} as const;

const noArgs = { type: "object", properties: {}, additionalProperties: false } as const;

const read = { readOnlyHint: true, destructiveHint: false, openWorldHint: false } as const;
const write = { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false } as const;

export type ToolName =
  | "read_program"
  | "read_today"
  | "read_day"
  | "preview_reorder"
  | "commit_reorder"
  | "preview_swap"
  | "commit_swap";

export const TOOLS: Array<{
  name: ToolName;
  title: string;
  description: string;
  inputSchema: object;
  annotations: object;
}> = [
  {
    name: "read_program",
    title: "Read program",
    description:
      "The athlete's current phase, week, day, skill level, and which phases are unlocked. Returns program: null when intake is not finished.",
    inputSchema: noArgs,
    annotations: read,
  },
  {
    name: "read_today",
    title: "Read today's workout",
    description:
      "Today's workout as the app shows it: its name, the warm-up (always done first, in this order), and the main exercises in the athlete's current order. Present the warm-up and the main exercises as separate groups. source is in_progress when a workout was already started (it stays today's workout even if its calendar slot was swapped since), scheduled when nothing is started, and none when there is no workout. Each main exercise has an index: a fixed id for that exercise in this workout, not its position. A reorder lists those indexes. sessionId and version are set only when source is in_progress; a reorder needs them.",
    inputSchema: noArgs,
    annotations: read,
  },
  {
    name: "read_day",
    title: "Read a day",
    description:
      "The workout scheduled on one calendar slot (phase, week, day; week and day start at 1), including any swap already saved, with its warm-up and main exercises as separate groups. It shows the template order, not the order of a workout already in progress; use read_today for that. locked: true means that phase is not unlocked yet; say so and do not describe it.",
    inputSchema: { type: "object", properties: { slot }, required: ["slot"], additionalProperties: false },
    annotations: read,
  },
  {
    name: "preview_reorder",
    title: "Preview a reorder",
    description:
      "Shows today's in-progress workout with its main exercises in a new order. exerciseOrder lists the index of every main exercise from read_today, each exactly once, in the new order; copy the indexes, do not renumber them. The warm-up does not move and is not listed. Changes nothing. valid: false means the list was wrong; expectedIndexes lists the indexes it must contain. Otherwise show the result and ask the athlete to accept. version is an opaque token for the current order; pass it to commit_reorder unchanged.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: { type: "string" },
        exerciseOrder: { type: "array", items: { type: "integer", minimum: 0 } },
      },
      required: ["sessionId", "exerciseOrder"],
      additionalProperties: false,
    },
    annotations: read,
  },
  {
    name: "commit_reorder",
    title: "Save a reorder",
    description:
      "Saves the main-exercise order the athlete accepted. Pass the same exerciseOrder and the version from preview_reorder. accepted must be true only after the athlete said yes to that preview. reason: stale means the day changed; read it again.",
    inputSchema: {
      type: "object",
      properties: {
        sessionId: { type: "string" },
        exerciseOrder: { type: "array", items: { type: "integer", minimum: 0 } },
        version: { type: "string" },
        accepted: { type: "boolean" },
      },
      required: ["sessionId", "exerciseOrder", "version", "accepted"],
      additionalProperties: false,
    },
    annotations: write,
  },
  {
    name: "preview_swap",
    title: "Preview a swap",
    description:
      "Shows what swapping two calendar slots in the same phase would do. slotA and slotB each give the workout there before and after the swap. Changes nothing. valid: false gives a reason: different_phases (swaps stay within one phase), locked (that phase is not unlocked), same_slot, empty_slot (a rest day), or no_program. Only calendar slots move: inProgressWorkout, when set, is a workout already started and it stays as it is. If valid, show before and after for both slots and ask the athlete to accept.",
    inputSchema: {
      type: "object",
      properties: { slotA: slot, slotB: slot },
      required: ["slotA", "slotB"],
      additionalProperties: false,
    },
    annotations: read,
  },
  {
    name: "commit_swap",
    title: "Save a swap",
    description:
      "Swaps the two slots the athlete accepted. Pass the same slots and the version from preview_swap. accepted must be true only after the athlete said yes to that preview. reason: stale means the calendar changed; preview again.",
    inputSchema: {
      type: "object",
      properties: {
        slotA: slot,
        slotB: slot,
        version: { type: "string" },
        accepted: { type: "boolean" },
      },
      required: ["slotA", "slotB", "version", "accepted"],
      additionalProperties: false,
    },
    annotations: write,
  },
];

const TOOL_SET = new Set<string>(TOOLS.map((tool) => tool.name));

export type JsonRpcId = string | number;
export type JsonRpcResponse =
  | { jsonrpc: "2.0"; id: JsonRpcId | null; result: unknown }
  | { jsonrpc: "2.0"; id: JsonRpcId | null; error: { code: number; message: string } };

export const PARSE_ERROR = -32700;
export const INVALID_REQUEST = -32600;
export const METHOD_NOT_FOUND = -32601;
export const INVALID_PARAMS = -32602;

export type CallTool = (name: ToolName, args: Record<string, unknown>) => Promise<Record<string, unknown>>;

function fail(id: JsonRpcId | null, code: number, message: string): JsonRpcResponse {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

function ok(id: JsonRpcId, result: unknown): JsonRpcResponse {
  return { jsonrpc: "2.0", id, result };
}

export function negotiateVersion(requested: unknown): string {
  return (SUPPORTED_PROTOCOL_VERSIONS as readonly string[]).includes(requested as string)
    ? (requested as string)
    : SUPPORTED_PROTOCOL_VERSIONS[0];
}

/**
 * Handle one JSON-RPC message. Returns null for a notification, which gets
 * HTTP 202 and no body.
 */
export async function handleMessage(message: unknown, callTool: CallTool): Promise<JsonRpcResponse | null> {
  if (typeof message !== "object" || message === null || Array.isArray(message)) {
    return fail(null, INVALID_REQUEST, "Expected one JSON-RPC message");
  }
  const { jsonrpc, id, method, params } = message as {
    jsonrpc?: unknown;
    id?: unknown;
    method?: unknown;
    params?: unknown;
  };
  if (jsonrpc !== "2.0" || typeof method !== "string") {
    return fail(null, INVALID_REQUEST, "Expected a JSON-RPC 2.0 request");
  }

  const isNotification = id === undefined;
  if (isNotification) return null;
  if (typeof id !== "string" && typeof id !== "number") {
    return fail(null, INVALID_REQUEST, "id must be a string or number");
  }

  const p = (typeof params === "object" && params !== null ? params : {}) as Record<string, unknown>;

  switch (method) {
    case "initialize":
      return ok(id, {
        protocolVersion: negotiateVersion(p.protocolVersion),
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions: INSTRUCTIONS,
      });
    case "ping":
      return ok(id, {});
    case "tools/list":
      return ok(id, { tools: TOOLS });
    case "tools/call": {
      const name = p.name;
      if (typeof name !== "string" || !TOOL_SET.has(name)) {
        return fail(id, INVALID_PARAMS, `Unknown tool: ${String(name)}`);
      }
      const args = (typeof p.arguments === "object" && p.arguments !== null ? p.arguments : {}) as Record<
        string,
        unknown
      >;
      try {
        const structuredContent = await callTool(name as ToolName, args);
        return ok(id, {
          content: [{ type: "text", text: JSON.stringify(structuredContent) }],
          structuredContent,
          isError: false,
        });
      } catch (error) {
        // A tool that ran and failed is a result the model can read, not a protocol error.
        const text = error instanceof Error ? error.message : "The tool failed";
        return ok(id, { content: [{ type: "text", text }], isError: true });
      }
    }
    default:
      return fail(id, METHOD_NOT_FOUND, `Method not found: ${method}`);
  }
}
