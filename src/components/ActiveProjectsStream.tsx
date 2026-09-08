"use client";

import React from "react";
import Link from "next/link";
import { ProjectStreamItem } from "@/types";

interface ActiveProjectsStreamProps {
  projects?: ProjectStreamItem[];
}

const DEFAULT_PROJECTS: ProjectStreamItem[] = [
  { id: "p-1", name: "Vance Penthouse", status: "Finishing Selection", badge: "2 Tasks" },
  { id: "p-2", name: "Komorebi Pavilion", status: "Millwork & Joinery", badge: "1 Task" },
  { id: "p-3", name: "Thorne Residence", status: "Hardware Procurement", badge: "Resolved" },
  { id: "p-4", name: "Lumina Coastal Villa", status: "Lighting Rough-In", badge: "1 Task" },
];

export default function ActiveProjectsStream({
  projects = DEFAULT_PROJECTS,
}: ActiveProjectsStreamProps) {
  return (
    <div className="glass-panel p-6 flex flex-col justify-between h-full">
      <div>
        <h2 className="text-xl font-heading text-white mb-2">
          Active Projects Stream
        </h2>
        <p className="text-xs text-[#EAF6EE]/75 mb-5 font-body">
          Real-time synthesis across active interior design contracts.
        </p>

        <div className="space-y-3">
          {projects.map((project) => (
            <div
              key={project.id}
              className="flex items-center justify-between py-2.5 border-b border-white/10 last:border-0"
            >
              <div>
                <p className="text-sm font-medium text-white font-body">{project.name}</p>
                <p className="text-xs text-[#EAF6EE]/65 font-body">{project.status}</p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full glass-input text-[#EAF6EE]/90">
                {project.badge}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 pt-4 border-t border-white/10">
        <Link
          href="/dashboard/communication"
          className="w-full block text-center py-2.5 px-4 btn-primary text-xs uppercase tracking-wider cursor-pointer"
        >
          Analyze New Message →
        </Link>
      </div>
    </div>
  );
}
