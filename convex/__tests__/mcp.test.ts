import { api, internal } from "../_generated/api";
import { SUPPORTED_PROTOCOL_VERSIONS, TOOLS } from "../mcpProtocol";
import { clearJwksCache } from "../clerkOAuth";
import { fixture } from "../../jest/chatHandsFixture";
import { ISSUER, RESOURCE, SITE, jwksFetch, makeKey, sign, type SigningKey } from "../../jest/clerkTokens";

type Fetcher = { fetch: (path: string, init?: RequestInit) => Promise<Response> };

const METADATA_URL = `${SITE}/.well-known/oauth-protected-resource/mcp`;
const CLERK_METADATA = {
  issuer: ISSUER,
  authorization_endpoint: `${ISSUER}/oauth/authorize`,
  token_endpoint: `${ISSUER}/oauth/token`,
  jwks_uri: `${ISSUER}/.well-known/jwks.json`,
  client_id_metadata_document_supported: true,
  code_challenge_methods_supported: ["S256"],
};

let key: SigningKey;
let strangerKey: SigningKey;
let jwksCalls: string[];
const saved = { ...process.env };

beforeAll(async () => {
  key = await makeKey("ins_clerk");
  strangerKey = await makeKey("ins_stranger");
});

beforeEach(() => {
  process.env.MCP_RESOURCE_URL = RESOURCE;
  process.env.CONVEX_SITE_URL = SITE;
  process.env.CLERK_JWT_ISSUER_DOMAIN = ISSUER;
  clearJwksCache();
  const { fetcher, calls } = jwksFetch([key]);
  jwksCalls = calls;
  jest.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    if (String(input) === `${ISSUER}/.well-known/oauth-authorization-server`) {
      return new Response(JSON.stringify(CLERK_METADATA), { status: 200 });
    }
    return fetcher(input, init);
  });
});

afterEach(() => {
  jest.restoreAllMocks();
  process.env = { ...saved };
});

let nextId = 1;
async function rpc(client: Fetcher, token: string | null, method: string, params?: unknown) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await client.fetch("/mcp", {
    method: "POST",
    headers,
    body: JSON.stringify({ jsonrpc: "2.0", id: nextId++, method, params }),
  });
  return {
    status: response.status,
    challenge: response.headers.get("WWW-Authenticate"),
    body: response.status === 202 ? null : await response.json(),
  };
}

async function callTool(client: Fetcher, token: string, name: string, args: Record<string, unknown> = {}) {
  const { body } = await rpc(client, token, "tools/call", { name, arguments: args });
  return body.result as { structuredContent?: any; content: { text: string }[]; isError: boolean };
}

describe("MCP discovery", () => {
  it("publishes metadata for the exact resource, naming Clerk", async () => {
    const { t } = await fixture();
    const response = await t.fetch("/.well-known/oauth-protected-resource/mcp", { method: "GET" });
    expect(response.status).toBe(200);
    const metadata = await response.json();
    expect(metadata.resource).toBe(RESOURCE);
    expect(metadata.authorization_servers).toEqual([ISSUER]);
  });

  it("leads a client from a 401 to Clerk's authorization server", async () => {
    const { t } = await fixture();
    const refused = await rpc(t, null, "initialize");
    expect(refused.status).toBe(401);
    expect(refused.challenge).toBe(
      `Bearer resource_metadata="${METADATA_URL}", scope="openid profile email"`,
    );

    const metadataPath = new URL(METADATA_URL).pathname;
    const metadata = await (await t.fetch(metadataPath, { method: "GET" })).json();
    const [authorizationServer] = metadata.authorization_servers;

    // RFC 8414 discovery from the issuer, as the client would do it.
    const discovered = await (
      await fetch(`${authorizationServer}/.well-known/oauth-authorization-server`)
    ).json();
    expect(discovered.issuer).toBe(ISSUER);
    expect(discovered.client_id_metadata_document_supported).toBe(true);

    // Older clients ask this origin instead; it passes Clerk's metadata through.
    const proxied = await (await t.fetch("/.well-known/oauth-authorization-server", { method: "GET" })).json();
    expect(proxied).toEqual(CLERK_METADATA);
  });
});

