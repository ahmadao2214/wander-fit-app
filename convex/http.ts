import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { handleMessage, PARSE_ERROR, type CallTool } from "./mcpProtocol";

type Slot = { phase: "GPP" | "SPP" | "SSP"; week: number; day: number };

/**
 * Each tool runs the same Convex function the hands tests cover, as the
 * signed-in athlete. Convex validators reject malformed arguments.
 */
function toolsFor(ctx: ActionCtx): CallTool {
  return async (name, args) => {
    switch (name) {
      case "read_program": {
        const program = await ctx.runQuery(api.chatHands.readProgram, {});
        return program
          ? { program }
          : { program: null, message: "No program yet: intake is not finished in the app." };
      }
      case "read_today":
        return await ctx.runAction(api.chatHands.readToday, {});
      case "read_day":
        return await ctx.runQuery(api.chatHands.readDay, { slot: args.slot as Slot });
      case "preview_reorder":
        return await ctx.runQuery(api.chatHands.previewReorder, {
          sessionId: args.sessionId as Id<"gpp_workout_sessions">,
          exerciseOrder: args.exerciseOrder as number[],
        });
      case "commit_reorder":
        return await ctx.runMutation(api.chatHands.commitReorder, {
          sessionId: args.sessionId as Id<"gpp_workout_sessions">,
          exerciseOrder: args.exerciseOrder as number[],
          version: args.version as string,
          accepted: args.accepted as boolean,
        });
      case "preview_swap":
        return await ctx.runQuery(api.chatHands.previewSwap, {
          slotA: args.slotA as Slot,
          slotB: args.slotB as Slot,
        });
      case "commit_swap":
        return await ctx.runMutation(api.chatHands.commitSwap, {
          slotA: args.slotA as Slot,
          slotB: args.slotB as Slot,
          version: args.version as string,
          accepted: args.accepted as boolean,
        });
    }
  };
}

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });

const mcp = httpAction(async (ctx, request) => {
  // Convex has already checked the bearer token against auth.config.ts.
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return json(
      { jsonrpc: "2.0", id: null, error: { code: -32001, message: "Sign in to Wander Fit first" } },
      401,
      { "WWW-Authenticate": 'Bearer realm="wander-fit"' },
    );
  }

  let message: unknown;
  try {
    message = await request.json();
  } catch {
    return json({ jsonrpc: "2.0", id: null, error: { code: PARSE_ERROR, message: "Invalid JSON" } }, 400);
  }

  const response = await handleMessage(message, toolsFor(ctx));
  if (response === null) return new Response(null, { status: 202 });
  return json(response);
});

// Stateless server: no server-to-client stream and no session to end.
const notAllowed = httpAction(async () => new Response(null, { status: 405, headers: { Allow: "POST" } }));

const http = httpRouter();
http.route({ path: "/mcp", method: "POST", handler: mcp });
http.route({ path: "/mcp", method: "GET", handler: notAllowed });
http.route({ path: "/mcp", method: "DELETE", handler: notAllowed });

export default http;
