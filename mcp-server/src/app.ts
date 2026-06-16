/**
 * Express app exposing the MCP server over Streamable HTTP (stateless JSON).
 *
 * A fresh McpServer + transport is built per request, scoped to the user the
 * request authenticated as. Stateless mode (sessionIdGenerator: undefined +
 * enableJsonResponse) suits serverless/Netlify and avoids request-id collisions.
 */

import express, { type Request, type Response } from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { AuthError, authenticate } from "./auth.js";
import { buildServer } from "./server.js";

export const app = express();
app.use(express.json({ limit: "1mb" }));

// Health check.
app.get("/health", (_req: Request, res: Response) => {
  res.json({ ok: true, server: "trackitt-mcp-server" });
});

// Accept both the clean path and the raw Netlify function path.
const MCP_PATHS = ["/mcp", "/.netlify/functions/mcp"];

async function handleMcpPost(req: Request, res: Response): Promise<void> {
  try {
    const ctx = await authenticate(req.headers);
    const server = buildServer(ctx);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
      enableJsonResponse: true,
    });
    res.on("close", () => {
      transport.close();
      server.close();
    });
    await server.connect(transport);
    await transport.handleRequest(req, res, req.body);
  } catch (err) {
    if (res.headersSent) return;
    if (err instanceof AuthError) {
      res.status(401).json({
        jsonrpc: "2.0",
        error: { code: -32001, message: err.message },
        id: null,
      });
      return;
    }
    res.status(500).json({
      jsonrpc: "2.0",
      error: { code: -32603, message: "Internal server error" },
      id: null,
    });
  }
}

app.post(MCP_PATHS, handleMcpPost);

// Stateless server: no SSE GET stream and no session DELETE.
function methodNotAllowed(_req: Request, res: Response): void {
  res.status(405).json({
    jsonrpc: "2.0",
    error: { code: -32000, message: "Method not allowed. Use POST for MCP requests." },
    id: null,
  });
}
app.get(MCP_PATHS, methodNotAllowed);
app.delete(MCP_PATHS, methodNotAllowed);
