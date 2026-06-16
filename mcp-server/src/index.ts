#!/usr/bin/env node
/**
 * Standalone entry point — runs the MCP server as a long-lived HTTP service.
 * Use this for local testing or hosts like Render / Railway / Fly.
 * (On Netlify the same `app` is wrapped by netlify/functions/mcp.ts instead.)
 */

import { app } from "./app.js";

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.error("ERROR: SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required.");
  process.exit(1);
}

const port = parseInt(process.env.PORT || "3333", 10);
app.listen(port, () => {
  console.error(`trackitt-mcp-server listening on http://localhost:${port}/mcp`);
});
