/** Builds an McpServer wired to a single authenticated user's Supabase client. */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AuthContext } from "./auth.js";
import { SERVER_NAME, SERVER_VERSION } from "./constants.js";
import { registerJobTools } from "./tools/jobs.js";
import { registerWatchlistTools } from "./tools/watchlist.js";

export function buildServer(ctx: AuthContext): McpServer {
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });
  registerJobTools(server, ctx);
  registerWatchlistTools(server, ctx);
  return server;
}
