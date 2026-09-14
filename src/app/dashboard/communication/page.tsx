"use client";

import React, { useId, useState } from "react";
import Link from "next/link";
import { Priority } from "@/types";

interface AnalysisResult {
  summary: string;
  deadline: string | null;
  actionItems: string[];
}

interface SavedActionItem {
  client: string;
  summary: string;
  deadline: string | null;
  priority: Priority;
  actionItems: string[];
  status: "Pending";
}

export default function CommunicationPage() {
  const [selectedClient, setSelectedClient] = useState(
    "Evelyn Vance — Vance Penthouse"
  );
  const [rawText, setRawText] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] =
    useState<AnalysisResult | null>(null);

  // Admin-controlled universal fields
  const [globalPriority, setGlobalPriority] =
    useState<Priority>("Medium");
  const [globalDeadline, setGlobalDeadline] = useState("");

  const inputClientSelectId = useId();
  const inputMessageTextareaId = useId();

  // ───────────────────────────────────────────────────────────────────────
  // Analyze communication
  // ───────────────────────────────────────────────────────────────────────

  const handleAnalyze = async () => {
    if (!rawText.trim()) return;

    setIsAnalyzing(true);
    setErrorNotice(null);
    setSaveSuccessNotice(false);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: rawText,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to analyze communication");
      }

      const data: AnalysisResult = await response.json();

      setAnalysisResult({
        summary: data.summary || "",
        deadline: data.deadline || null,
        actionItems: Array.isArray(data.actionItems)
          ? data.actionItems
          : [],
      });

      // AI deadline is used to prefill the admin field.
      // Admin can edit it before saving.
      setGlobalDeadline(data.deadline || "");
      setGlobalPriority("Medium");
    } catch (error) {
      console.error(error);
      setErrorNotice(
        "Could not complete analysis. Please try again."
      );
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ───────────────────────────────────────────────────────────────────────
  // Save approved data
  // ───────────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!analysisResult || analysisResult.actionItems.length === 0) {
      return;
    }

    setIsSaving(true);
    setErrorNotice(null);

    const [clientName] = selectedClient.split(" — ");

    const payload: SavedActionItem = {
      client: clientName || "Client",
      summary: analysisResult.summary,
      deadline: globalDeadline.trim() || null,
      priority: globalPriority,
      actionItems: analysisResult.actionItems,
      status: "Pending",
    };

    try {
      /*
       * MongoDB is not connected yet.
       *
       * This POST endpoint is ready for the CRUD/API layer.
       * Later, /api/action-items can save this JSON payload to MongoDB.
       */
      const response = await fetch("/api/action-items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("Failed to save action items");
      }

      setSaveSuccessNotice(true);
      setAnalysisResult(null);
      setRawText("");
      setGlobalPriority("Medium");
      setGlobalDeadline("");

      setTimeout(() => {
        setSaveSuccessNotice(false);
      }, 3500);
    } catch (error) {
      console.error(error);
      setErrorNotice(
        "Could not save the action items. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  // ───────────────────────────────────────────────────────────────────────
  // Discard
  // ───────────────────────────────────────────────────────────────────────

  const handleDiscard = () => {
    setAnalysisResult(null);
    setGlobalPriority("Medium");
    setGlobalDeadline("");
    setErrorNotice(null);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Success Banner */}
      {saveSuccessNotice && (
        <div className="p-4 rounded-xl bg-[#2F6B4F]/90 border border-white/30 text-white text-sm flex items-center justify-between shadow-lg">
          <span className="flex items-center gap-2 font-medium">
            ✓ Saved to Action Items registry!
          </span>

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

          <button
            type="button"
            onClick={() => setErrorNotice(null)}
            className="text-xs underline text-white/80"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────
          Communication Input
      ────────────────────────────────────────────────────────────────── */}

      <div className="glass-panel p-6 sm:p-8 space-y-6">
        <div>
          <h2 className="text-xl sm:text-2xl font-heading text-white">
            Paste & Analyze Communication
          </h2>

          <p className="text-xs sm:text-sm text-[#EAF6EE]/75 mt-1 font-body">
            Paste raw client emails, WhatsApp threads, voice transcripts,
            or meeting notes below.
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

        {/* Raw Communication */}
        <div className="space-y-2">
          <label
            htmlFor={inputMessageTextareaId}
            className="block text-xs uppercase tracking-wider text-[#EAF6EE]/80 font-medium font-body"
          >
            Raw Communication
          </label>

          <textarea
            id={inputMessageTextareaId}
            rows={8}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Paste the complete communication here..."
            className="w-full p-4 glass-input text-sm text-white resize-y font-body leading-relaxed"
          />
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleAnalyze}
            disabled={!rawText.trim() || isAnalyzing}
            className={`px-8 py-3 btn-primary text-sm tracking-wide cursor-pointer transition-all ${
              !rawText.trim() || isAnalyzing
                ? "opacity-50 cursor-not-allowed"
                : ""
            }`}
          >
            {isAnalyzing ? "Analyzing..." : "Analyze Communication"}
          </button>
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────
          AI Result
      ────────────────────────────────────────────────────────────────── */}

      {analysisResult && (
        <div className="glass-panel p-6 sm:p-8 space-y-6">
          {/* Header */}
          <div className="border-b border-white/15 pb-4">
            <span className="text-xs uppercase tracking-wider text-[#FFC466] font-semibold font-body">
              AI Analysis Complete
            </span>

            <h3 className="text-lg sm:text-xl font-heading text-white mt-0.5">
              Important Project Information
            </h3>
          </div>

          {/* Summary */}
          <div>
            <span className="block text-xs uppercase tracking-wider text-[#EAF6EE]/80 font-medium mb-1.5 font-body">
              Summary
            </span>

            <div className="p-3.5 rounded-xl bg-[#0F2A1F]/65 border border-white/18 text-sm text-white/95 font-body leading-relaxed">
              {analysisResult.summary || "No summary provided."}
            </div>
          </div>

          {/* Action Items */}
          <div>
            <span className="block text-xs uppercase tracking-wider text-[#EAF6EE]/80 font-medium mb-2 font-body">
              Action Items ({analysisResult.actionItems.length})
            </span>

            {analysisResult.actionItems.length > 0 ? (
              <ul className="space-y-2">
                {analysisResult.actionItems.map((item, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-3 p-3 rounded-xl bg-[#0F2A1F]/55 border border-white/12 text-sm text-white/90 font-body leading-relaxed"
                  >
                    <span className="text-[#FFC466] font-bold mt-0.5 shrink-0">
                      ·
                    </span>

                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-[#EAF6EE]/60 font-body">
                No important action items were detected.
              </p>
            )}
          </div>

          {/* Admin Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-[#0F2A1F]/40 border border-white/10">
            {/* Client */}
            <div>
              <label className="block text-xs uppercase tracking-wider text-[#EAF6EE]/70 font-medium mb-1.5 font-body">
                Client
              </label>

              <input
                type="text"
                value={selectedClient.split(" — ")[0]}
                readOnly
                className="w-full px-3 py-2 glass-input text-sm text-white font-body opacity-80"
              />
            </div>

            {/* Deadline */}
            <div>
              <label className="block text-xs uppercase tracking-wider text-[#EAF6EE]/70 font-medium mb-1.5 font-body">
                Deadline
              </label>

              <input
                type="text"
                value={globalDeadline}
                onChange={(e) => setGlobalDeadline(e.target.value)}
                placeholder="e.g. September 15"
                className="w-full px-3 py-2 glass-input text-sm text-white font-body"
              />
            </div>

            {/* Priority */}
            <div>
              <label className="block text-xs uppercase tracking-wider text-[#EAF6EE]/70 font-medium mb-1.5 font-body">
                Priority
              </label>

              <select
                value={globalPriority}
                onChange={(e) =>
                  setGlobalPriority(e.target.value as Priority)
                }
                className="w-full px-3 py-2 glass-input text-sm text-white cursor-pointer [&>option]:bg-[#0F2A1F] font-body"
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 pt-1">
            <button
              type="button"
              onClick={handleDiscard}
              disabled={isSaving}
              className="px-6 py-2.5 btn-ghost text-xs tracking-wide cursor-pointer disabled:opacity-50"
            >
              Discard
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={
                analysisResult.actionItems.length === 0 ||
                isSaving
              }
              className="px-8 py-2.5 btn-primary text-xs tracking-wide cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? "Saving..." : "Save to Action Items"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}