describe("MCP sign-in and tool calls", () => {
  it("runs a tool as the athlete Clerk signed in, matching the app's Today screen", async () => {
    const { t, asAthlete, dayOne, squat, hinge } = await fixture();
    // Clerk finishes the OAuth flow and issues this access token to the client.
    const token = await sign(key);

    const init = await rpc(t, token, "initialize", {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "test", version: "1" },
    });
    expect(init.status).toBe(200);
    expect(init.body.result.protocolVersion).toBe("2025-06-18");
    expect(init.body.result.instructions).toMatch(/only when a tool returned it/);
    const notified = await t.fetch("/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
    });
    expect(notified.status).toBe(202);

    const screen = await asAthlete.query(api.scheduleOverrides.getTodayWorkout, {});
    const result = await callTool(t, token, "read_today");
    expect(result.isError).toBe(false);
    expect(result.structuredContent.templateId).toBe(dayOne);
    expect(result.structuredContent.name).toBe(screen?.name);
    expect(result.structuredContent.exerciseIds).toEqual([squat, hinge]);
    expect(result.structuredContent.exerciseNames).toEqual(
      screen?.exercises.map((row: { exercise?: { name: string } }) => row.exercise?.name),
    );
    expect(JSON.parse(result.content[0].text)).toEqual(result.structuredContent);
  });

  it("acts only on the athlete named in the token", async () => {
    const { t } = await fixture();
    const stranger = await sign(key, { claims: { sub: "clerk_nobody" } });
    const result = await callTool(t, stranger, "read_program");
    expect(result.structuredContent.program).toBeNull();
  });

  it("answers repeated and concurrent calls the same way", async () => {
    const { t } = await fixture();
    const token = await sign(key);

    const sequential: unknown[] = [];
    for (let i = 0; i < 3; i++) {
      await rpc(t, token, "initialize", { protocolVersion: "2025-06-18" });
      sequential.push((await callTool(t, token, "read_today")).structuredContent);
    }
    const concurrent = await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        i % 2 ? callTool(t, token, "read_today") : callTool(t, token, "read_program"),
      ),
    );

    expect(new Set(sequential.map((row) => JSON.stringify(row))).size).toBe(1);
    const todays = concurrent.filter((_, i) => i % 2).map((row) => JSON.stringify(row.structuredContent));
    expect(new Set(todays).size).toBe(1);
    expect(todays[0]).toBe(JSON.stringify(sequential[0]));
    expect(concurrent.every((row) => row.isError === false)).toBe(true);
    // The JWKS is fetched once and then cached across requests.
    expect(jwksCalls).toHaveLength(1);
  });

  it("writes a reorder only after acceptance", async () => {
    const { t, sessionId, squat, hinge } = await fixture();
    const token = await sign(key);
    const today = (await callTool(t, token, "read_today")).structuredContent;
    const preview = (await callTool(t, token, "preview_reorder", { sessionId, exerciseOrder: [1, 0] }))
      .structuredContent;
    expect(preview.exerciseIds).toEqual([hinge, squat]);

    const declined = await callTool(t, token, "commit_reorder", {
      sessionId,
      exerciseOrder: [1, 0],
      version: preview.version,
      accepted: false,
    });
    expect(declined.structuredContent).toEqual({ written: false, reason: "not_accepted" });
    expect((await callTool(t, token, "read_today")).structuredContent.exerciseIds).toEqual(today.exerciseIds);

    const accepted = await callTool(t, token, "commit_reorder", {
      sessionId,
      exerciseOrder: [1, 0],
      version: preview.version,
      accepted: true,
    });
    expect(accepted.structuredContent).toEqual({ written: true, reason: "ok" });
    expect((await callTool(t, token, "read_today")).structuredContent.exerciseIds).toEqual([hinge, squat]);
  });

  it("says there is no program instead of inventing one", async () => {
    const { t } = await fixture();
    await t.run(async (ctx) => {
      await ctx.db.insert("users", { email: "new@example.com", name: "New", clerkId: "clerk_new", createdAt: 1 });
    });
    const result = await callTool(t, await sign(key, { claims: { sub: "clerk_new" } }), "read_program");
    expect(result.structuredContent.program).toBeNull();
    expect(result.structuredContent.message).toMatch(/intake is not finished/);
  });

  it("lists the hands and no easier-or-harder write", async () => {
    const { t } = await fixture();
    const { body } = await rpc(t, await sign(key), "tools/list");
    const names = body.result.tools.map((tool: { name: string }) => tool.name);
    const listed = await t.query(internal.chatHands.listTools, {});
    expect(names).toEqual(listed.tools);
    expect(names).not.toContain("easier_or_harder");
    for (const tool of body.result.tools) {
      expect({ name: tool.name, readOnly: tool.annotations.readOnlyHint }).toEqual({
        name: tool.name,
        readOnly: !tool.name.startsWith("commit_"),
      });
    }
  });

  it("returns a bad argument as a tool error the chat can read", async () => {
    const { t } = await fixture();
    const result = await callTool(t, await sign(key), "read_day", { slot: { phase: "XYZ", week: 1, day: 1 } });
    expect(result.isError).toBe(true);
  });

  it("rejects an unknown tool and an unknown method", async () => {
    const { t } = await fixture();
    const token = await sign(key);
    expect((await rpc(t, token, "tools/call", { name: "easier_or_harder", arguments: {} })).body.error.code).toBe(
      -32602,
    );
    expect((await rpc(t, token, "resources/list")).body.error.code).toBe(-32601);
  });
});

