import {
  protectedResourceMetadata,
  resourceMetadataUrl,
  resourceUrl,
  unauthorizedHeader,
} from "../mcpAuth";
import { fixture } from "../../jest/chatHandsFixture";

const issuer = "https://example-instance.clerk.accounts.dev";
const site = "https://example-deployment.convex.site";

describe("MCP sign-in discovery", () => {
  const saved = { ...process.env };
  afterEach(() => {
    process.env = { ...saved };
  });

  it("names the endpoint from the deployment's site address", () => {
    expect(resourceUrl({ CONVEX_SITE_URL: `${site}/` })).toBe(`${site}/mcp`);
    expect(resourceUrl({ MCP_RESOURCE_URL: "https://mcp.example.com/mcp", CONVEX_SITE_URL: site })).toBe(
      "https://mcp.example.com/mcp",
    );
    expect(resourceUrl({})).toBeNull();
  });

  it("puts the metadata at the well-known path plus the endpoint path", () => {
    expect(resourceMetadataUrl(`${site}/mcp`)).toBe(`${site}/.well-known/oauth-protected-resource/mcp`);
    expect(resourceMetadataUrl(`${site}/`)).toBe(`${site}/.well-known/oauth-protected-resource`);
  });

  it("names Clerk as the only authorization server", () => {
    expect(protectedResourceMetadata({ CONVEX_SITE_URL: site, CLERK_JWT_ISSUER_DOMAIN: issuer })).toEqual({
      resource: `${site}/mcp`,
      authorization_servers: [issuer],
      scopes_supported: ["openid", "profile", "email"],
      bearer_methods_supported: ["header"],
      resource_name: "Wander Fit",
    });
    expect(protectedResourceMetadata({ CONVEX_SITE_URL: site })).toBeNull();
  });

  it("points a refused client at the metadata", () => {
    expect(unauthorizedHeader({ CONVEX_SITE_URL: site })).toBe(
      `Bearer resource_metadata="${site}/.well-known/oauth-protected-resource/mcp", scope="openid profile email"`,
    );
    expect(unauthorizedHeader({ CONVEX_SITE_URL: site }, "invalid_token")).toBe(
      `Bearer error="invalid_token", resource_metadata="${site}/.well-known/oauth-protected-resource/mcp", scope="openid profile email"`,
    );
  });

  it("serves the metadata and a 401 that links to it", async () => {
    process.env.CONVEX_SITE_URL = site;
    process.env.CLERK_JWT_ISSUER_DOMAIN = issuer;
    const { t } = await fixture();

    for (const path of ["/.well-known/oauth-protected-resource/mcp", "/.well-known/oauth-protected-resource"]) {
      const response = await t.fetch(path, { method: "GET" });
      expect(response.status).toBe(200);
      expect((await response.json()).authorization_servers).toEqual([issuer]);
    }

    const refused = await t.fetch("/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    });
    expect(refused.status).toBe(401);
    expect(refused.headers.get("WWW-Authenticate")).toContain(
      `resource_metadata="${site}/.well-known/oauth-protected-resource/mcp"`,
    );
    expect(refused.headers.get("Access-Control-Expose-Headers")).toContain("WWW-Authenticate");
  });

  it("says sign-in is not configured when Clerk is missing", async () => {
    process.env.CONVEX_SITE_URL = site;
    delete process.env.CLERK_JWT_ISSUER_DOMAIN;
    const { t } = await fixture();
    const response = await t.fetch("/.well-known/oauth-protected-resource/mcp", { method: "GET" });
    expect(response.status).toBe(404);
  });

  it("answers a browser preflight", async () => {
    const { t } = await fixture();
    const response = await t.fetch("/mcp", { method: "OPTIONS" });
    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Headers")).toContain("Authorization");
  });
});
