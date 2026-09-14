// app/api/analyze/route.ts

import { NextRequest, NextResponse } from "next/server";

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────

interface AnalysisResult {
  summary: string;
  deadline: string | null;
  actionItems: string[];
}

interface AnalysisResponse extends AnalysisResult {
  // Debug-only field so you can see in the browser Network tab / console
  // whether Gemini actually ran or the route silently fell back.
  // Remove this once you've confirmed Gemini is working reliably.
  _source: "gemini" | "fallback";
  _fallbackReason?: string;
}

// ─────────────────────────────────────────────────────────────────────────
// System prompt
// ─────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an AI communication intelligence assistant for an interior design project management system.

Your job is to read the COMPLETE communication and identify only the important project-related information that should not be missed.

The communication may contain casual conversation, greetings, repeated information, opinions, or irrelevant details. Ignore those parts.

Your main task is to identify ACTION ITEMS and important information connected to those actions.

ACTION ITEMS:
- Extract every meaningful task, request, instruction, required change, order, or follow-up action.
- Each action item must be a separate concise string.
- Do not require the communication to explicitly say "please do this" or "the client wants this". Understand the meaning from the full context.
- Preserve important information from the original communication, including names, colors, materials, quantities, measurements, prices, budgets, dates, deadlines, and other meaningful details.
- Numbers are important and must not be unnecessarily removed because they may represent prices, payments, quantities, measurements, dimensions, or other project requirements.
- If a responsible person or professional role is explicitly mentioned, include it in the action item.
- If the responsible role is not explicitly mentioned but can be reasonably inferred from the task, infer the most appropriate role.
  Examples:
  - painting a wall → House painter
  - building or modifying furniture → Carpenter
  - electrical sockets, wiring, or lighting → Electrician
  - plumbing → Plumber
- Do not invent a responsible role when there is not enough evidence.
- If no responsible person or role can reasonably be identified, write only the task.
- Keep important context in the action item so the meaning is not lost.
- Do not copy the entire communication.
- Do not include casual or irrelevant conversation.

Examples:
"House painter — Change the accent wall to a slightly darker green."
"Carpenter — Make the TV cabinet 8 inches wider."
"Electrician — Install three power sockets behind the TV cabinet."
"Keep the total project budget within $2,500."

DEADLINE:
- Search the ENTIRE communication for a deadline or important completion date.
- If a clear deadline is present, extract it into the deadline field.
- Examples:
  "before Friday" → "Friday"
  "by September 15" → "September 15"
  "next Monday" → "Monday"
- If there is no deadline, return null.
- Never invent a deadline.
- Preserve the deadline naturally rather than converting it to an unrelated format.

SUMMARY:
- Write one short sentence describing the main purpose of the important project communication.
- Do not summarize greetings, casual conversation, or every individual detail.
- The summary must be a complete grammatical sentence ending with a period.

IMPORTANT:
- Do NOT create a client field.
- Do NOT create a priority field.
- Do NOT create a decisions field.
- Do NOT create any per-action client, deadline, or priority fields.
- Action items must be plain strings, not objects.
- Do NOT add bullet characters such as "•" inside action item strings. The frontend will display them as bullet points.
- Return ONLY valid JSON.
- Never return the original communication as the answer.
- Never return raw communication text instead of the structured result.

Return exactly this structure:

{
  "summary": "Short summary.",
  "deadline": "Friday",
  "actionItems": [
    "House painter — Change the accent wall to a slightly darker green.",
    "Carpenter — Make the TV cabinet 8 inches wider.",
    "Electrician — Install three power sockets behind the TV cabinet."
  ]
}

If there is no deadline:

