/** Helpers for building consistent MCP tool responses. */

import { CHARACTER_LIMIT } from "./constants.js";

type ToolResult = {
  content: { type: "text"; text: string }[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
};

/** A successful result carrying JSON-serializable structured data. */
export function jsonResult(data: Record<string, unknown>): ToolResult {
  let text = JSON.stringify(data, null, 2);
  if (text.length > CHARACTER_LIMIT) {
    text =
      text.slice(0, CHARACTER_LIMIT) +
      `\n\n... [truncated at ${CHARACTER_LIMIT} characters — narrow your query with filters or a smaller limit]`;
  }
  return {
    content: [{ type: "text", text }],
    structuredContent: data,
  };
}

/** An actionable error result (reported in-band, not as a protocol error). */
export function errorResult(message: string): ToolResult {
  return {
    isError: true,
    content: [{ type: "text", text: `Error: ${message}` }],
  };
}
