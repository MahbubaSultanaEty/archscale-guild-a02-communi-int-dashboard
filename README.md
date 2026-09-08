
# AS-02 — Communication Intelligence Dashboard

**ArchScale Guild — Intern Technology Hackathon 2026**
Problem Statement: **AS-02 — Make project communication intelligent, not overwhelming**

---

## 1. Project Overview

Interior design and architecture projects generate a constant stream of WhatsApp messages and emails between clients, architects, and vendors. Important decisions — a material change, an approval, a deadline — get buried inside casual back-and-forth conversation. Nobody has time to re-read a week of chat history to find out what was actually decided.

This project is a **Communication Intelligence Dashboard**: admins paste a WhatsApp or email conversation, AI extracts the structured, actionable information from it, the admin reviews and approves what's relevant, and only approved information is stored as a trackable action item.

---

## 2. Problem

The problem is **not** a lack of communication — it's the opposite. Communication overload buries the few sentences that actually matter (a decision, a deadline, a request) inside dozens of sentences that don't. Manually re-reading conversations to extract action items doesn't scale as a project grows, and important commitments get missed or forgotten.

The naive/obvious solution would be an AI chatbot that "understands your project." That's the wrong scope for this problem: it requires ongoing context, memory, and trust in autonomous AI decisions. The real friction is much narrower — **someone needs to quickly turn one conversation into one clear, trackable item**, without the AI unilaterally deciding what goes into the record.

---

## 3. Solution

A three-screen admin dashboard where:

1. Admin pastes a single conversation (WhatsApp export or email thread) and picks the relevant client/project.
2. AI analyzes it and returns a structured result: summary, decision, action, deadline, and priority.
3. Admin reviews the AI's output and explicitly clicks **Save** — only then is it written to the database.
4. Saved items become **Action Items**: trackable cards with status (Pending/Completed), filterable and paginated.

The core design principle, and the main product decision behind this build:

> **AI suggests → Admin decides → Database stores.**

AI never writes to the database directly. This keeps a human in the loop for every piece of information that becomes a permanent record, and avoids the trust and error-correction problems that come with fully autonomous extraction.

---

## 4. User Workflow

```
WhatsApp / Email Conversation
            ↓
        Manual Paste
            ↓
        AI Analysis
            ↓
   Structured Information (not yet saved)
            ↓
      Admin Reviews → [Save]
            ↓
          Database
            ↓
       Action Items
            ↓
   Admin marks Complete / Reject
```

One communication → one analysis → one optional save. This is intentionally **not** an ongoing chatbot session — each paste is a single, independent extraction.

---

## 5. Key Decisions

| Decision | Reasoning |
|---|---|
| AI output is never auto-saved | Keeps a human checkpoint before anything becomes a permanent record; avoids polluting the database with bad extractions |
| One conversation → one analysis (not a chat thread) | Matches the real use case (reviewing a finished conversation), and is much simpler to build and reason about |
| Reject = hard delete, no soft-delete/audit trail | Acceptable for this scope; documented as a known limitation rather than solved |
| No dedicated `/completed` route | A single Action Items page with a status filter is simpler and avoids duplicating the list UI |
| Server-side filtering & pagination | Demonstrates that the app is built to scale past a demo dataset, not just handle 5 hardcoded items |
| AI structured output via schema, not prompt-only JSON | Removes the need for fragile string-parsing of AI text; see AI Integration below |
| No real WhatsApp/Email API integration | Out of scope for this build; manual paste demonstrates the intelligence layer without needing OAuth, webhooks, or messaging platform approval — noted as a future improvement |

---

## 6. Architecture

**Stack:** Next.js (App Router) · React · Tailwind CSS · MongoDB · Google Gemini API

```
Next.js Frontend
       ↓
  /api/analyze  ──────► Gemini API (structured JSON output)
       ↓
 Structured Result (summary, decision, task, deadline, priority)
       ↓
 Frontend displays result + [Save] button
       ↓
  /api/action-items  ──────► MongoDB
```

**Routes**

```
/dashboard                     → overview stats (totals, pending, completed, recent activity)
/dashboard/communication        → paste conversation, run AI analysis, review, save
/dashboard/action-items         → view / filter / paginate saved items, complete or reject
```

**API routes**

```
GET    /api/clients                     → returns seeded client list for the dropdown
POST   /api/analyze                     → sends pasted text to Gemini, returns structured JSON
GET    /api/action-items                → server-side filtered + paginated list
POST   /api/action-items                → save an approved AI result
PATCH  /api/action-items/:id/complete   → pending → completed
DELETE /api/action-items/:id/reject     → deletes the record
```

**Code structure**

```
app/
└── dashboard/
    ├── layout.tsx
    ├── page.tsx                  (overview)
    ├── communication/
    │   └── page.tsx
    └── action-items/
        └── page.tsx
```

Kept deliberately simple: no unnecessary component abstraction, no per-card component files — action item cards are rendered with a single `.map()` over the fetched data.

---

## 7. AI Integration — Gemini

The AI layer uses the **Google Gemini API (free tier)** — specifically a Flash-tier model (`gemini-2.0-flash` or `gemini-1.5-flash`), which is sufficient for this extraction task and fits comfortably inside the free-tier request quota for demo purposes.

**Why Gemini's structured output mode matters here:** rather than asking the model to "return JSON" in the prompt and hoping it doesn't wrap the response in markdown fences or add commentary, Gemini supports enforced structured output via:

```json
{
  "generationConfig": {
    "responseMimeType": "application/json",
    "responseSchema": {
      "type": "object",
      "properties": {
        "summary":  { "type": "string" },
        "decision": { "type": "string" },
        "task":     { "type": "string" },
        "deadline": { "type": "string" },
        "priority": { "type": "string", "enum": ["low", "medium", "high"] }
      },
      "required": ["summary", "task", "priority"]
    }
  }
}
```

