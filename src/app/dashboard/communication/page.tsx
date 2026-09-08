"use client";

import React, { useState, useId } from "react";
import Link from "next/link";
import { Priority, ActionItem, AnalysisResponse, ExtractedActionItem } from "@/types";

export default function CommunicationPage() {
  const [selectedClient, setSelectedClient] = useState("Evelyn Vance — Vance Penthouse");
  const [rawText, setRawText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);

  const inputClientSelectId = useId();
  const inputMessageTextareaId = useId();

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
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to analyze text");
      }

      const data: AnalysisResponse = await response.json();
      const defaultClient = selectedClient.split(" — ")[0] || "Client";

      setAnalysisResult({
        summary: data.summary || "",
        decisions: data.decisions || [],
        actionItems: (data.actionItems || []).map((item) => ({
          task: item.task || "",
          client: item.client && item.client !== "Not specified" ? item.client : defaultClient,
          deadline: item.deadline || "Not specified",
          priority: (item.priority as Priority) || "Medium",
        })),
      });
    } catch (err) {
      console.error(err);
      setErrorNotice("Could not complete analysis. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Update a single action item in state
  const handleUpdateActionItem = (index: number, field: keyof ExtractedActionItem, value: string) => {
    if (!analysisResult) return;
    const updatedItems = [...analysisResult.actionItems];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value,
    };
    setAnalysisResult({
      ...analysisResult,
      actionItems: updatedItems,
    });
  };

  // Save extracted action items to database / registry
  const handleSaveToDatabase = async () => {
    if (!analysisResult || analysisResult.actionItems.length === 0) return;

    const [, defaultProject] = selectedClient.split(" — ");

    const newItems: ActionItem[] = analysisResult.actionItems.map((item, idx) => ({
      id: "act-" + (Date.now() + idx),
      client: item.client || "Client",
      project: defaultProject || "Active Project",
      date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      description: item.task,
      priority: item.priority,
      deadline: item.deadline !== "Not specified" ? item.deadline : undefined,
      status: "Pending",
    }));

    // Ready for: await fetch('/api/action-items', { method: 'POST', body: JSON.stringify(newItems) });
    console.log("Saving action items to database:", newItems);

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
            ✓ Successfully saved action items!
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
            Paste raw client emails, WhatsApp threads, voice transcripts, or meeting notes below.
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
            {isAnalyzing ? "Extracting Intelligence..." : "Analyze"}
          </button>
        </div>
      </div>

      {/* Extracted AI Result Panel */}
      {analysisResult && (
        <div className="glass-panel p-6 sm:p-8 space-y-6 border-white/30">
          <div className="flex items-center justify-between border-b border-white/15 pb-4">
            <div>
              <span className="text-xs uppercase tracking-wider text-[#FFC466] font-semibold font-body">
                AI Synthesis Complete
              </span>
              <h3 className="text-lg sm:text-xl font-heading text-white mt-0.5">
                Extracted Project Intelligence
              </h3>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-[#0F2A1F]/65 border border-white/18 text-[#EAF6EE]/85 font-body">
              {selectedClient.split(" — ")[1] || "Project"}
            </span>
          </div>

          {/* 1. Summary (Complete Sentence) */}
          <div>
            <span className="block text-xs uppercase tracking-wider text-[#EAF6EE]/80 font-medium mb-1.5 font-body">
              Executive Summary
            </span>
            <div className="p-3.5 rounded-xl bg-[#0F2A1F]/65 border border-white/18 text-sm text-white/95 font-body leading-relaxed">
              {analysisResult.summary || "No summary provided."}
            </div>
          </div>

          {/* 2. Decisions (if any) */}
          {analysisResult.decisions && analysisResult.decisions.length > 0 && (
            <div>
              <span className="block text-xs uppercase tracking-wider text-[#EAF6EE]/80 font-medium mb-2 font-body">
                Client Decisions Made
              </span>
              <ul className="space-y-1.5">
                {analysisResult.decisions.map((decision, dIdx) => (
                  <li
                    key={dIdx}
                    className="flex items-start gap-2 text-xs text-white/90 font-body bg-[#0F2A1F]/45 p-2.5 rounded-lg border border-white/10"
                  >
                    <span className="text-[#FFC466] font-bold">✓</span>
                    <span>{decision}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 3. Action Items */}
          <div className="space-y-4">
            <span className="block text-xs uppercase tracking-wider text-[#EAF6EE]/80 font-medium font-body">
              Action Items ({analysisResult.actionItems.length})
            </span>

            {analysisResult.actionItems.map((item, index) => (
              <div
                key={index}
                className="p-5 rounded-xl bg-[#0F2A1F]/65 border border-white/20 space-y-4"
              >
                {/* Task Field */}
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#EAF6EE]/80 font-medium mb-1 font-body">
                    Task / Deliverable (Editable)
                  </label>
                  <textarea
                    rows={3}
                    value={item.task}
                    onChange={(e) => handleUpdateActionItem(index, "task", e.target.value)}
                    className="w-full p-3 glass-input text-sm leading-relaxed text-white font-body resize-y"
                    placeholder="Describe the actionable task..."
                  />
                </div>

                {/* Client, Priority, Deadline */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs uppercase tracking-wider text-[#EAF6EE]/80 font-medium mb-1 font-body">
                      Client
                    </label>
                    <input
                      type="text"
                      value={item.client}
                      onChange={(e) => handleUpdateActionItem(index, "client", e.target.value)}
                      placeholder="e.g. Evelyn Vance"
                      className="w-full px-3 py-2 glass-input text-sm text-white font-body"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wider text-[#EAF6EE]/80 font-medium mb-1 font-body">
                      Priority
                    </label>
                    <select
                      value={item.priority}
                      onChange={(e) => handleUpdateActionItem(index, "priority", e.target.value as Priority)}
                      className="w-full px-3 py-2 glass-input text-sm text-white cursor-pointer [&>option]:bg-[#0F2A1F] font-body"
                    >
                      <option value="High">High Priority</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs uppercase tracking-wider text-[#EAF6EE]/80 font-medium mb-1 font-body">
                      Deadline
                    </label>
                    <input
                      type="text"
                      value={item.deadline}
                      onChange={(e) => handleUpdateActionItem(index, "deadline", e.target.value)}
                      placeholder="e.g. YYYY-MM-DD"
                      className="w-full px-3 py-2 glass-input text-sm text-white font-body"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
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
              Save to Registry
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
