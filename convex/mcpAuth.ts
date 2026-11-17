/**
 * OAuth discovery for the MCP endpoint (MCP authorization spec, RFC 9728).
 *
 * The endpoint is a resource server only. Clerk is the authorization server:
 * it signs the athlete in and issues the access token. Convex checks that
 * token against auth.config.ts before any tool runs.
 */

export const MCP_PATH = "/mcp";
export const RESOURCE_METADATA_PATH = "/.well-known/oauth-protected-resource";

/** Scopes Clerk grants by default; the hands need only who the athlete is. */
export const SCOPES = ["openid", "profile", "email"] as const;

export type McpEnv = {
  MCP_RESOURCE_URL?: string;
  CONVEX_SITE_URL?: string;
  CLERK_JWT_ISSUER_DOMAIN?: string;
};

export function resourceUrl(env: McpEnv): string | null {
  if (env.MCP_RESOURCE_URL) return env.MCP_RESOURCE_URL;
  if (env.CONVEX_SITE_URL) return `${env.CONVEX_SITE_URL.replace(/\/$/, "")}${MCP_PATH}`;
  return null;
}

/** Where a client finds the metadata for `resource`: the well-known path plus the resource's path. */
export function resourceMetadataUrl(resource: string): string {
  const url = new URL(resource);
  return `${url.origin}${RESOURCE_METADATA_PATH}${url.pathname === "/" ? "" : url.pathname}`;
}

export function protectedResourceMetadata(env: McpEnv) {
  const resource = resourceUrl(env);
  const issuer = env.CLERK_JWT_ISSUER_DOMAIN;
  if (!resource || !issuer) return null;
  return {
    resource,
    authorization_servers: [issuer],
    scopes_supported: [...SCOPES],
    bearer_methods_supported: ["header"],
    resource_name: "Wander Fit",
  };
}

/** RFC 6750 challenge. `error` is set when a token was sent and refused. */
export function unauthorizedHeader(env: McpEnv, error?: "invalid_token"): string {
  const resource = resourceUrl(env);
  const params = resource
    ? [`resource_metadata="${resourceMetadataUrl(resource)}"`, `scope="${SCOPES.join(" ")}"`]
    : ['realm="wander-fit"'];
  if (error) params.unshift(`error="${error}"`);
  return `Bearer ${params.join(", ")}`;
}

export const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, Mcp-Protocol-Version, Mcp-Session-Id",
  "Access-Control-Expose-Headers": "WWW-Authenticate, Mcp-Session-Id",
};
