import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import type { ActionCtx } from "./_generated/server";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { handleMessage, PARSE_ERROR, type CallTool } from "./mcpProtocol";
import {
  CORS_HEADERS,
  MCP_PATH,
  RESOURCE_METADATA_PATH,
  protectedResourceMetadata,
  unauthorizedHeader,
  type McpEnv,
} from "./mcpAuth";

const env = (): McpEnv => ({
  MCP_RESOURCE_URL: process.env.MCP_RESOURCE_URL,
  CONVEX_SITE_URL: process.env.CONVEX_SITE_URL,
  CLERK_JWT_ISSUER_DOMAIN: process.env.CLERK_JWT_ISSUER_DOMAIN,
});

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
    headers: { "Content-Type": "application/json", ...CORS_HEADERS, ...headers },
  });

const mcp = httpAction(async (ctx, request) => {
  // Convex has already checked the bearer token against auth.config.ts: either the
  // app's session token or a Clerk OAuth token whose audience is this endpoint.
  // A token Convex rejects throws rather than returning null; the client still needs a
  // 401 so it signs the athlete in again. The reason is logged, never the token.
  let identity: Awaited<ReturnType<typeof ctx.auth.getUserIdentity>>;
  let rejected = false;
  try {
    identity = await ctx.auth.getUserIdentity();
  } catch (error) {
    console.warn("MCP token rejected:", error instanceof Error ? error.message : String(error));
    identity = null;
    rejected = true;
  }
  if (!identity) {
    return json(
      { jsonrpc: "2.0", id: null, error: { code: -32001, message: "Sign in to Wander Fit first" } },
      401,
      { "WWW-Authenticate": unauthorizedHeader(env(), rejected ? "invalid_token" : undefined) },
    );
  }

  let message: unknown;
  try {
    message = await request.json();
  } catch {
    return json({ jsonrpc: "2.0", id: null, error: { code: PARSE_ERROR, message: "Invalid JSON" } }, 400);
  }

  const response = await handleMessage(message, toolsFor(ctx));
  if (response === null) return new Response(null, { status: 202, headers: CORS_HEADERS });
  return json(response);
});

// Stateless server: no server-to-client stream and no session to end.
const notAllowed = httpAction(
  async () => new Response(null, { status: 405, headers: { Allow: "POST, OPTIONS", ...CORS_HEADERS } }),
);

const preflight = httpAction(async () => new Response(null, { status: 204, headers: CORS_HEADERS }));

/** RFC 9728: tells a chat client that Clerk signs the athlete in for this endpoint. */
const resourceMetadata = httpAction(async () => {
  const metadata = protectedResourceMetadata(env());
  if (!metadata) return json({ error: "MCP sign-in is not configured on this deployment" }, 404);
  return json(metadata, 200, { "Cache-Control": "public, max-age=300" });
});

/**
 * Clients built on the 2025-03-26 spec look for the authorization server's
 * metadata on this origin. Pass Clerk's through unchanged.
 */
const authServerMetadata = httpAction(async () => {
  const issuer = env().CLERK_JWT_ISSUER_DOMAIN;
  if (!issuer) return json({ error: "Clerk issuer is not configured" }, 404);
  const upstream = await fetch(`${issuer.replace(/\/$/, "")}/.well-known/oauth-authorization-server`);
  return json(await upstream.json(), upstream.status, { "Cache-Control": "public, max-age=300" });
});

const http = httpRouter();
http.route({ path: MCP_PATH, method: "POST", handler: mcp });
http.route({ path: MCP_PATH, method: "GET", handler: notAllowed });
http.route({ path: MCP_PATH, method: "DELETE", handler: notAllowed });
http.route({ path: MCP_PATH, method: "OPTIONS", handler: preflight });
for (const path of [RESOURCE_METADATA_PATH, `${RESOURCE_METADATA_PATH}${MCP_PATH}`]) {
  http.route({ path, method: "GET", handler: resourceMetadata });
  http.route({ path, method: "OPTIONS", handler: preflight });
}
http.route({ path: "/.well-known/oauth-authorization-server", method: "GET", handler: authServerMetadata });

export default http;