describe("MCP token rejection", () => {
  const invalid = `Bearer error="invalid_token", resource_metadata="${METADATA_URL}", scope="openid profile email"`;

  it("challenges a request with no token, without an error code", async () => {
    const { t } = await fixture();
    const refused = await rpc(t, null, "tools/list");
    expect(refused.status).toBe(401);
    expect(refused.body.error.code).toBe(-32001);
    expect(refused.challenge).not.toContain("error=");
  });

  it.each([
    ["an expired token", () => sign(key, { claims: { iat: 1, nbf: 1, exp: 100 } })],
    ["a token for another audience", () => sign(key, { claims: { aud: "https://other.example.com/mcp" } })],
    ["a token for the app (aud convex)", () => sign(key, { claims: { aud: "convex" } })],
    ["the app's session token", () => sign(key, { typ: "JWT", claims: { aud: "convex", sid: "sess_1" } })],
    ["a token from another issuer", () => sign(key, { claims: { iss: "https://evil.example.com" } })],
    ["a token signed by an unknown key", () => sign(strangerKey)],
    ["a forged signature", () => sign(strangerKey, { kid: "ins_clerk" })],
    ["an opaque token", async () => "oat_0123456789"],
    ["a malformed token", async () => "not.a.jwt"],
  ])("rejects %s with invalid_token and runs no tool", async (_label, makeToken) => {
    const { t, sessionId } = await fixture();
    const refused = await rpc(t, await makeToken(), "tools/call", {
      name: "commit_reorder",
      arguments: { sessionId, exerciseOrder: [1, 0], version: "x", accepted: true },
    });
    expect(refused.status).toBe(401);
    expect(refused.challenge).toBe(invalid);
    expect(refused.body.result).toBeUndefined();
  });

  it("does not treat a JWKS outage as a bad token", async () => {
    const { t } = await fixture();
    jest.spyOn(globalThis, "fetch").mockImplementation(async () => new Response("down", { status: 503 }));
    const result = await rpc(t, await sign(key), "tools/list");
    expect(result.status).toBe(503);
    expect(result.challenge).toBeNull();
  });

  it("refuses to run when sign-in is not configured", async () => {
    delete process.env.CLERK_JWT_ISSUER_DOMAIN;
    const { t } = await fixture();
    expect((await rpc(t, await sign(key), "tools/list")).status).toBe(503);
  });
});

