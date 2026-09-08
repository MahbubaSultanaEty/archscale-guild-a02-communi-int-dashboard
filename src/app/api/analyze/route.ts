// app/api/analyze/route.ts

import { NextRequest, NextResponse } from "next/server";

// ─────────────────────────────────────────────────────────────────────────
// Local types (kept inside this file only — no other files are touched).
// Shape matches the existing AnalysisResponse type used by the frontend.
// ─────────────────────────────────────────────────────────────────────────

type Priority = "High" | "Medium" | "Low";

interface ActionItem {
  task: string;
  client: string;
  deadline: string;
  priority: Priority;
}

interface AnalysisResult {
  summary: string;
  decisions: string[];
  actionItems: ActionItem[];
}

// ─────────────────────────────────────────────────────────────────────────
// System prompt
// ─────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an AI assistant for an interior design project management system.

Your job is to analyze a single client communication (WhatsApp, SMS, or email text) and extract ONLY useful project information. You are not a chatbot and this is not a conversation — analyze the text once and respond.

STRICT RULES:
1. Never repeat, copy, quote, or return the original communication text in your answer.
2. Never return plain text — respond with JSON only, matching the schema exactly.
3. Extract every decision the client made and list each decision as its own separate string in the "decisions" array. Do not combine multiple decisions into one string.
4. Extract every actionable task and list each task as its own separate object in the "actionItems" array. Do not combine multiple tasks into a single task string.
5. Each actionItems object must have exactly these fields: "task", "client", "deadline", "priority".
6. Use the field name "client" — never use "assignedTo" or any other field name.
7. If the client's name is not mentioned, set "client" to "Not specified". Do not invent a name.
8. If a deadline is not mentioned, set "deadline" to "Not specified". Do not invent a date.
9. "priority" must be exactly one of: "High", "Medium", "Low".
   - Use "High" only for clearly urgent, critical, or time-sensitive tasks.
   - Use "Medium" for normal project tasks (this should be the default/common case).
   - Use "Low" only when the communication clearly indicates low urgency.
10. Do not invent, assume, or add any information that is not present in the communication.
11. "summary" must be exactly one concise, complete sentence describing what the communication was about.
12. Return valid JSON only. No markdown, no code fences, no commentary, no explanation — JSON only.

Respond with an object of this exact shape:
{
  "summary": "string, one sentence",
  "decisions": ["string", "string", ...],
  "actionItems": [
    { "task": "string", "client": "string", "deadline": "string", "priority": "High" | "Medium" | "Low" }
  ]
}`;

// ─────────────────────────────────────────────────────────────────────────
// Gemini structured output schema (enforces the JSON shape at the API level)
// ─────────────────────────────────────────────────────────────────────────

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    summary: { type: "STRING" },
    decisions: {
      type: "ARRAY",
      items: { type: "STRING" },
    },
    actionItems: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          task: { type: "STRING" },
          client: { type: "STRING" },
          deadline: { type: "STRING" },
          priority: {
            type: "STRING",
            enum: ["High", "Medium", "Low"],
          },
        },
        required: ["task", "client", "deadline", "priority"],
      },
    },
  },
  required: ["summary", "decisions", "actionItems"],
};

// ─────────────────────────────────────────────────────────────────────────
// Validation helpers — guard against malformed / unexpected Gemini output
// ─────────────────────────────────────────────────────────────────────────

function isValidPriority(value: unknown): value is Priority {
  return value === "High" || value === "Medium" || value === "Low";
}

function isValidActionItem(value: unknown): value is ActionItem {
  if (typeof value !== "object" || value === null) return false;
  const item = value as Record<string, unknown>;
  return (
    typeof item.task === "string" &&
    item.task.trim().length > 0 &&
    typeof item.client === "string" &&
    typeof item.deadline === "string" &&
    isValidPriority(item.priority)
  );
}

function isValidAnalysisResult(value: unknown): value is AnalysisResult {
  if (typeof value !== "object" || value === null) return false;
  const result = value as Record<string, unknown>;

  if (typeof result.summary !== "string" || result.summary.trim().length === 0) {
    return false;
  }

  if (!Array.isArray(result.decisions)) return false;
  for (const d of result.decisions) {
    if (typeof d !== "string") return false;
  }

  if (!Array.isArray(result.actionItems)) return false;
  for (const item of result.actionItems) {
    if (!isValidActionItem(item)) return false;
  }

  return true;
}

/**
 * Strips accidental markdown code fences from a model response.
 * Uses plain string operations only (no regex) to stay compatible
 * with older TS targets and avoid lookahead/lookbehind features.
 */
function stripCodeFences(raw: string): string {
  let text = raw.trim();

  if (text.startsWith("```")) {
    const firstNewline = text.indexOf("\n");
    if (firstNewline !== -1) {
      text = text.slice(firstNewline + 1);
    }
  }

  if (text.endsWith("```")) {
    text = text.slice(0, text.length - 3);
  }

  return text.trim();
}

// ─────────────────────────────────────────────────────────────────────────
// Local fallback extractor (no AI). Produces separate actionItems,
// never one combined paragraph.
// ─────────────────────────────────────────────────────────────────────────

const DAYS_OF_WEEK = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const URGENT_KEYWORDS = [
  "urgent",
  "asap",
  "immediately",
  "critical",
  "right away",
  "as soon as possible",
];

const LOW_URGENCY_KEYWORDS = [
  "no rush",
  "whenever you can",
  "whenever possible",
  "not urgent",
  "low priority",
  "no hurry",
];

