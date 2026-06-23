import { NextResponse } from 'next/server';

// AI features (paste-to-autofill, follow-up draft, interview prep) all funnel
// through this one server-side route. It talks to an OpenAI-compatible gateway
// (SilkDock by default) using a key read from the server environment only —
// the key is never sent to the browser, never logged, and `.env.local` is
// git-ignored.

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function config() {
  return {
    apiKey: process.env.AI_API_KEY,
    baseUrl: (process.env.AI_BASE_URL || 'https://api.silkdock.ai/v1').replace(
      /\/$/,
      '',
    ),
    model: process.env.AI_MODEL || 'claude-sonnet-4.6',
  };
}

// ── helpers ──────────────────────────────────────────────────────────────

/** Call the gateway's OpenAI-compatible chat endpoint, return the text reply. */
async function ask(opts: {
  system: string;
  user: string;
  maxTokens: number;
}): Promise<string> {
  const { apiKey, baseUrl, model } = config();
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: opts.maxTokens,
      messages: [
        { role: 'system', content: opts.system },
        { role: 'user', content: opts.user },
      ],
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Gateway ${res.status}: ${detail.slice(0, 300)}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  return typeof content === 'string' ? content.trim() : '';
}

/** Tolerantly pull a JSON object out of a model response. */
function parseJsonObject(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('Model did not return JSON');
  return JSON.parse(raw.slice(start, end + 1));
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const strArray = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

/** Strip an HTML page down to readable text. */
function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Extract plain text from an uploaded JD file (PDF / DOCX / plain text). */
async function fileToText(file: File): Promise<string> {
  const name = (file.name || '').toLowerCase();
  const buf = Buffer.from(await file.arrayBuffer());
  if (name.endsWith('.pdf') || file.type === 'application/pdf') {
    const { getDocumentProxy, extractText } = await import('unpdf');
    const pdf = await getDocumentProxy(new Uint8Array(buf));
    const { text } = await extractText(pdf, { mergePages: true });
    return Array.isArray(text) ? text.join('\n') : text;
  }
  if (name.endsWith('.docx')) {
    const mammoth = await import('mammoth');
    const { value } = await mammoth.extractRawText({ buffer: buf });
    return value;
  }
  // .txt / .md / .csv / unknown → best-effort decode
  return buf.toString('utf8');
}

/** Compact, model-friendly summary of a job for follow-up / prep prompts. */
function jobSummary(job: Record<string, unknown>): string {
  return [
    `Company: ${str(job.company_name) || 'Unknown'}`,
    `Role: ${str(job.role) || 'Unknown'}`,
    str(job.industry) && `Industry: ${str(job.industry)}`,
    str(job.role_type) && `Employment type: ${str(job.role_type)}`,
    str(job.location_type) &&
      `Location: ${str(job.location_type)}${
        str(job.location_city) ? ` (${str(job.location_city)})` : ''
      }`,
    str(job.status) && `Current application status: ${str(job.status)}`,
    str(job.date_of_application) &&
      `Date applied: ${str(job.date_of_application)}`,
    str(job.follow_up_date) && `Follow-up date: ${str(job.follow_up_date)}`,
    str(job.jd_text) && `\nJob description:\n${str(job.jd_text).slice(0, 6000)}`,
  ]
    .filter(Boolean)
    .join('\n');
}

// ── tasks ────────────────────────────────────────────────────────────────

/** The core: turn JD text into structured form fields. */
async function extractFromText(text: string) {
  const clipped = text.slice(0, 12000);
  if (!clipped.trim()) {
    return NextResponse.json({ error: 'No job description text found' }, { status: 400 });
  }
  const raw = await ask({
    maxTokens: 1024,
    system:
      'You extract structured data from job postings for a job-application ' +
      'tracker. Respond with ONLY a JSON object — no markdown, no commentary.',
    user:
      'Extract these fields from the job posting below. Use an empty string ' +
      '"" when a field is not stated — never invent values.\n\n' +
      'Return exactly this shape:\n' +
      '{"company_name":"","role":"","industry":"","location_city":"",' +
      '"location_type":"","role_type":"","ctc":"","compensation_period":""}\n\n' +
      'Rules:\n' +
      '- location_type: one of "Remote", "Hybrid", "On-site", or "".\n' +
      '- role_type: one of "Full-time", "Part-time", "Internship", "Contract", or "".\n' +
      '- compensation_period: "Annual" or "Monthly" (or "") matching how pay is stated.\n' +
      '- ctc: pay as a short human string (e.g. "12 LPA", "$120k", "₹50,000"); "" if absent.\n' +
      '- location_city: city name for on-site/hybrid roles; "" if remote/unspecified.\n' +
      '- industry: a short label like "FinTech" or "SaaS".\n\n' +
      `Job posting:\n"""\n${clipped}\n"""`,
  });
  const d = parseJsonObject(raw) as Record<string, unknown>;
  return NextResponse.json({
    company_name: str(d.company_name),
    role: str(d.role),
    industry: str(d.industry),
    location_city: str(d.location_city),
    location_type: str(d.location_type),
    role_type: str(d.role_type),
    ctc: str(d.ctc),
    compensation_period: str(d.compensation_period),
  });
}

async function extractUrl(payload: Record<string, unknown>) {
  const url = str(payload.url).trim();
  if (!/^https?:\/\//i.test(url)) {
    return NextResponse.json({ error: 'Enter a valid http(s) link' }, { status: 400 });
  }
  let html = '';
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; Trackitt/1.0)' },
      redirect: 'follow',
    });
    if (!res.ok) throw new Error(`status ${res.status}`);
    html = await res.text();
  } catch {
    return NextResponse.json(
      {
        error:
          "Couldn't open that link. Paste the description text or upload the file instead.",
      },
      { status: 422 },
    );
  }
  return extractFromText(htmlToText(html));
}