{
  "summary": "Short summary.",
  "deadline": null,
  "actionItems": [
    "..."
  ]
}`;

// ─────────────────────────────────────────────────────────────────────────
// Gemini structured output schema
// ─────────────────────────────────────────────────────────────────────────

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    summary: {
      type: "STRING",
    },
    deadline: {
      type: "STRING",
      nullable: true,
    },
    actionItems: {
      type: "ARRAY",
      items: {
        type: "STRING",
      },
    },
  },
  required: ["summary", "deadline", "actionItems"],
};

// ─────────────────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────────────────

function isValidResult(value: unknown): value is AnalysisResult {
  if (typeof value !== "object" || value === null) return false;

  const result = value as Record<string, unknown>;

  if (
    typeof result.summary !== "string" ||
    result.summary.trim().length === 0
  ) {
    return false;
  }

  if (
    result.deadline !== null &&
    typeof result.deadline !== "string"
  ) {
    return false;
  }

  if (!Array.isArray(result.actionItems)) {
    return false;
  }

  if (
    !result.actionItems.every(
      (item) => typeof item === "string" && item.trim().length > 0
    )
  ) {
    return false;
  }

  return true;
}

function cleanSummary(summary: string): string {
  const cleaned = summary.trim();

  if (!cleaned) {
    return "The communication contains important project-related requirements and follow-up actions.";
  }

  return cleaned.endsWith(".") ? cleaned : `${cleaned}.`;
}

function cleanDeadline(deadline: unknown): string | null {
  if (deadline === null || deadline === undefined) {
    return null;
  }

  if (typeof deadline !== "string") {
    return null;
  }

  const cleaned = deadline.trim();

  if (!cleaned || cleaned.toLowerCase() === "not specified") {
    return null;
  }

  return cleaned;
}

function cleanActionItems(actionItems: string[]): string[] {
  return actionItems
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

// ─────────────────────────────────────────────────────────────────────────
// Local fallback
// ─────────────────────────────────────────────────────────────────────────

const TRIVIAL_STARTS = [
  "hi ",
  "hello ",
  "dear ",
  "hope ",
  "how are ",
  "thanks ",
  "thank you ",
  "regards ",
  "best ",
  "warmly ",
  "sincerely ",
  "good morning ",
  "good afternoon ",
];

const ACTION_PATTERNS = [
  "please ",
  "could you ",
  "can you ",
  "need to ",
  "we need ",
  "must ",
  "should ",
  "have to ",
  "make sure ",
  "ask ",
  "confirm ",
  "finalize ",
  "send ",
  "schedule ",
  "check ",
  "arrange ",
  "source ",
  "order ",
  "revise ",
  "update ",
  "change ",
  "replace ",
  "install ",
  "add ",
  "remove ",
  "paint ",
  "build ",
  "make ",
  "prepare ",
  "complete ",
  "keep ",
  "use ",
  "go with ",
];

const ROLE_KEYWORDS: Array<{ keywords: string[]; role: string }> = [
  {
    keywords: ["paint", "painting", "wall color", "wall colour", "repaint"],
    role: "House painter",
  },
  {
    keywords: [
      "cabinet",
      "wardrobe",
      "furniture",
      "shelf",
      "shelves",
      "wooden",
      "woodwork",
      "table",
      "chair",
      "bed",
    ],
    role: "Carpenter",
  },
  {
    keywords: [
      "socket",
      "electrical",
      "electric",
      "wiring",
      "switch",
      "lighting",
      "light fixture",
    ],
    role: "Electrician",
  },
  {
    keywords: ["pipe", "plumbing", "faucet", "sink", "water line"],
    role: "Plumber",
  },
];

function splitSentences(text: string): string[] {
  const normalized = text.replace(/\r?\n/g, " ").trim();

  if (!normalized) return [];

  const parts = normalized.split(/[.!?]+/);

  return parts
    .map((part) => part.trim())
    .filter((part) => part.length >= 8);
}

function findDeadline(text: string): string | null {
  const lower = text.toLowerCase();

  const datePatterns = [
    /\b(?:before|by|until|on)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
    /\b(?:before|by|until|on)\s+([a-z]+\s+\d{1,2}(?:st|nd|rd|th)?(?:,?\s+\d{4})?)\b/i,
    /\b(?:before|by|until|on)\s+(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/i,
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);

    if (match && match[1]) {
      return match[1].trim();
    }
  }

  if (lower.indexOf("tomorrow") !== -1) {
    return "Tomorrow";
  }

  if (
    lower.indexOf("end of week") !== -1 ||
    lower.indexOf("eow") !== -1
  ) {
    return "End of week";
  }

  const days = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
  ];

  for (const day of days) {
    if (lower.indexOf(day) !== -1) {
      return day.charAt(0).toUpperCase() + day.slice(1);
    }
  }

  return null;
}

function inferRole(sentence: string): string | null {
  const lower = sentence.toLowerCase();

  for (const item of ROLE_KEYWORDS) {
    for (const keyword of item.keywords) {
      if (lower.indexOf(keyword) !== -1) {
        return item.role;
      }
    }
  }

  return null;
}

function cleanFallbackSentence(sentence: string): string {
  let result = sentence.trim();

  result = result.replace(
    /^(please|could you|can you|we need to|we need|we should|make sure|kindly)\s+/i,
    ""
  );

  if (result.length > 0) {
    result = result.charAt(0).toUpperCase() + result.slice(1);
  }

  return result.endsWith(".") ? result : `${result}.`;
}

function localFallback(text: string): AnalysisResult {
  const sentences = splitSentences(text);
  const actionItems: string[] = [];

  for (const sentence of sentences) {
    const lower = sentence.toLowerCase();

    const isTrivial = TRIVIAL_STARTS.some((start) =>
      lower.startsWith(start)
    );

    if (isTrivial) continue;

    const isAction = ACTION_PATTERNS.some((pattern) =>
      lower.indexOf(pattern) !== -1
    );

    if (!isAction) continue;

    const role = inferRole(sentence);
    const task = cleanFallbackSentence(sentence);

    if (role) {
      actionItems.push(`${role} — ${task}`);
    } else {
      actionItems.push(task);
    }
  }

  const uniqueItems = Array.from(new Set(actionItems));

  const deadline = findDeadline(text);

  return {
    summary: cleanSummary(
      "The communication contains important project-related requirements and follow-up actions."
    ),
    deadline,
    actionItems: uniqueItems,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Gemini call
// ─────────────────────────────────────────────────────────────────────────

interface GeminiCallResult {
  result: AnalysisResult | null;
  // Why Gemini failed, if it did. Logged AND returned to the client
  // (in the debug-only _fallbackReason field) so you don't have to dig
  // through server logs to find out what went wrong.
  failReason?: string;
}

async function callGemini(text: string): Promise<GeminiCallResult> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    const msg = "GEMINI_API_KEY is missing from the environment.";
    console.error(msg);
    return { result: null, failReason: msg };
  }

  const fullPrompt = `${SYSTEM_PROMPT}