const ACTION_KEYWORDS = [
  "please",
  "could you",
  "can you",
  "need to",
  "we need",
  "i need",
  "must",
  "should",
  "ask the",
  "confirm",
  "finalize",
  "send",
  "schedule",
  "check with",
  "arrange",
  "make sure",
];

const DECISION_KEYWORDS = [
  "keep the",
  "keep this",
  "change the",
  "we'd prefer",
  "we would prefer",
  "prefer",
  "decided",
  "will use",
  "instead of",
  "go with",
  "confirmed",
];

function splitIntoSentences(text: string): string[] {
  return text
    .split(/(?<=[.?!])\s+/g.source ? undefined as never : "") // placeholder, replaced below
    .filter(Boolean);
}

/**
 * Simple, ES-safe sentence splitter (no lookbehind/lookahead).
 * Breaks on '.', '?', '!' followed by whitespace, keeping punctuation.
 */
function safeSplitSentences(text: string): string[] {
  const rawChunks = text
    .split("\n")
    .join(" ")
    .split(" ")
    .reduce<string[]>((sentences, word) => {
      if (sentences.length === 0) {
        sentences.push(word);
      } else {
        sentences[sentences.length - 1] += " " + word;
      }

      const lastChar = word.charAt(word.length - 1);
      if (lastChar === "." || lastChar === "?" || lastChar === "!") {
        sentences.push("");
      }

      return sentences;
    }, [])
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  return rawChunks;
}

function detectDeadline(sentence: string): string {
  const lower = sentence.toLowerCase();
  for (const day of DAYS_OF_WEEK) {
    if (lower.indexOf(day) !== -1) {
      return day.charAt(0).toUpperCase() + day.slice(1);
    }
  }
  return "Not specified";
}

function detectPriority(sentence: string): Priority {
  const lower = sentence.toLowerCase();

  for (const keyword of URGENT_KEYWORDS) {
    if (lower.indexOf(keyword) !== -1) return "High";
  }

  for (const day of DAYS_OF_WEEK) {
    if (lower.indexOf(day) !== -1) return "High";
  }

  for (const keyword of LOW_URGENCY_KEYWORDS) {
    if (lower.indexOf(keyword) !== -1) return "Low";
  }

  return "Medium";
}

function localFallbackExtractor(text: string): AnalysisResult {
  const sentences = safeSplitSentences(text);

  const decisions: string[] = [];
  const actionItems: ActionItem[] = [];

  for (const sentence of sentences) {
    const lower = sentence.toLowerCase();

    const isDecision = DECISION_KEYWORDS.some((kw) => lower.indexOf(kw) !== -1);
    const isAction = ACTION_KEYWORDS.some((kw) => lower.indexOf(kw) !== -1);

    if (isDecision) {
      decisions.push(sentence.replace(/\s+/g, " ").trim());
    }

    if (isAction) {
      actionItems.push({
        task: sentence.replace(/\s+/g, " ").trim(),
        client: "Not specified",
        deadline: detectDeadline(sentence),
        priority: detectPriority(sentence),
      });
    }
  }

  if (actionItems.length === 0 && sentences.length > 0) {
    actionItems.push({
      task: sentences[0].replace(/\s+/g, " ").trim(),
      client: "Not specified",
      deadline: "Not specified",
      priority: "Medium",
    });
  }

  const summary =
    sentences.length > 0
      ? "The client communication was analyzed locally and key points were extracted."
      : "No content was provided to analyze.";

  return {
    summary,
    decisions,
    actionItems,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Gemini call
// ─────────────────────────────────────────────────────────────────────────

async function callGemini(text: string): Promise<AnalysisResult | null> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return null;
  }

  const fullPrompt = `${SYSTEM_PROMPT}

Communication:
${text}`;

  let response: Response;

  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: fullPrompt,
                },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: RESPONSE_SCHEMA,
            temperature: 0,
          },
        }),
      }
    );
  } catch (error) {
    console.error("Gemini request failed:", error);
    return null;
  }

  if (!response.ok) {
    console.error("Gemini returned non-OK status:", response.status);
    return null;
  }

  let data: unknown;

  try {
    data = await response.json();
  } catch (error) {
    console.error("Failed to parse Gemini response as JSON:", error);
    return null;
  }

  const candidateText = (
    data as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
        finishReason?: string;
      }>;
    }
  )?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!candidateText || typeof candidateText !== "string") {
    console.error("Gemini response missing text content.");
    return null;
  }

  const cleaned = stripCodeFences(candidateText);

  let parsed: unknown;

  try {
    parsed = JSON.parse(cleaned);
  } catch (error) {
    console.error("Failed to parse Gemini JSON output:", error, cleaned);
    return null;
  }

  if (!isValidAnalysisResult(parsed)) {
    console.error("Gemini output did not match expected schema:", parsed);
    return null;
  }

  return parsed;
}

// ─────────────────────────────────────────────────────────────────────────
// POST handler
// ─────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const text = typeof body?.text === "string" ? body.text : "";

    if (!text || text.trim().length === 0) {
      return NextResponse.json(
        { error: "No communication text provided." },
        { status: 400 }
      );
    }

    const geminiResult = await callGemini(text);

    if (geminiResult) {
      return NextResponse.json(geminiResult);
    }

    // Gemini failed, returned malformed data, or is unavailable —
    // safely fall back to the local extractor.
    const fallbackResult = localFallbackExtractor(text);
    return NextResponse.json(fallbackResult);
  } catch (error) {
    console.error("Analyze route error:", error);
    return NextResponse.json(
      { error: "Failed to analyze communication." },
      { status: 500 }
    );
  }
}