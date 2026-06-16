/**
 * Netlify Function wrapper.
 *
 * `npm run build` compiles src/ -> dist/ first; esbuild then bundles this file
 * (and the dist code it imports) into the deployed function. Reachable at
 * /.netlify/functions/mcp, and at /mcp via the redirect in netlify.toml.
 */

import serverless from "serverless-http";
import { app } from "../../dist/app.js";

export const handler = serverless(app);
