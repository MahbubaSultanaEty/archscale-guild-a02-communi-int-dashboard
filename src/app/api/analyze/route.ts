import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { text, client } = await request.json();

    if (!text || typeof text !== "string") {
      return NextResponse.json(
        { error: "Please provide communication text to analyze." },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;

    // IF GEMINI API KEY IS CONFIGURED:
    if (apiKey) {
      const prompt = `You are an AI assistant for an interior design studio.
Analyze this raw communication and extract the core actionable task.
Ignore email signatures, greetings, pleasantries, and conversational noise.

Communication:
"""
${text}
"""

Client Context: ${client || "Unknown"}

Today's Date: ${new Date().toISOString().split("T")[0]}

Respond ONLY with valid JSON in this exact structure:
{
  "client": "Extracted client name or '${client || "Client"}'",
  "project": "Extracted project name or 'Interior Project'",
  "description": "A concise, professional one-sentence statement of the main deliverable or task that needs to be done.",
  "priority": "High" | "Medium" | "Low",
  "deadline": "YYYY-MM-DD" (calculate from any mentioned day like 'by Friday', or default to 5 days from today)
}`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
            },
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const responseText =
          data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (responseText) {
          const parsed = JSON.parse(responseText);
          return NextResponse.json(parsed);
        }
      }
    }

    // FALLBACK IF NO API KEY IS CONFIGURED YET:
    // Extracts a clean action statement instead of dumping raw text
    const cleanLines = text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0 && !l.startsWith("From:") && !l.startsWith("Sent:") && !l.startsWith("Subject:"));

    // Find the sentence with action words
    const lower = text.toLowerCase();
    let priority: "High" | "Medium" | "Low" = "Medium";
    if (lower.includes("urgent") || lower.includes("asap") || lower.includes("immediately") || lower.includes("friday")) {
      priority = "High";
    } else if (lower.includes("whenever") || lower.includes("low priority") || lower.includes("no rush")) {
      priority = "Low";
    }

    const defaultDeadline = new Date();
    defaultDeadline.setDate(defaultDeadline.getDate() + (priority === "High" ? 3 : 7));

    // Formulate a clean deliverable statement
    const coreSentence = cleanLines.find((l) =>
      l.toLowerCase().includes("need") ||
      l.toLowerCase().includes("please") ||
      l.toLowerCase().includes("confirm") ||
      l.toLowerCase().includes("approve") ||
      l.toLowerCase().includes("revise") ||
      l.toLowerCase().includes("spec")
    ) || cleanLines[0] || "Review client request and update project deliverables.";

    const [clientName, projName] = (client || "Client — Active Project").split(" — ");

    return NextResponse.json({
      client: clientName || "Client",
      project: projName || "Active Project",
      description: coreSentence.replace(/^(hi team|hello|dear|hey)[^,.]*[,.]/i, "").trim(),
      priority,
      deadline: defaultDeadline.toISOString().split("T")[0],
      source: apiKey ? "gemini" : "local_extractor",
    });
  } catch (error) {
    console.error("Analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze communication" },
      { status: 500 }
    );
  }
}
