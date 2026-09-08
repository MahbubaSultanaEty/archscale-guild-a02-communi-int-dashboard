"use client";

import React, { useState } from "react";
import StatTile from "@/components/StatTile";
import ActiveProjectsStream from "@/components/ActiveProjectsStream";
import { DashboardStats } from "@/types";

export default function OverviewPage() {
  // Configured with clean initial stats, easily replaced with API / MongoDB real-time data
  const [stats] = useState<DashboardStats>({
    totalCommunications: 53,
    savedItems: 5,
    pendingActions: 3,
    completedActions: 2,
  });

  return (
    <div className="space-y-8">
      {/* 4 Stat Tiles in Grid */}
      <section aria-label="Summary Statistics" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatTile
          label="Total Communications"
          value={stats.totalCommunications}
          subtext="+12 this week"
        />
        <StatTile
          label="Saved Items"
          value={stats.savedItems}
          subtext="in action feed"
        />
        <StatTile
          label="Pending Actions"
          value={stats.pendingActions}
          subtext="2 high priority"
          subtextColor="text-[#FFC466] font-semibold"
        />
        <StatTile
          label="Completed Actions"
          value={stats.completedActions}
          subtext="40% resolved"
        />
      </section>

      {/* Active Studio Projects Stream */}
      <section aria-label="Active Projects" className="max-w-xl">
        <ActiveProjectsStream />
      </section>
    </div>
  );
}
