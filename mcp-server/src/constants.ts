/** Shared constants for the Trackitt MCP server. */

export const SERVER_NAME = "trackitt-mcp-server";
export const SERVER_VERSION = "1.0.0";

/** Supabase tables (must match supabase/schema.sql in the main app). */
export const JOBS_TABLE = "job_applications";
export const WATCHLIST_TABLE = "company_watchlist";

/** Default page size for list tools. */
export const DEFAULT_LIMIT = 25;
export const MAX_LIMIT = 100;

/** Hard cap on response size so we never flood the model's context. */
export const CHARACTER_LIMIT = 25000;
