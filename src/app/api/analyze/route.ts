// app/api/analyze/route.ts

import { NextRequest, NextResponse } from "next/server";

// ─────────────────────────────────────────────────────────────────────────
// Types — local to this file only
// ─────────────────────────────────────────────────────────────────────────

interface AnalysisResult {
  summary: string;
  decisions: string[];
}

// ─────────────────────────────────────────────────────────────────────────
// System prompt
// ─────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an AI assistant for an interior design project management system.

Your job is to analyze a single client communication (WhatsApp, SMS, email, or meeting notes) and extract ONLY useful project information. This is not a conversation — analyze the text once and respond.

STRICT RULES:
1. Never repeat, copy, quote, or return the original communication text in your answer.
2. Never return plain text — respond with JSON only, matching the schema exactly.
3. Extract every actionable item or decision from the communication. List each one as its own separate string in the "decisions" array. Do not combine multiple items into one string.
4. Each item in "decisions" should be a clear, standalone sentence describing one action or decision.
5. There is no fixed limit — extract as many or as few items as the text actually contains.
6. Do not invent, assume, or add information not present in the communication.
7. "summary" must be exactly one concise, complete sentence describing what the communication was about.
8. Return valid JSON only. No markdown, no code fences, no commentary — JSON only.

Respond with an object of this exact shape:
{
  "summary": "string, one sentence",
  "decisions": ["string", "string", ...]
}`;

// ─────────────────────────────────────────────────────────────────────────
// Gemini structured output schema
// ─────────────────────────────────────────────────────────────────────────

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    summary: { type: "STRING" },
    decisions: {
      type: "ARRAY",
      items: { type: "STRING" },
    },
  },
  required: ["summary", "decisions"],
};

// ─────────────────────────────────────────────────────────────────────────
// Validation
// ─────────────────────────────────────────────────────────────────────────

function isValidResult(value: unknown): value is AnalysisResult {
  if (typeof value !== "object" || value === null) return false;
  const result = value as Record<string, unknown>;
  if (typeof result.summary !== "string" || result.summary.trim().length === 0) return false;
  if (!Array.isArray(result.decisions)) return false;
  for (const d of result.decisions) {
    if (typeof d !== "string") return false;
  }
  return true;
}

function stripCodeFences(raw: string): string {
  let text = raw.trim();
  if (text.startsWith("```")) {
    const firstNewline = text.indexOf("\n");
    if (firstNewline !== -1) text = text.slice(firstNewline + 1);
  }
  if (text.endsWith("```")) text = text.slice(0, text.length - 3);
  return text.trim();
}

// ─────────────────────────────────────────────────────────────────────────
// Local fallback extractor (no AI)
// ─────────────────────────────────────────────────────────────────────────

const ACTION_KEYWORDS = [
  "please",
  "could you",
  "can you",
  "need to",
  "we need",
  "i need",
  "must",
  "should",
  "confirm",
  "finalize",
  "send",
  "schedule",
  "check",
  "arrange",
  "make sure",
  "keep the",
  "change the",
  "prefer",
  "decided",
  "will use",
  "go with",
  "approved",
  "rejected",
  "source",
  "order",
  "revise",
  "update",
  "sign off",
  "transmit",
  "reschedule",
];

function safeSplitSentences(text: string): string[] {
  const words = text.split("\n").join(" ").split(" ");
  const sentences: string[] = [];
  let current = "";

  for (const word of words) {
    current = current ? current + " " + word : word;
    const last = word.charAt(word.length - 1);
    if (last === "." || last === "?" || last === "!") {
      const trimmed = current.trim();
      if (trimmed.length > 0) sentences.push(trimmed);
      current = "";
    }
  }

  if (current.trim().length > 0) sentences.push(current.trim());
  return sentences;
}

function localFallbackExtractor(text: string): AnalysisResult {
  const sentences = safeSplitSentences(text);
  const decisions: string[] = [];

  for (const sentence of sentences) {
    const lower = sentence.toLowerCase();
    const isAction = ACTION_KEYWORDS.some((kw) => lower.indexOf(kw) !== -1);
    if (isAction) {
      decisions.push(sentence.replace(/\s+/g, " ").trim());
    }
  }

  // If nothing matched, include non-trivial sentences as fallback
  if (decisions.length === 0) {
    for (const sentence of sentences) {
      const lower = sentence.toLowerCase();
      const isTrivial = /^(hi|hello|dear|hope|how are|thanks|thank you|regards|best|warmly|sincerely)/i.test(
        lower
      );
      if (!isTrivial && sentence.trim().length > 10) {
        decisions.push(sentence.replace(/\s+/g, " ").trim());
      }
    }
  }

  const summary =
    sentences.length > 0
      ? "The client communication was analyzed and key actions were extracted."
      : "No content was provided to analyze.";

  return { summary, decisions };
}

// ─────────────────────────────────────────────────────────────────────────
// Gemini call
// ─────────────────────────────────────────────────────────────────────────

async function callGemini(text: string): Promise<AnalysisResult | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  const fullPrompt = `${SYSTEM_PROMPT}\n\nCommunication:\n${text}`;

  let response: Response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
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
      }>;
    }
  )?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!candidateText || typeof candidateText !== "string") {
    console.error("Gemini response missing text content.");
    return null;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripCodeFences(candidateText));
  } catch (error) {
    console.error("Failed to parse Gemini JSON output:", error);
    return null;
  }

  if (!isValidResult(parsed)) {
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
    if (geminiResult) return NextResponse.json(geminiResult);

    return NextResponse.json(localFallbackExtractor(text));
  } catch (error) {
    console.error("Analyze route error:", error);
    return NextResponse.json(
      { error: "Failed to analyze communication." },
      { status: 500 }
    );
  }
}