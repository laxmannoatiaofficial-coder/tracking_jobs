/** Company-watchlist tools: list / create / update / delete. */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AuthContext } from "../auth.js";
import { WATCHLIST_TABLE } from "../constants.js";
import { errorResult, jsonResult } from "../format.js";
import {
  createWatchlistShape,
  deleteWatchlistShape,
  listWatchlistShape,
  updateWatchlistShape,
  type CreateWatchlistInput,
  type DeleteWatchlistInput,
  type ListWatchlistInput,
  type UpdateWatchlistInput,
} from "../schemas.js";

function definedOnly<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}

function summarizeEntry(e: Record<string, unknown>): string {
  const title = e.kind === "Job" && e.role ? `${e.company_name} — ${e.role}` : String(e.company_name);
  const lines = [
    `**${title}** (${e.kind})`,
    `  ${e.industry ? `industry: ${e.industry} · ` : ""}${e.location ? `location: ${e.location}` : ""}`.trimEnd(),
    e.website_url ? `  ${e.website_url}` : "",
    `  id: ${e.id}`,
  ].filter(Boolean);
  return lines.join("\n");
}

export function registerWatchlistTools(server: McpServer, ctx: AuthContext): void {
  const { supabase, userId } = ctx;

  server.registerTool(
    "trackitt_list_watchlist",
    {
      title: "List watchlist entries",
      description: `List the signed-in user's company/job watchlist, newest first.

Args:
  - kind ('Company'|'Job', optional): filter by entry kind
  - company (string, optional): case-insensitive partial match on company name
  - limit (number 1-100, default 25), offset (number, default 0)
  - response_format ('markdown'|'json', default 'markdown')

Returns: { total, count, offset, has_more, next_offset?, entries: [...] }. Each entry includes its id
(needed for update/delete), kind, company_name, role, industry, website_url, location, note.`,
      inputSchema: listWatchlistShape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (input: ListWatchlistInput) => {
      try {
        let query = supabase
          .from(WATCHLIST_TABLE)
          .select("*", { count: "exact" })
          .order("created_at", { ascending: false })
          .range(input.offset, input.offset + input.limit - 1);

        if (input.kind) query = query.eq("kind", input.kind);
        if (input.company) query = query.ilike("company_name", `%${input.company}%`);

        const { data, error, count } = await query;
        if (error) return errorResult(error.message);

        const entries = data ?? [];
        const total = count ?? entries.length;
        const hasMore = total > input.offset + entries.length;

        if (input.response_format === "json") {
          return jsonResult({
            total,
            count: entries.length,
            offset: input.offset,
            has_more: hasMore,
            ...(hasMore ? { next_offset: input.offset + entries.length } : {}),
            entries,
          });
        }

        const header = `# ${total} watchlist entry(ies) (showing ${entries.length})`;
        const body = entries.length ? entries.map(summarizeEntry).join("\n\n") : "_Watchlist is empty._";
        const footer = hasMore ? `\n\n_More available — call again with offset=${input.offset + entries.length}._` : "";
        return {
          content: [{ type: "text", text: `${header}\n\n${body}${footer}` }],
          structuredContent: { total, count: entries.length, offset: input.offset, has_more: hasMore, entries },
        };
      } catch (err) {
        return errorResult(err instanceof Error ? err.message : String(err));
      }
    },
  );

  server.registerTool(
    "trackitt_create_watchlist_entry",
    {
      title: "Add a watchlist entry",
      description: `Add a company or job posting to the watchlist (companies/jobs to apply to later).

Required: company_name.
Optional: kind ('Company'|'Job', default 'Company'), role (for kind 'Job'), industry, website_url,
location, note.

Returns: { entry: { ...created row including its new id } }.`,
      inputSchema: createWatchlistShape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (input: CreateWatchlistInput) => {
      try {
        const row = { ...definedOnly(input), user_id: userId };
        const { data, error } = await supabase.from(WATCHLIST_TABLE).insert(row).select().single();
        if (error) return errorResult(error.message);
        return jsonResult({ entry: data });
      } catch (err) {
        return errorResult(err instanceof Error ? err.message : String(err));
      }
    },
  );

  server.registerTool(
    "trackitt_update_watchlist_entry",
    {
      title: "Update a watchlist entry",
      description: `Update fields on an existing watchlist entry. Only the fields you pass are changed.

Required: id (uuid). Returns: { entry: { ...updated row } }, or an error if no entry with that id
belongs to the user.`,
      inputSchema: updateWatchlistShape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (input: UpdateWatchlistInput) => {
      try {
        const { id, ...rest } = input;
        const patch = definedOnly(rest);
        if (Object.keys(patch).length === 0) {
          return errorResult("Nothing to update — pass at least one field besides id.");
        }
        const { data, error } = await supabase
          .from(WATCHLIST_TABLE)
          .update(patch)
          .eq("id", id)
          .select()
          .maybeSingle();
        if (error) return errorResult(error.message);
        if (!data) return errorResult(`No watchlist entry found with id ${id}.`);
        return jsonResult({ entry: data });
      } catch (err) {
        return errorResult(err instanceof Error ? err.message : String(err));
      }
    },
  );

  server.registerTool(
    "trackitt_delete_watchlist_entry",
    {
      title: "Delete a watchlist entry",
      description: `Permanently delete a watchlist entry by id. This cannot be undone.

Required: id (uuid). Returns: { deleted: true, id } on success.`,
      inputSchema: deleteWatchlistShape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (input: DeleteWatchlistInput) => {
      try {
        const { data, error } = await supabase
          .from(WATCHLIST_TABLE)
          .delete()
          .eq("id", input.id)
          .select("id");
        if (error) return errorResult(error.message);
        if (!data || data.length === 0) {
          return errorResult(`No watchlist entry found with id ${input.id}.`);
        }
        return jsonResult({ deleted: true, id: input.id });
      } catch (err) {
        return errorResult(err instanceof Error ? err.message : String(err));
      }
    },
  );
}
