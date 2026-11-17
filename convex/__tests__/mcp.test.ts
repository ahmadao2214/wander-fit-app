import { api } from "../_generated/api";
import { SUPPORTED_PROTOCOL_VERSIONS, TOOLS } from "../mcpProtocol";
import { fixture } from "../../jest/chatHandsFixture";

type Fetcher = { fetch: (path: string, init?: RequestInit) => Promise<Response> };

let nextId = 1;
async function rpc(client: Fetcher, method: string, params?: unknown) {
  const response = await client.fetch("/mcp", {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc: "2.0", id: nextId++, method, params }),
  });
  return { status: response.status, body: await response.json() };
}

async function callTool(client: Fetcher, name: string, args: Record<string, unknown> = {}) {
  const { body } = await rpc(client, "tools/call", { name, arguments: args });
  return body.result as { structuredContent?: any; content: { text: string }[]; isError: boolean };
}

describe("MCP endpoint", () => {
  it("refuses a request with no signed-in athlete", async () => {
    const { t } = await fixture();
    const { status, body } = await rpc(t, "tools/list");
    expect(status).toBe(401);
    expect(body.error.code).toBe(-32001);
  });

  it("initializes with a protocol version both sides speak", async () => {
    const { asAthlete } = await fixture();
    const { body } = await rpc(asAthlete, "initialize", {
      protocolVersion: "2025-06-18",
      capabilities: {},
      clientInfo: { name: "test", version: "1" },
    });
    expect(body.result.protocolVersion).toBe("2025-06-18");
    expect(body.result.capabilities.tools).toBeDefined();
    expect(body.result.instructions).toMatch(/only when a tool returned it/);

    const unknown = await rpc(asAthlete, "initialize", { protocolVersion: "1999-01-01" });
    expect(unknown.body.result.protocolVersion).toBe(SUPPORTED_PROTOCOL_VERSIONS[0]);
  });

  it("answers a notification with 202 and no body", async () => {
    const { asAthlete } = await fixture();
    const response = await asAthlete.fetch("/mcp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
    });
    expect(response.status).toBe(202);
  });

  it("lists the hands and no easier-or-harder write", async () => {
    const { asAthlete } = await fixture();
    const { body } = await rpc(asAthlete, "tools/list");
    const names = body.result.tools.map((tool: { name: string }) => tool.name);
    const listed = await asAthlete.query(api.chatHands.listTools, {});
    expect(names).toEqual(listed.tools);
    expect(names).not.toContain("easier_or_harder");
    for (const tool of body.result.tools) {
      expect(tool.annotations.readOnlyHint).toBe(!tool.name.startsWith("commit_"));
    }
  });

  it("reads today over MCP as the same workout the app shows", async () => {
    const { asAthlete, dayOne, squat, hinge } = await fixture();
    const screen = await asAthlete.query(api.scheduleOverrides.getTodayWorkout, {});
    const result = await callTool(asAthlete, "read_today");

    expect(result.isError).toBe(false);
    expect(result.structuredContent.templateId).toBe(dayOne);
    expect(result.structuredContent.name).toBe(screen?.name);
    expect(result.structuredContent.exerciseIds).toEqual([squat, hinge]);
    expect(result.structuredContent.exerciseNames).toEqual(
      screen?.exercises.map((row: { exercise?: { name: string } }) => row.exercise?.name),
    );
    expect(JSON.parse(result.content[0].text)).toEqual(result.structuredContent);
  });

  it("writes a reorder over MCP only after acceptance", async () => {
    const { asAthlete, sessionId, squat, hinge } = await fixture();
    const today = (await callTool(asAthlete, "read_today")).structuredContent;
    const preview = (
      await callTool(asAthlete, "preview_reorder", { sessionId, exerciseOrder: [1, 0] })
    ).structuredContent;
    expect(preview.exerciseIds).toEqual([hinge, squat]);

    const declined = await callTool(asAthlete, "commit_reorder", {
      sessionId,
      exerciseOrder: [1, 0],
      version: preview.version,
      accepted: false,
    });
    expect(declined.structuredContent).toEqual({ written: false, reason: "not_accepted" });
    expect((await callTool(asAthlete, "read_today")).structuredContent.exerciseIds).toEqual(
      today.exerciseIds,
    );

    const accepted = await callTool(asAthlete, "commit_reorder", {
      sessionId,
      exerciseOrder: [1, 0],
      version: preview.version,
      accepted: true,
    });
    expect(accepted.structuredContent).toEqual({ written: true, reason: "ok" });
    expect((await callTool(asAthlete, "read_today")).structuredContent.exerciseIds).toEqual([
      hinge,
      squat,
    ]);
  });

  it("says there is no program instead of inventing one", async () => {
    const { t } = await fixture();
    await t.run(async (ctx) => {
      await ctx.db.insert("users", {
        email: "new@example.com",
        name: "New",
        clerkId: "clerk_new",
        createdAt: Date.now(),
      });
    });
    const asNew = t.withIdentity({ subject: "clerk_new", email: "new@example.com" });
    const result = await callTool(asNew, "read_program");
    expect(result.structuredContent.program).toBeNull();
    expect(result.structuredContent.message).toMatch(/intake is not finished/);
  });

  it("returns a bad argument as a tool error the chat can read", async () => {
    const { asAthlete } = await fixture();
    const result = await callTool(asAthlete, "read_day", { slot: { phase: "XYZ", week: 1, day: 1 } });
    expect(result.isError).toBe(true);
  });

  it("rejects an unknown tool and an unknown method", async () => {
    const { asAthlete } = await fixture();
    const tool = await rpc(asAthlete, "tools/call", { name: "easier_or_harder", arguments: {} });
    expect(tool.body.error.code).toBe(-32602);
    const method = await rpc(asAthlete, "resources/list");
    expect(method.body.error.code).toBe(-32601);
  });

  it("describes every tool it can call", () => {
    for (const tool of TOOLS) {
      expect(tool.description.length).toBeGreaterThan(20);
      expect(tool.inputSchema).toMatchObject({ type: "object" });
    }
  });
});
