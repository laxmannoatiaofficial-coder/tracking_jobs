/**
 * Zod schemas mirroring the Trackitt data model (see types/index.ts and
 * supabase/schema.sql in the main app). These both validate tool input at
 * runtime and lock enum fields to the exact values the app expects.
 */

import { z } from "zod";

// ── Enums (must match types/index.ts) ───────────────────────────────────────
export const JobStatusEnum = z.enum([
  "Applied",
  "Shortlisted",
  "Interviewing",
  "Offered",
  "Rejected",
  "Ghosted",
]);

export const RoleTypeEnum = z.enum(["Full-time", "Part-time", "Internship", "Contract"]);
export const CompensationPeriodEnum = z.enum(["Annual", "Monthly"]);
export const LocationTypeEnum = z.enum(["On-site", "Remote", "Hybrid"]);
export const WatchlistKindEnum = z.enum(["Company", "Job"]);

export const ResponseFormatEnum = z.enum(["markdown", "json"]);

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

// ── Jobs ─────────────────────────────────────────────────────────────────────

/** Raw shape for listing jobs. Passed directly to registerTool. */
export const listJobsShape = {
  status: JobStatusEnum.optional().describe("Filter to a single application status"),
  company: z
    .string()
    .min(1)
    .optional()
    .describe("Case-insensitive partial match on company name"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(25)
    .describe("Maximum number of jobs to return (default 25, max 100)"),
  offset: z
    .number()
    .int()
    .min(0)
    .default(0)
    .describe("Number of jobs to skip, for pagination"),
  response_format: ResponseFormatEnum.default("markdown").describe(
    "'markdown' for a readable summary or 'json' for full structured rows",
  ),
};

export const getJobShape = {
  id: z.string().uuid().describe("The job application's id (uuid)"),
};

/** Fields a user may set when creating a job. resume_url/resume_file_name are
 * intentionally omitted — file uploads go through the web app, not this MCP. */
export const createJobShape = {
  company_name: z.string().min(1).describe("Company name (required)"),
  role: z.string().min(1).describe("Job title / role (required)"),
  date_of_application: isoDate.describe("Date you applied, YYYY-MM-DD (required)"),
  status: JobStatusEnum.default("Applied").describe("Application status (default 'Applied')"),
  role_type: RoleTypeEnum.default("Full-time").describe("Employment type (default 'Full-time')"),
  location_type: LocationTypeEnum.default("Remote").describe(
    "Work arrangement (default 'Remote')",
  ),
  industry: z.string().optional().describe("Industry / domain"),
  ctc: z.string().optional().describe("Compensation as free text, e.g. '24 LPA' or '$120k'"),
  compensation_period: CompensationPeriodEnum.optional().describe(
    "Whether ctc is Annual or Monthly",
  ),
  location_city: z.string().optional().describe("City, when on-site or hybrid"),
  jd_url: z.string().url().optional().describe("Link to the job description"),
  jd_text: z.string().optional().describe("Pasted job-description text"),
  personal_note: z.string().optional().describe("Your private notes about this application"),
  follow_up_date: isoDate.optional().describe("Date to follow up, YYYY-MM-DD"),
  follow_up_done: z.boolean().optional().describe("Whether the follow-up is complete"),
};

/** Update: id is required; every other field is optional and patches in place. */
export const updateJobShape = {
  id: z.string().uuid().describe("The job application's id (uuid) to update"),
  company_name: z.string().min(1).optional(),
  role: z.string().min(1).optional(),
  date_of_application: isoDate.optional(),
  status: JobStatusEnum.optional(),
  role_type: RoleTypeEnum.optional(),
  location_type: LocationTypeEnum.optional(),
  industry: z.string().optional(),
  ctc: z.string().optional(),
  compensation_period: CompensationPeriodEnum.optional(),
  location_city: z.string().optional(),
  jd_url: z.string().url().optional(),
  jd_text: z.string().optional(),
  personal_note: z.string().optional(),
  follow_up_date: isoDate.optional(),
  follow_up_done: z.boolean().optional(),
};

export const deleteJobShape = {
  id: z.string().uuid().describe("The job application's id (uuid) to delete"),
};

// ── Watchlist ──────────────────────────────────────────────────────────────

export const listWatchlistShape = {
  kind: WatchlistKindEnum.optional().describe("Filter to 'Company' or 'Job' entries"),
  company: z
    .string()
    .min(1)
    .optional()
    .describe("Case-insensitive partial match on company name"),
  limit: z.number().int().min(1).max(100).default(25),
  offset: z.number().int().min(0).default(0),
  response_format: ResponseFormatEnum.default("markdown"),
};

export const createWatchlistShape = {
  company_name: z.string().min(1).describe("Company name (required)"),
  kind: WatchlistKindEnum.default("Company").describe(
    "'Company' for a whole company or 'Job' for a specific posting (default 'Company')",
  ),
  role: z.string().optional().describe("Job title — only meaningful when kind is 'Job'"),
  industry: z.string().optional(),
  website_url: z.string().url().optional().describe("Company or posting URL"),
  location: z.string().optional(),
  note: z.string().optional().describe("Why you're watching this"),
};

export const updateWatchlistShape = {
  id: z.string().uuid().describe("The watchlist entry's id (uuid) to update"),
  company_name: z.string().min(1).optional(),
  kind: WatchlistKindEnum.optional(),
  role: z.string().optional(),
  industry: z.string().optional(),
  website_url: z.string().url().optional(),
  location: z.string().optional(),
  note: z.string().optional(),
};

export const deleteWatchlistShape = {
  id: z.string().uuid().describe("The watchlist entry's id (uuid) to delete"),
};

// Inferred input types (z.object built from each shape).
export type ListJobsInput = z.infer<z.ZodObject<typeof listJobsShape>>;
export type GetJobInput = z.infer<z.ZodObject<typeof getJobShape>>;
export type CreateJobInput = z.infer<z.ZodObject<typeof createJobShape>>;
export type UpdateJobInput = z.infer<z.ZodObject<typeof updateJobShape>>;
export type DeleteJobInput = z.infer<z.ZodObject<typeof deleteJobShape>>;

export type ListWatchlistInput = z.infer<z.ZodObject<typeof listWatchlistShape>>;
export type CreateWatchlistInput = z.infer<z.ZodObject<typeof createWatchlistShape>>;
export type UpdateWatchlistInput = z.infer<z.ZodObject<typeof updateWatchlistShape>>;
export type DeleteWatchlistInput = z.infer<z.ZodObject<typeof deleteWatchlistShape>>;
