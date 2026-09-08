"use client";

import React from "react";
import { ActionItem } from "@/types";

interface TaskCardProps {
  item: ActionItem;
  onToggleComplete?: (id: string) => void;
  onReject?: (id: string) => void;
}

export default function TaskCard({
  item,
  onToggleComplete,
  onReject,
}: TaskCardProps) {
  return (
    <article className="glass-panel p-6 sm:p-7 flex flex-col justify-between transition-all">
      {/* Top: Client + Project & Date */}
      <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-1 mb-3">
        <h3 className="font-heading text-white text-lg sm:text-[19px] tracking-wide">
          {item.client}{" "}
          <span className="text-[#EAF6EE]/75 font-normal text-base font-body">
            — {item.project}
          </span>
        </h3>
        <span className="text-xs text-[#EAF6EE]/70 font-body">
          {item.date} {item.deadline ? `(Target: ${item.deadline})` : ""}
        </span>
      </div>

      {/* Middle: Task Description */}
      <p className="text-sm text-white/95 leading-[1.6] mb-6 font-body">
        {item.description}
      </p>

      {/* Bottom: Priority + Status + Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-white/10">
        {/* Priority & Status */}
        <div className="flex items-center gap-2.5">
          {item.priority === "High" ? (
            <span className="text-xs font-semibold px-3 py-1 rounded-full tag-amber-priority">
              High Priority
            </span>
          ) : (
            <span className="text-xs px-3 py-1 rounded-full tag-neutral-priority">
              {item.priority}
            </span>
          )}

          <span className="text-[#EAF6EE]/50 text-xs">·</span>

          <span
            className={`text-xs ${
              item.status === "Completed"
                ? "text-[#EAF6EE]/60 line-through"
                : "text-[#EAF6EE]/90 font-medium"
            }`}
          >
            {item.status}
          </span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2.5">
          {onToggleComplete && (
            <button
              type="button"
              onClick={() => onToggleComplete(item.id)}
              className="px-5 py-1.5 btn-primary text-xs cursor-pointer"
            >
              {item.status === "Pending" ? "Complete" : "Undo"}
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
