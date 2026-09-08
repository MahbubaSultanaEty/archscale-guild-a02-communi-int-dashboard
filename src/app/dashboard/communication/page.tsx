"use client";

import React, { useState, useId } from "react";
import Link from "next/link";
import { Priority, ActionItem, AnalysisResponse } from "@/types";

export default function CommunicationPage() {
  const [selectedClient, setSelectedClient] = useState("Evelyn Vance — Vance Penthouse");
  const [rawText, setRawText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);

  // Editable per-decision overrides (priority, deadline only — client comes from dropdown)
  const [overrides, setOverrides] = useState<Array<{ priority: Priority; deadline: string }>>([]);

  const inputClientSelectId = useId();
  const inputMessageTextareaId = useId();

  const handleAnalyze = async () => {
    if (!rawText.trim()) return;
    setIsAnalyzing(true);
    setErrorNotice(null);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: rawText }),
      });

      if (!response.ok) throw new Error("Failed to analyze text");

      const data: AnalysisResponse = await response.json();

      setAnalysisResult({
        summary: data.summary || "",
        decisions: data.decisions || [],
      });

      // Reset overrides to defaults for each decision
      setOverrides((data.decisions || []).map(() => ({ priority: "Medium", deadline: "" })));
    } catch (err) {
      console.error(err);
      setErrorNotice("Could not complete analysis. Please try again.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const updateOverride = (index: number, field: "priority" | "deadline", value: string) => {
    setOverrides((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSaveToRegistry = () => {
    if (!analysisResult || analysisResult.decisions.length === 0) return;

    const [clientName, projectName] = selectedClient.split(" — ");
    const today = new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    const newItems: ActionItem[] = analysisResult.decisions.map((decision, idx) => ({
      id: "act-" + (Date.now() + idx),
      client: clientName || "Client",
      project: projectName || "Active Project",
      date: today,
      description: decision,
      priority: overrides[idx]?.priority || "Medium",
      deadline: overrides[idx]?.deadline || undefined,
      status: "Pending",
    }));

    console.log("Saving to registry:", newItems);

    setAnalysisResult(null);
    setRawText("");
    setOverrides([]);
    setSaveSuccessNotice(true);
    setTimeout(() => setSaveSuccessNotice(false), 3500);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Success Banner */}
      {saveSuccessNotice && (
        <div className="p-4 rounded-xl bg-[#2F6B4F]/90 border border-white/30 text-white text-sm flex items-center justify-between shadow-lg">
          <span className="flex items-center gap-2 font-medium">✓ Saved to Action Items registry!</span>
          <Link
            href="/dashboard/action-items"
            className="underline text-xs cursor-pointer text-white hover:text-white/80"
          >
            View Action Items →
          </Link>
        </div>
      )}

      {/* Error Banner */}
      {errorNotice && (
        <div className="p-4 rounded-xl bg-red-900/80 border border-red-400/40 text-white text-sm flex items-center justify-between shadow-lg">
          <span>{errorNotice}</span>
          <button type="button" onClick={() => setErrorNotice(null)} className="text-xs underline text-white/80">
            Dismiss
          </button>
        </div>
      )}

      {/* Input Panel */}
      <div className="glass-panel p-6 sm:p-8 space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-heading text-white">Paste & Analyze Communication</h2>
          <p className="text-xs sm:text-sm text-[#EAF6EE]/75 mt-1 font-body">
            Paste raw client emails, WhatsApp threads, voice transcripts, or meeting notes below.
          </p>
        </div>

        {/* Client & Project */}
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
            <option value="Evelyn Vance — Vance Penthouse">Evelyn Vance — Vance Penthouse</option>
            <option value="Marcus & Olivia Sterling — Komorebi Modern Pavilion">
              Marcus & Olivia Sterling — Komorebi Modern Pavilion
            </option>
            <option value="Julian Thorne — Thorne Residence">Julian Thorne — Thorne Residence</option>
            <option value="Dr. Elena Rostova — Lumina Coastal Villa">
              Dr. Elena Rostova — Lumina Coastal Villa
            </option>
            <option value="Alistair Finch — Finch Art Atelier">Alistair Finch — Finch Art Atelier</option>
          </select>
        </div>

        {/* Textarea */}
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

      {/* Result Panel */}
      {analysisResult && (
        <div className="glass-panel p-6 sm:p-8 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/15 pb-4">
            <div>
              <span className="text-xs uppercase tracking-wider text-[#FFC466] font-semibold font-body">
                AI Synthesis Complete
              </span>
              <h3 className="text-lg sm:text-xl font-heading text-white mt-0.5">
                Extracted Actions & Decisions
              </h3>
            </div>
            <span className="text-xs px-3 py-1 rounded-full bg-[#0F2A1F]/65 border border-white/18 text-[#EAF6EE]/85 font-body">
              {selectedClient.split(" — ")[1] || "Project"}
            </span>
          </div>

          {/* Summary */}
          <div>
            <span className="block text-xs uppercase tracking-wider text-[#EAF6EE]/80 font-medium mb-1.5 font-body">
              Executive Summary
            </span>
            <div className="p-3.5 rounded-xl bg-[#0F2A1F]/65 border border-white/18 text-sm text-white/95 font-body leading-relaxed">
              {analysisResult.summary || "No summary provided."}
            </div>
          </div>

          {/* Actions / Decisions List */}
          {analysisResult.decisions.length > 0 ? (
            <div className="space-y-3">
              <span className="block text-xs uppercase tracking-wider text-[#EAF6EE]/80 font-medium font-body">
                Actions Made ({analysisResult.decisions.length})
              </span>

              {analysisResult.decisions.map((decision, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-[#0F2A1F]/65 border border-white/20 space-y-3"
                >
                  {/* Decision text — read-only, clean display */}
                  <p className="text-sm text-white/95 font-body leading-relaxed">
                    <span className="text-[#FFC466] font-bold mr-2">{idx + 1}.</span>
                    {decision}
                  </p>

                  {/* Priority + Deadline overrides */}
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-[#EAF6EE]/60 font-medium mb-1 font-body">
                        Priority
                      </label>
                      <select
                        value={overrides[idx]?.priority || "Medium"}
                        onChange={(e) => updateOverride(idx, "priority", e.target.value as Priority)}
                        className="w-full px-3 py-1.5 glass-input text-xs text-white cursor-pointer [&>option]:bg-[#0F2A1F] font-body"
                      >
                        <option value="High">High</option>
                        <option value="Medium">Medium</option>
                        <option value="Low">Low</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wider text-[#EAF6EE]/60 font-medium mb-1 font-body">
                        Deadline (optional)
                      </label>
                      <input
                        type="text"
                        value={overrides[idx]?.deadline || ""}
                        onChange={(e) => updateOverride(idx, "deadline", e.target.value)}
                        placeholder="e.g. Friday, Sep 12"
                        className="w-full px-3 py-1.5 glass-input text-xs text-white font-body"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-[#EAF6EE]/60 font-body">
              No specific actions or decisions were detected in this communication.
            </p>
          )}

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => { setAnalysisResult(null); setOverrides([]); }}
              className="px-6 py-2.5 btn-ghost text-xs tracking-wide cursor-pointer"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={handleSaveToRegistry}
              disabled={analysisResult.decisions.length === 0}
              className="px-8 py-2.5 btn-primary text-xs tracking-wide cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Save to Registry
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
