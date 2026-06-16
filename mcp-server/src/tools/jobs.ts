/** Job-application tools: list / get / create / update / delete. */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { AuthContext } from "../auth.js";
import { JOBS_TABLE } from "../constants.js";
import { errorResult, jsonResult } from "../format.js";
import {
  createJobShape,
  deleteJobShape,
  getJobShape,
  listJobsShape,
  updateJobShape,
  type CreateJobInput,
  type DeleteJobInput,
  type GetJobInput,
  type ListJobsInput,
  type UpdateJobInput,
} from "../schemas.js";

/** Drop keys whose value is undefined so we only send fields the caller set. */
function definedOnly<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined)) as Partial<T>;
}

function summarizeJob(job: Record<string, unknown>): string {
  const parts = [
    `**${job.company_name}** — ${job.role}`,
    `  status: ${job.status} · type: ${job.role_type} · ${job.location_type}` +
      (job.location_city ? ` (${job.location_city})` : ""),
    `  applied: ${job.date_of_application}` +
      (job.follow_up_date ? ` · follow-up: ${job.follow_up_date}${job.follow_up_done ? " (done)" : ""}` : ""),
    `  id: ${job.id}`,
  ];
  return parts.join("\n");
}

export function registerJobTools(server: McpServer, ctx: AuthContext): void {
  const { supabase, userId } = ctx;

  server.registerTool(
    "trackitt_list_jobs",
    {
      title: "List job applications",
      description: `List the signed-in user's job applications, newest first, with optional filters.

Args:
  - status ('Applied'|'Shortlisted'|'Interviewing'|'Offered'|'Rejected'|'Ghosted', optional): filter by status
  - company (string, optional): case-insensitive partial match on company name
  - limit (number 1-100, default 25)
  - offset (number, default 0): for pagination
  - response_format ('markdown'|'json', default 'markdown')

Returns: { total, count, offset, has_more, next_offset?, jobs: [...] }. Each job includes its
id (needed for trackitt_update_job / trackitt_delete_job), company_name, role, status, role_type,
location_type, location_city, dates, ctc, notes, etc.`,
      inputSchema: listJobsShape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (input: ListJobsInput) => {
      try {
        let query = supabase
          .from(JOBS_TABLE)
          .select("*", { count: "exact" })
          .order("created_at", { ascending: false })
          .range(input.offset, input.offset + input.limit - 1);

        if (input.status) query = query.eq("status", input.status);
        if (input.company) query = query.ilike("company_name", `%${input.company}%`);

        const { data, error, count } = await query;
        if (error) return errorResult(error.message);

        const jobs = data ?? [];
        const total = count ?? jobs.length;
        const hasMore = total > input.offset + jobs.length;

        if (input.response_format === "json") {
          return jsonResult({
            total,
            count: jobs.length,
            offset: input.offset,
            has_more: hasMore,
            ...(hasMore ? { next_offset: input.offset + jobs.length } : {}),
            jobs,
          });
        }

        const header = `# ${total} job application(s)${input.status ? ` · status=${input.status}` : ""}` +
          `${input.company ? ` · company~"${input.company}"` : ""} (showing ${jobs.length})`;
        const body = jobs.length
          ? jobs.map(summarizeJob).join("\n\n")
          : "_No matching applications._";
        const footer = hasMore ? `\n\n_More available — call again with offset=${input.offset + jobs.length}._` : "";
        return {
          content: [{ type: "text", text: `${header}\n\n${body}${footer}` }],
          structuredContent: { total, count: jobs.length, offset: input.offset, has_more: hasMore, jobs },
        };
      } catch (err) {
        return errorResult(err instanceof Error ? err.message : String(err));
      }
    },
  );

  server.registerTool(
    "trackitt_get_job",
    {
      title: "Get a job application",
      description: `Fetch a single job application by its id, with every field.

Args:
  - id (uuid): the job's id (from trackitt_list_jobs)

Returns: { job: { ...all fields } }, or an error if no job with that id belongs to the user.`,
      inputSchema: getJobShape,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (input: GetJobInput) => {
      try {
        const { data, error } = await supabase
          .from(JOBS_TABLE)
          .select("*")
          .eq("id", input.id)
          .maybeSingle();
        if (error) return errorResult(error.message);
        if (!data) return errorResult(`No job application found with id ${input.id}.`);
        return jsonResult({ job: data });
      } catch (err) {
        return errorResult(err instanceof Error ? err.message : String(err));
      }
    },
  );

  server.registerTool(
    "trackitt_create_job",
    {
      title: "Create a job application",
      description: `Add a new job application for the signed-in user.

Required: company_name, role, date_of_application (YYYY-MM-DD).
Optional: status (default 'Applied'), role_type (default 'Full-time'), location_type (default 'Remote'),
industry, ctc, compensation_period ('Annual'|'Monthly'), location_city, jd_url, jd_text,
personal_note, follow_up_date, follow_up_done.

Returns: { job: { ...created row including its new id } }.`,
      inputSchema: createJobShape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: true,
      },
    },
    async (input: CreateJobInput) => {
      try {
        const row = { ...definedOnly(input), user_id: userId };
        const { data, error } = await supabase.from(JOBS_TABLE).insert(row).select().single();
        if (error) return errorResult(error.message);
        return jsonResult({ job: data });
      } catch (err) {
        return errorResult(err instanceof Error ? err.message : String(err));
      }
    },
  );

  server.registerTool(
    "trackitt_update_job",
    {
      title: "Update a job application",
      description: `Update fields on an existing job application. Only the fields you pass are changed.

Required: id (uuid). Common use: change status (e.g. to 'Interviewing'), set/clear follow_up_date,
mark follow_up_done, update ctc or personal_note.

Returns: { job: { ...updated row } }, or an error if no job with that id belongs to the user.`,
      inputSchema: updateJobShape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (input: UpdateJobInput) => {
      try {
        const { id, ...rest } = input;
        const patch = definedOnly(rest);
        if (Object.keys(patch).length === 0) {
          return errorResult("Nothing to update — pass at least one field besides id.");
        }
        const { data, error } = await supabase
          .from(JOBS_TABLE)
          .update(patch)
          .eq("id", id)
          .select()
          .maybeSingle();
        if (error) return errorResult(error.message);
        if (!data) return errorResult(`No job application found with id ${id}.`);
        return jsonResult({ job: data });
      } catch (err) {
        return errorResult(err instanceof Error ? err.message : String(err));
      }
    },
  );

  server.registerTool(
    "trackitt_delete_job",
    {
      title: "Delete a job application",
      description: `Permanently delete a job application by id. This cannot be undone.

Required: id (uuid). Returns: { deleted: true, id } on success.`,
      inputSchema: deleteJobShape,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: true,
        openWorldHint: true,
      },
    },
    async (input: DeleteJobInput) => {
      try {
        const { data, error } = await supabase
          .from(JOBS_TABLE)
          .delete()
          .eq("id", input.id)
          .select("id");
        if (error) return errorResult(error.message);
        if (!data || data.length === 0) {
          return errorResult(`No job application found with id ${input.id}.`);
        }
        return jsonResult({ deleted: true, id: input.id });
      } catch (err) {
        return errorResult(err instanceof Error ? err.message : String(err));
      }
    },
  );
}