This guarantees the API response is valid JSON matching the schema, removing the need for fragile regex/markdown-fence stripping on the backend. The API key is stored server-side only (`.env`, never exposed to the client), and all calls to Gemini happen inside `/api/analyze`, never directly from the browser.

A conservative input length cap is applied before sending text to the API, to avoid excessive token usage on the free tier.

**Note on `client`:** it's deliberately left out of the AI schema. The admin already selects the client/project from a dropdown before the conversation is pasted, so there's nothing for the AI to extract — see the request flow below.

**Request flow for `/api/analyze`:**

```
Frontend sends:  { clientId, conversationText }
                        ↓
        Backend forwards only conversationText to Gemini
                        ↓
     AI returns: { summary, decision, task, deadline, priority }
                        ↓
   Frontend merges AI result + selected client for the review screen
```

The client name can optionally be passed into the prompt as *context* (e.g. "this conversation is with Sarah") to make the summary read more naturally, but it is never something the AI is asked to determine — it's carried through from the dropdown selection and reattached when the admin saves.

---

## 8. Example Input / Output

**Input (pasted conversation):**

```
Client: Can we change the kitchen countertop to white marble?
Architect: Yes, I'll check availability with the supplier.
Client: Please check it by Friday.
```

**AI Output (structured JSON):**

```json
{
  "summary": "Client requested a kitchen countertop change.",
  "decision": "White marble was requested.",
  "task": "Architect needs to check supplier availability.",
  "deadline": "Friday",
  "priority": "high"
}
```

(`client` isn't in this output — it comes from the dropdown selected before analysis, not from the AI. See AI Integration above.)

This result is displayed to the admin with a single **Save** button. If not saved, nothing is written to the database.

**How `client`, `priority`, and `deadline` are actually populated:**

| Field | Source | If AI can't determine it |
|---|---|---|
| `client` | **Not AI-extracted.** Admin selects the client/project from a dropdown *before* pasting the conversation, on the Communication page. This value is attached to the record directly — it's not part of what the AI needs to figure out. |
| `priority` | AI infers it from urgency cues in the text (words like "urgent"/"ASAP", tone, deadline proximity). Shown on the review screen as an **editable dropdown** (Low/Medium/High) pre-filled with the AI's guess — admin can override before saving. | Defaults to `medium` rather than being left blank, since it's needed for filtering later. |
| `deadline` | AI extracts it **only if explicitly stated** in the conversation (e.g. "by Friday"). It never invents a date that isn't in the text. Shown on the review screen as an **editable date field**. | Left empty / null. Admin can fill it in manually before saving, or save without one — the UI shows "No deadline specified." |

This keeps the "AI suggests → Admin decides" principle consistent: AI never silently fabricates a priority or deadline that isn't grounded in the conversation, and the review screen always gives the admin a chance to fill in what the AI missed before it becomes a permanent record.

---

## 9. Database Structure (MongoDB)

```
Client
├── name      (e.g. "Sarah")
└── project   (e.g. "Kitchen Renovation")
```

```
ActionItem
├── client               (string — copied from the selected Client at save time)
├── task                 (string)
├── status               ("pending" | "completed")
├── date                 (deadline, as provided or parsed)
├── priority             ("low" | "medium" | "high")
├── sourceCommunication  (original pasted text, for traceability)
└── createdAt            (timestamp)
```

- The `Client` collection is pre-populated with a small seed script (4–5 dummy clients, e.g. "Sarah — Kitchen Renovation", "Rahim — Office Interior") rather than building an "Add Client" form. This keeps the demo realistic without adding a client-management feature that's outside this build's scope.
- The Communication page's client dropdown reads from `GET /api/clients`.
- **Reject** → record is permanently deleted (see Limitations).
- **Complete** → `status` flips from `pending` to `completed`; no separate collection or route.

---

## 10. Limitations

- Rejecting an item performs a hard delete — there is no soft-delete or audit trail of rejected extractions. Acceptable for this scope, but not production-ready.
- No authentication/multi-admin support — this is a single-admin dashboard for the demo.
- No real-time WhatsApp or Email ingestion — conversations are manually pasted, not automatically captured.
- Deadline is stored as free text from the AI output rather than a validated date object, since natural-language deadlines ("by Friday") don't always map cleanly to a calendar date without additional context (e.g., which Friday, relative to what).
- Single AI provider (Gemini) with no fallback if the API is unavailable or rate-limited.

---

## 11. What I Would Improve Next

- Automatic capture from WhatsApp Business API / email inbox instead of manual paste, so communications flow in without admin copy-pasting.
- Soft-delete with an "audit trail" view for rejected items, instead of permanent deletion.
- Smarter deadline parsing (resolve "by Friday" to an actual date based on message timestamp).
- Multi-admin roles and per-project access control.
- A confidence score from the AI on each extracted field, so low-confidence extractions are visually flagged for closer review before saving.

---

## 12. What AI Helped With

- Drafting and refining the initial feature scope and route structure for this build.
- Generating the Gemini API integration code (structured JSON schema, prompt design).
- Assisting with boilerplate CRUD API route code and MongoDB queries for server-side filtering/pagination.
- Reviewing architecture decisions (e.g., the "AI suggests, admin decides" pattern, hard-delete vs soft-delete tradeoffs) before implementation.

All architectural decisions, scope boundaries, and final code were reviewed and understood before submission — AI was used as a build accelerant, not as an unreviewed black box.

---

## 13. Live Demo

`[deployed URL — to be added]`

## 14. Video Walkthrough

`[3–5 minute video link — to be added]`