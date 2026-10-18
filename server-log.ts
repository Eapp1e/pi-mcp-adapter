import { appendFileSync, mkdirSync, renameSync, statSync } from "node:fs";
import { dirname } from "node:path";
import type { LoggingMessageNotificationParams } from "@modelcontextprotocol/client";
import { logger } from "./logger.ts";

const MAX_LOG_BYTES = 5 * 1024 * 1024;

/**
 * Appends a server's `notifications/message` to `path` (`<agent dir>/mcp.log`), in the line format
 * Pi's built-in MCP uses. Several Pi processes share the file, so each message is one synchronous append.
 */
export function appendServerLogMessage(path: string, serverName: string, params: LoggingMessageNotificationParams): void {
  const source = params.logger ? ` ${params.logger}:` : "";
  const text = (typeof params.data === "string" ? params.data : JSON.stringify(params.data)).replace(/\r?\n/g, "\n    ");
  const line = `${new Date().toISOString()} [${serverName}] ${params.level}${source} ${text}\n`;
  try {
    mkdirSync(dirname(path), { recursive: true });
    if ((statSync(path, { throwIfNoEntry: false })?.size ?? 0) > MAX_LOG_BYTES) renameSync(path, `${path}.1`);
    appendFileSync(path, line);
  } catch (error) {
    // A server's log must never fail its connection or tool calls.
    logger.debug(`MCP: could not write ${serverName}'s log message to ${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
