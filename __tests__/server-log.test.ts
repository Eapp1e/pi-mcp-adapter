import { afterEach, describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { McpServerManager } from "../server-manager.ts";

const fixture = fileURLToPath(new URL("./fixtures/logging-server.mjs", import.meta.url));

describe("server log messages", () => {
  const originalAgentDir = process.env.PI_CODING_AGENT_DIR;
  let manager: McpServerManager | undefined;
  let agentDir: string | undefined;

  afterEach(async () => {
    await manager?.closeAll();
    if (originalAgentDir === undefined) delete process.env.PI_CODING_AGENT_DIR;
    else process.env.PI_CODING_AGENT_DIR = originalAgentDir;
    if (agentDir) rmSync(agentDir, { recursive: true, force: true });
  });

  it("appends notifications/message to mcp.log in the agent directory", async () => {
    agentDir = mkdtempSync(join(tmpdir(), "server-log-agent-"));
    process.env.PI_CODING_AGENT_DIR = agentDir;
    manager = new McpServerManager();
    await manager.connect("db-server", { command: process.execPath, args: [fixture] });

    await manager.getConnection("db-server")!.client.callTool({ name: "log", arguments: {} });

    await expect.poll(() => readFileSync(join(agentDir!, "mcp.log"), "utf8"))
      .toMatch(/^\S+Z \[db-server\] warning db: pool exhausted\n {4}retrying\n$/);
  });
});