describe("MCP with opaque Clerk tokens", () => {
  const verifyUrl = "https://api.clerk.com/v1/oauth_applications/access_tokens/verify";
  const active = (overrides: Record<string, unknown> = {}) => ({
    object: "clerk_idp_oauth_access_token",
    client_id: "https://claude.ai/oauth/mcp-oauth-client-metadata",
    subject: "clerk_athlete",
    scopes: ["openid", "profile", "email"],
    revoked: false,
    expired: false,
    expiration: Math.floor(Date.now() / 1000) + 600,
    aud: [RESOURCE],
    ...overrides,
  });
  const clerkSays = (status: number, body: unknown) => {
    const verifyCalls: string[] = [];
    jest.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      if (String(input) === verifyUrl) {
        verifyCalls.push(JSON.parse(String(init?.body)).access_token);
        return new Response(JSON.stringify(body), { status });
      }
      return new Response("not found", { status: 404 });
    });
    return verifyCalls;
  };

  beforeEach(() => {
    process.env.CLERK_SECRET_KEY = "sk_test_example";
  });

  it("runs a tool as the athlete Clerk reports for the token", async () => {
    const { t, dayOne } = await fixture();
    const calls = clerkSays(200, active());
    const result = await callTool(t, "oat_Claude123", "read_today");
    expect(result.isError).toBe(false);
    expect(result.structuredContent.templateId).toBe(dayOne);
    expect(calls).toEqual(["oat_Claude123"]);
  });

  it.each([
    ["for another resource", 200, active({ aud: ["https://other.example.com/mcp"] })],
    ["with no audience", 200, active({ aud: undefined })],
    ["that was revoked", 200, active({ revoked: true })],
    ["that expired", 200, active({ expired: true })],
    ["that Clerk does not know", 404, { errors: [{ code: "oauth_access_token_not_found" }] }],
  ])("rejects an opaque token %s", async (_label, status, body) => {
    const { t } = await fixture();
    clerkSays(status, body);
    const refused = await rpc(t, "oat_Claude123", "tools/list");
    expect(refused.status).toBe(401);
    expect(refused.challenge).toContain('error="invalid_token"');
  });

  it("refuses opaque tokens when the server has no Clerk secret", async () => {
    delete process.env.CLERK_SECRET_KEY;
    const { t } = await fixture();
    const calls = clerkSays(200, active());
    expect((await rpc(t, "oat_Claude123", "tools/list")).status).toBe(401);
    expect(calls).toHaveLength(0);
  });

  it("answers 503, not a sign-in challenge, when Clerk is unreachable", async () => {
    const { t } = await fixture();
    clerkSays(502, {});
    const result = await rpc(t, "oat_Claude123", "tools/list");
    expect(result.status).toBe(503);
    expect(result.challenge).toBeNull();
  });
});

describe("MCP protocol", () => {
  it("negotiates a protocol version both sides speak", async () => {
    const { t } = await fixture();
    const unknown = await rpc(t, await sign(key), "initialize", { protocolVersion: "1999-01-01" });
    expect(unknown.body.result.protocolVersion).toBe(SUPPORTED_PROTOCOL_VERSIONS[0]);
  });

  it("describes every tool it can call", () => {
    for (const tool of TOOLS) {
      expect({ name: tool.name, long: tool.description.length > 20 }).toEqual({ name: tool.name, long: true });
      expect(tool.inputSchema).toMatchObject({ type: "object" });
    }
  });
});
