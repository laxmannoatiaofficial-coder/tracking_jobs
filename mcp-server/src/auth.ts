/**
 * Per-request authentication.
 *
 * Every MCP request must identify which Trackitt user it acts on behalf of.
 * We build a Supabase client scoped to that user's JWT, so the database's
 * Row Level Security policies (auth.uid() = user_id) enforce isolation — this
 * server never holds the service-role key and physically cannot touch another
 * user's rows.
 *
 * Two ways to authenticate (checked in this order):
 *   1. Authorization: Bearer <supabase-access-token>   (preferred — no password on the wire)
 *   2. x-trackitt-email + x-trackitt-password headers  (server exchanges them for a token)
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { IncomingHttpHeaders } from "node:http";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

/** Thrown when a request cannot be authenticated. Mapped to HTTP 401. */
export class AuthError extends Error {}

export interface AuthContext {
  /** Supabase client scoped to the authenticated user's JWT. */
  supabase: SupabaseClient;
  /** The authenticated user's id (auth.users.id). */
  userId: string;
}

function readHeader(headers: IncomingHttpHeaders, name: string): string | undefined {
  const value = headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

function userScopedClient(accessToken: string): SupabaseClient {
  return createClient(SUPABASE_URL as string, SUPABASE_ANON_KEY as string, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

export async function authenticate(headers: IncomingHttpHeaders): Promise<AuthContext> {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new AuthError(
      "Server misconfigured: SUPABASE_URL and SUPABASE_ANON_KEY environment variables must be set.",
    );
  }

  const authorization = readHeader(headers, "authorization");
  const email = readHeader(headers, "x-trackitt-email");
  const password = readHeader(headers, "x-trackitt-password");

  let accessToken: string | undefined;

  if (authorization?.startsWith("Bearer ")) {
    accessToken = authorization.slice("Bearer ".length).trim();
  } else if (email && password) {
    const signInClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await signInClient.auth.signInWithPassword({ email, password });
    if (error || !data.session) {
      throw new AuthError(
        "Invalid Trackitt credentials. Check the x-trackitt-email and x-trackitt-password headers.",
      );
    }
    accessToken = data.session.access_token;
  } else {
    throw new AuthError(
      "Missing credentials. Provide either an 'Authorization: Bearer <token>' header or both " +
        "'x-trackitt-email' and 'x-trackitt-password' headers.",
    );
  }

  const supabase = userScopedClient(accessToken);

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    throw new AuthError("Could not resolve a user from the provided credentials/token.");
  }

  return { supabase, userId: userData.user.id };
}
