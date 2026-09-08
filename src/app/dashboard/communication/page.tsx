"use client";

import React, { useState, useId } from "react";
import Link from "next/link";
import { Priority, ActionItem } from "@/types";

export default function CommunicationPage() {
  const [selectedClient, setSelectedClient] = useState("Evelyn Vance — Vance Penthouse");
  const [rawText, setRawText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const [analysisResult, setAnalysisResult] = useState<{
    client: string;
    project: string;
    description: string;
    priority: Priority;
    deadline: string;
  } | null>(null);

  const inputClientSelectId = useId();
  const inputMessageTextareaId = useId();
  const inputAiPriorityId = useId();
  const inputAiDeadlineId = useId();

  // Call the /api/analyze endpoint (powered by Gemini)
  const handleAnalyze = async () => {
    if (!rawText.trim()) return;
    setIsAnalyzing(true);
    setErrorNotice(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: rawText,
          client: selectedClient,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to analyze text");
      }

      const data = await response.json();
      setAnalysisResult({
        client: data.client || "Client",
        project: data.project || "Active Project",
        description: data.description || "Review client request.",
        priority: (data.priority as Priority) || "Medium",
        deadline: data.deadline || new Date().toISOString().split("T")[0],
      });
    } catch (err) {
      console.error(err);
      setErrorNotice("Could not complete analysis. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Save to MongoDB / Action Items registry
  const handleSaveToDatabase = async () => {
    if (!analysisResult) return;

    const newItem: ActionItem = {
      id: "act-" + Date.now(),
      client: analysisResult.client,
      project: analysisResult.project,
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      description: analysisResult.description,
      priority: analysisResult.priority,
      deadline: analysisResult.deadline,
      status: "Pending",
    };

    // Ready for: await fetch('/api/action-items', { method: 'POST', body: JSON.stringify(newItem) });
    console.log("Saving action item:", newItem);

    setAnalysisResult(null);
    setRawText("");
    setSaveSuccessNotice(true);
    setTimeout(() => setSaveSuccessNotice(false), 3500);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Success Notification */}
      {saveSuccessNotice && (
        <div className="p-4 rounded-xl bg-[#2F6B4F]/90 border border-white/30 text-white text-sm flex items-center justify-between shadow-lg">
          <span className="flex items-center gap-2 font-medium">
            ✓ Successfully saved action item!
          </span>
          <Link
            href="/dashboard/action-items"
            className="underline text-xs cursor-pointer text-white hover:text-white/80"
          >
            View in Action Items →
          </Link>
        </div>
      )}

      {/* Error Notification */}
      {errorNotice && (
        <div className="p-4 rounded-xl bg-red-900/80 border border-red-400/40 text-white text-sm flex items-center justify-between shadow-lg">
          <span>{errorNotice}</span>
          <button
            type="button"
            onClick={() => setErrorNotice(null)}
            className="text-xs underline text-white/80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Input Glass Card for Raw Paste */}
      <div className="glass-panel p-6 sm:p-8 space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-heading text-white">
            Paste & Analyze Communication
          </h2>
          <p className="text-xs sm:text-sm text-[#EAF6EE]/75 mt-1 font-body">
            Paste raw emails, WhatsApp threads, voice transcripts, or meeting notes below.
          </p>
        </div>

        {/* Client & Project Selection */}
        <div className="space-y-2">
          <label
            htmlFor={inputClientSelectId}
            className="block text-xs uppercase tracking-wider text-[#EAF6EE]/80 font-medium font-body"
          >
            Associated Client & Project
          </label>
          <select
            id={inputClientSelectId}
            value={selectedClient}
            onChange={(e) => setSelectedClient(e.target.value)}
            className="w-full px-4 py-3 glass-input text-sm text-white cursor-pointer [&>option]:bg-[#0F2A1F] [&>option]:text-white font-body"
          >
            <option value="Evelyn Vance — Vance Penthouse">
              Evelyn Vance — Vance Penthouse
            </option>
            <option value="Marcus & Olivia Sterling — Komorebi Modern Pavilion">
              Marcus & Olivia Sterling — Komorebi Modern Pavilion
            </option>
            <option value="Julian Thorne — Thorne Residence">
              Julian Thorne — Thorne Residence
            </option>
            <option value="Dr. Elena Rostova — Lumina Coastal Villa">
              Dr. Elena Rostova — Lumina Coastal Villa
            </option>
            <option value="Alistair Finch — Finch Art Atelier">
              Alistair Finch — Finch Art Atelier
            </option>
          </select>
        </div>

        {/* Raw Text Dump Textarea */}
        <div className="space-y-2">
          <label
            htmlFor={inputMessageTextareaId}
            className="block text-xs uppercase tracking-wider text-[#EAF6EE]/80 font-medium font-body"
          >
            Raw Communication Dump
          </label>
          <textarea
            id={inputMessageTextareaId}
            rows={8}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Paste raw unedited message here (e.g. email with headers, WhatsApp chat history, contractor voice note transcript)..."
            className="w-full p-4 glass-input text-sm text-white resize-y font-body leading-relaxed"
          />
        </div>

        {/* Analyze Action */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={!rawText.trim() || isAnalyzing}
            className={`px-8 py-3 btn-primary text-sm tracking-wide cursor-pointer transition-all ${
              !rawText.trim() || isAnalyzing ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            {isAnalyzing ? "Extracting Main Task with AI..." : "Analyze"}
          </button>
        </div>
      </div>

      {/* Extracted AI Result Card */}
      {analysisResult && (
        <div className="glass-panel p-6 sm:p-8 space-y-6 border-white/30">
          <div className="flex items-center justify-between border-b border-white/15 pb-4">
            <div>
              <span className="text-xs uppercase tracking-wider text-[#FFC466] font-semibold font-body">
                AI Synthesis Complete
              </span>
              <h3 className="text-lg sm:text-xl font-heading text-white mt-0.5">
                Extracted Action Item
              </h3>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-[#0F2A1F]/65 border border-white/18 text-[#EAF6EE]/85 font-body">
              {analysisResult.project}
            </span>
          </div>

          {/* Editable Priority & Deadline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor={inputAiPriorityId}
                className="block text-xs uppercase tracking-wider text-[#EAF6EE]/80 font-medium mb-1 font-body"
              >
                Priority (Editable)
              </label>
              <select
                id={inputAiPriorityId}
                value={analysisResult.priority}
                onChange={(e) =>
                  setAnalysisResult({
                    ...analysisResult,
                    priority: e.target.value as Priority,
                  })
                }
                className="w-full px-3 py-2.5 glass-input text-sm text-white cursor-pointer [&>option]:bg-[#0F2A1F] font-body"
              >
                <option value="High">High Priority</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>

            <div>
              <label
                htmlFor={inputAiDeadlineId}
                className="block text-xs uppercase tracking-wider text-[#EAF6EE]/80 font-medium mb-1 font-body"
              >
                Target Deadline (Editable)
              </label>
              <input
                id={inputAiDeadlineId}
                type="date"
                value={analysisResult.deadline}
                onChange={(e) =>
                  setAnalysisResult({
                    ...analysisResult,
                    deadline: e.target.value,
                  })
                }
                className="w-full px-3 py-2.5 glass-input text-sm text-white font-body"
              />
            </div>
          </div>

          {/* Extracted Core Task Statement */}
          <div>
            <span className="block text-xs uppercase tracking-wider text-[#EAF6EE]/80 font-medium mb-1 font-body">
              Extracted Deliverable Statement
            </span>
            <div className="p-4 rounded-xl bg-[#0F2A1F]/65 border border-white/18 text-sm leading-relaxed text-white font-body">
              {analysisResult.description}
            </div>
          </div>

          {/* Discard & Save */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setAnalysisResult(null)}
              className="px-6 py-2.5 btn-ghost text-xs tracking-wide cursor-pointer"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={handleSaveToDatabase}
              className="px-8 py-2.5 btn-primary text-xs tracking-wide cursor-pointer"
            >
              Save
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
