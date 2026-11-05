import { connection } from "next/server";
import { analyzeReport } from "@/lib/analysis";
import { CATEGORIES, PRIORITIES, type Analysis, type Category, type Priority } from "@/lib/types";

const OPENAI_MODEL = "gpt-4o-mini";

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).slice(0, 6);
}

function normalizeAnalysis(value: unknown): Analysis | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const category = record.category;
  const priority = record.priority;

  if (typeof category !== "string" || !CATEGORIES.includes(category as Category)) return null;
  if (typeof priority !== "string" || !PRIORITIES.includes(priority as Priority)) return null;
  if (typeof record.summary !== "string" || record.summary.trim().length === 0) return null;
  if (typeof record.recommended_action !== "string" || record.recommended_action.trim().length === 0) return null;

  let confidence = typeof record.confidence === "number" ? record.confidence : 0.5;
  if (confidence > 1) confidence = confidence / 100;
  confidence = Math.max(0, Math.min(1, Math.round(confidence * 100) / 100));

  const keyIssues = [...new Set(asStringArray(record.key_issues))];
  const missing = [...new Set(asStringArray(record.missing_information))];

  return {
    category: category as Category,
    priority: priority as Priority,
    summary: record.summary.trim(),
    key_issues: keyIssues.length > 0 ? keyIssues : ["See the original report"],
    recommended_action: record.recommended_action.trim(),
    requires_follow_up:
      typeof record.requires_follow_up === "boolean" ? record.requires_follow_up : priority !== "Low",
    confidence,
    missing_information: missing.length > 0 ? missing : ["None noted by the analysis"],
  };
}

async function analyzeWithOpenAI(description: string, apiKey: string): Promise<Analysis> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You classify accessibility barrier reports for a community organization. Use only facts in the report. Do not invent measurements, names, causes, or events. Return JSON with category (Mobility, Visual Accessibility, Hearing Accessibility, Infrastructure, Signage and Navigation, or Other), priority (High, Medium, or Low), summary (one sentence from the report), key_issues (string array), recommended_action (one next step), requires_follow_up (boolean), confidence (number from 0 to 1), and missing_information (string array of facts the report does not include). High priority means blocked access, danger, an outage, or people unable to get in.",
        },
        { role: "user", content: description },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI request failed with status ${response.status}`);
  }

  const payload: unknown = await response.json();
  const content =
    payload &&
    typeof payload === "object" &&
    "choices" in payload &&
    Array.isArray(payload.choices)
      ? payload.choices[0]?.message?.content
      : null;

  if (typeof content !== "string") {
    throw new Error("OpenAI response did not include JSON content");
  }

  const analysis = normalizeAnalysis(JSON.parse(content));
  if (!analysis) {
    throw new Error("OpenAI response did not match the expected analysis shape");
  }

  return analysis;
}

export async function GET() {
  // Read the environment at request time instead of prerendering the mode at build time.
  await connection();
  return Response.json({
    mode: process.env.OPENAI_API_KEY ? "openai" : "rule-based",
  });
}

export async function POST(request: Request) {
  let description = "";

  try {
    const body: unknown = await request.json();
    if (body && typeof body === "object" && "description" in body && typeof body.description === "string") {
      description = body.description.trim();
    }
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (description.length < 10) {
    return Response.json({ error: "Description must be at least 10 characters." }, { status: 400 });
  }

  description = description.slice(0, 4000);

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return Response.json({ ...analyzeReport(description), source: "rule-based" as const });
  }

  try {
    const analysis = await analyzeWithOpenAI(description, apiKey);
    return Response.json({ ...analysis, source: "openai" as const });
  } catch {
    return Response.json({ ...analyzeReport(description), source: "rule-based" as const });
  }
}
