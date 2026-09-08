"use client";

import React from "react";

interface StatTileProps {
  label: string;
  value: number | string;
  subtext?: string;
  subtextColor?: string;
}

export default function StatTile({
  label,
  value,
  subtext,
  subtextColor = "text-[#EAF6EE]/70",
}: StatTileProps) {
  return (
    <div className="glass-panel p-6 flex flex-col justify-between">
      <span className="text-xs tracking-wider uppercase text-[#EAF6EE]/80 font-medium font-body">
        {label}
      </span>
      <div className="mt-4 flex items-baseline justify-between">
        <span className="text-4xl sm:text-5xl font-heading text-white">
          {value}
        </span>
        {subtext && (
          <span className={`text-xs ${subtextColor} font-body`}>
            {subtext}
          </span>
        )}
      </div>
    </div>
  );
}