COMMUNICATION TO ANALYZE:
${text}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
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
            temperature: 0,
            responseMimeType: "application/json",
            responseSchema: RESPONSE_SCHEMA,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      const msg = `Gemini API error: HTTP ${response.status} — ${errorText}`;
      console.error(msg);
      return { result: null, failReason: msg };
    }

    const data = await response.json();

    // Gemini can also fail "softly" — 200 OK but blocked by safety filters,
    // hit a token limit, or return no candidates at all. Surface that too.
    const finishReason = data?.candidates?.[0]?.finishReason;
    const promptBlockReason = data?.promptFeedback?.blockReason;

    if (promptBlockReason) {
      const msg = `Gemini blocked the prompt: ${promptBlockReason}`;
      console.error(msg, data?.promptFeedback);
      return { result: null, failReason: msg };
    }

    const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (typeof rawText !== "string" || rawText.trim().length === 0) {
      const msg = `Gemini returned empty output (finishReason: ${
        finishReason ?? "unknown"
      }).`;
      console.error(msg, JSON.stringify(data));
      return { result: null, failReason: msg };
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(rawText);
    } catch (error) {
      const msg = `Gemini returned invalid JSON: ${
        (error as Error).message
      }. Raw: ${rawText.slice(0, 300)}`;
      console.error(msg);
      return { result: null, failReason: msg };
    }

    if (!isValidResult(parsed)) {
      const msg = `Gemini returned an unexpected structure: ${JSON.stringify(
        parsed
      ).slice(0, 300)}`;
      console.error(msg);
      return { result: null, failReason: msg };
    }

    const result: AnalysisResult = {
      summary: cleanSummary(parsed.summary),
      deadline: cleanDeadline(parsed.deadline),
      actionItems: cleanActionItems(parsed.actionItems),
    };

    if (result.actionItems.length === 0) {
      const msg = "Gemini returned zero action items for this input.";
      console.error(msg);
      return { result: null, failReason: msg };
    }

    return { result };
  } catch (error) {
    const msg = `Gemini request threw: ${(error as Error).message}`;
    console.error(msg);
    return { result: null, failReason: msg };
  }
}

// ─────────────────────────────────────────────────────────────────────────
// POST /api/analyze
// ─────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const text = typeof body?.text === "string" ? body.text.trim() : "";

    if (!text) {
      return NextResponse.json(
        {
          error: "No communication text provided.",
        },
        {
          status: 400,
        }
      );
    }

    const { result: geminiResult, failReason } = await callGemini(text);

    if (geminiResult) {
      const payload: AnalysisResponse = {
        ...geminiResult,
        _source: "gemini",
      };
      return NextResponse.json(payload);
    }

    // Gemini unavailable or invalid → use local extraction.
    // _fallbackReason tells you exactly why in the browser Network tab,
    // instead of silently degrading with no explanation.
    console.error(
      `Falling back to localFallback(). Reason: ${failReason}`
    );

    const payload: AnalysisResponse = {
      ...localFallback(text),
      _source: "fallback",
      _fallbackReason: failReason,
    };

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Analyze route error:", error);

    return NextResponse.json(
      {
        error: "Failed to analyze communication.",
      },
      {
        status: 500,
      }
    );
  }
}