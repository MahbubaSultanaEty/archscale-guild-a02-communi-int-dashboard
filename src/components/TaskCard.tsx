"use client";

import React from "react";
import { ActionItem } from "@/types";

interface TaskCardProps {
  item: ActionItem;
  onToggleComplete?: (id: string) => void;
  onReject?: (id: string) => void;
}

const PRIORITY_STYLES: Record<string, string> = {
  High: "bg-[#FFC466]/20 text-[#FFC466] border border-[#FFC466]/40",
  Medium: "bg-white/10 text-[#EAF6EE]/80 border border-white/20",
  Low: "bg-white/5 text-[#EAF6EE]/50 border border-white/10",
};

export default function TaskCard({ item, onToggleComplete, onReject }: TaskCardProps) {
  const isCompleted = item.status === "Completed";

  return (
    <article
      className={`glass-panel p-5 sm:p-6 flex flex-col gap-4 transition-all ${
        isCompleted ? "opacity-60" : ""
      }`}
    >
      {/* Top row: client name + date */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-wider text-[#EAF6EE]/60 font-body font-medium">
            {item.project}
          </p>
          <h3 className="font-heading text-white text-lg sm:text-[19px] tracking-wide leading-snug">
            {item.client}
          </h3>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-xs text-[#EAF6EE]/55 font-body">{item.date}</span>
          {item.deadline && (
            <span className="text-xs text-[#FFC466]/80 font-body">Due: {item.deadline}</span>
          )}
        </div>
      </div>

      {/* Action / Decision text */}
      <p
        className={`text-sm font-body leading-relaxed ${
          isCompleted ? "line-through text-white/50" : "text-white/90"
        }`}
      >
        {item.description}
      </p>

      {/* Bottom row: priority badge + status + buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10">
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-semibold px-3 py-1 rounded-full ${
              PRIORITY_STYLES[item.priority] || PRIORITY_STYLES["Medium"]
            }`}
          >
            {item.priority}
          </span>

          <span className="text-[#EAF6EE]/30 text-xs">·</span>

          <span
            className={`text-xs font-body ${
              isCompleted ? "text-[#EAF6EE]/45" : "text-[#EAF6EE]/80 font-medium"
            }`}
          >
            {item.status}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {onToggleComplete && (
            <button
              type="button"
              onClick={() => onToggleComplete(item.id)}
              className="px-5 py-1.5 btn-primary text-xs cursor-pointer"
            >
              {isCompleted ? "Undo" : "Complete"}
            </button>
          )}
          {onReject && (
            <button
              type="button"
              onClick={() => onReject(item.id)}
              className="px-4 py-1.5 btn-ghost text-xs cursor-pointer"
            >
              Reject
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
