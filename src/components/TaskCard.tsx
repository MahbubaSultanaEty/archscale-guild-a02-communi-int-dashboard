"use client";

import React from "react";
import { ActionItem } from "@/types";

interface TaskCardProps {
  item: ActionItem;
  onToggleStatus: (id: string, currentStatus: string) => Promise<void> | void;
  onDelete: (id: string) => Promise<void> | void;
  isUpdating?: boolean;
  isDeleting?: boolean;
}

export default function TaskCard({
  item,
  onToggleStatus,
  onDelete,
  isUpdating = false,
  isDeleting = false,
}: TaskCardProps) {
  const isCompleted = item.status.toLowerCase() === "completed";

  const formattedSavedAt = item.savedAt
    ? new Date(item.savedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <article
      className={`glass-panel p-5 flex flex-col justify-between gap-4 transition-all duration-200 hover:border-white/30 ${
        isCompleted ? "opacity-70 bg-[#0F2A1F]/45" : ""
      }`}
    >
      <div className="space-y-3">
        {/* Top Header: Client name or Tag + Status Badge */}
        <div className="flex items-center justify-between gap-2">
          {item.client ? (
            <span className="text-xs uppercase tracking-wider text-[#EAF6EE]/70 font-semibold font-body truncate">
              {item.client}
            </span>
          ) : (
            <span className="text-xs uppercase tracking-wider text-[#FFC466]/80 font-medium font-body">
              Action Item
            </span>
          )}

          {/* Status Badge */}
          <span
            className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full capitalize font-body tracking-wide ${
              isCompleted
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                : "bg-amber-400/20 text-amber-300 border border-amber-400/30"
            }`}
          >
            {item.status}
          </span>
        </div>

        {/* Task Description */}
        <p
          className={`text-sm font-body leading-relaxed break-words ${
            isCompleted ? "line-through text-white/50" : "text-white/95"
          }`}
        >
          {item.task || item.description}
        </p>
      </div>

      <div className="space-y-3 pt-3 border-t border-white/10">
        {/* Metadata: Deadline and SavedAt */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#EAF6EE]/60 font-body">
          {item.deadline ? (
            <span className="flex items-center gap-1 text-[#FFC466]/90 font-medium">
              <span>📅</span> Due: {item.deadline}
            </span>
          ) : (
            <span className="text-[#EAF6EE]/40">No deadline</span>
          )}

          {formattedSavedAt && (
            <span className="text-[11px] text-[#EAF6EE]/50">
              {formattedSavedAt}
            </span>
          )}
        </div>

        {/* Action Controls: Status Control & Delete */}
        <div className="flex items-center justify-between gap-2 pt-1">
          {/* Status Control */}
          <button
            type="button"
            disabled={isUpdating || isDeleting}
            onClick={() => onToggleStatus(item.id, item.status)}
            className={`px-3.5 py-1.5 text-xs font-semibold rounded-full transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              isCompleted
                ? "btn-ghost hover:bg-white/10 text-white"
                : "btn-primary"
            }`}
          >
            {isUpdating
              ? "Updating..."
              : isCompleted
              ? "Mark Pending"
              : "Mark Completed"}
          </button>

          {/* Delete Button */}
          <button
            type="button"
            disabled={isUpdating || isDeleting}
            onClick={() => onDelete(item.id)}
            className="px-3 py-1.5 text-xs rounded-full border border-red-400/30 text-red-300/80 hover:text-red-200 hover:bg-red-500/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </article>
  );
}