async function followUp(payload: Record<string, unknown>) {
  const job = (payload.job as Record<string, unknown>) ?? {};
  const raw = await ask({
    maxTokens: 1024,
    system:
      'You help a job seeker write concise, warm, professional follow-up ' +
      'emails to recruiters/hiring managers. Respond with ONLY a JSON object.',
    user:
      'Write a brief follow-up email for this application. Keep the body under ' +
      '130 words, polite and specific to the role, not pushy. Reiterate ' +
      'interest and invite next steps. End with "Best regards," then a new ' +
      'line "[Your name]". Do not invent facts not given.\n\n' +
      'Return exactly: {"subject":"","body":""}\n\n' +
      jobSummary(job),
  });
  const d = parseJsonObject(raw) as Record<string, unknown>;
  return NextResponse.json({ subject: str(d.subject), body: str(d.body) });
}

async function interviewPrep(payload: Record<string, unknown>) {
  const job = (payload.job as Record<string, unknown>) ?? {};
  const raw = await ask({
    maxTokens: 2048,
    system: 'You are an interview coach. Respond with ONLY a JSON object.',
    user:
      'Based on the role below, produce likely interview questions and ' +
      'talking points tailored to it. Give 6–8 questions (mix of behavioral ' +
      'and role-specific) and 4–5 concise talking points the candidate should ' +
      'be ready to make. Be specific to the role and company where possible.\n\n' +
      'Return exactly: {"questions":["..."],"talking_points":["..."]}\n\n' +
      jobSummary(job),
  });
  const d = parseJsonObject(raw) as Record<string, unknown>;
  return NextResponse.json({
    questions: strArray(d.questions),
    talking_points: strArray(d.talking_points),
  });
}

// ── handlers ─────────────────────────────────────────────────────────────

/** Discovery helper: list the model ids the gateway exposes (so we can set the
 *  correct AI_MODEL). Returns ids only — no secrets. */
export async function GET() {
  const { apiKey, baseUrl } = config();
  if (!apiKey) {
    return NextResponse.json({ error: 'AI is not configured yet.' }, { status: 503 });
  }
  try {
    const res = await fetch(`${baseUrl}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const data = await res.json().catch(() => ({}));
    const ids = Array.isArray(data?.data)
      ? data.data.map((m: { id?: string }) => m.id).filter(Boolean)
      : [];
    return NextResponse.json({ models: ids }, { status: res.ok ? 200 : res.status });
  } catch {
    return NextResponse.json({ error: 'Could not reach the AI gateway.' }, { status: 502 });
  }
}

export async function POST(req: Request) {
  const { apiKey } = config();
  if (!apiKey) {
    return NextResponse.json(
      { error: 'AI is not configured yet. Add AI_API_KEY to continue.' },
      { status: 503 },
    );
  }

  const contentType = req.headers.get('content-type') || '';

  try {
    // File upload (autofill from a PDF / DOCX / text file).
    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file');
      if (!(file instanceof File)) {
        return NextResponse.json({ error: 'No file provided' }, { status: 400 });
      }
      let text: string;
      try {
        text = await fileToText(file);
      } catch {
        return NextResponse.json(
          {
            error:
              "Couldn't read that file. Try a PDF/DOCX, or paste the text instead.",
          },
          { status: 422 },
        );
      }
      return await extractFromText(text);
    }

    // JSON tasks.
    let body: { task?: string; payload?: Record<string, unknown> };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }
    const payload = body.payload ?? {};
    switch (body.task) {
      case 'extract':
        return await extractFromText(str(payload.text));
      case 'extract-url':
        return await extractUrl(payload);
      case 'follow-up':
        return await followUp(payload);
      case 'interview-prep':
        return await interviewPrep(payload);
      default:
        return NextResponse.json({ error: 'Unknown task' }, { status: 400 });
    }
  } catch (err) {
    // Log server-side only; never surface internals (or the key) to the client.
    console.error('[ai] task failed:', err instanceof Error ? err.message : err);
    return NextResponse.json(
      { error: 'The AI request failed. Please try again.' },
      { status: 502 },
    );
  }
}
