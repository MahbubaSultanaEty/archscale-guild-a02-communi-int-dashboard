"use client";

import React, { useState, useEffect } from "react";
import StatTile from "@/components/StatTile";
import ActiveProjectsStream from "@/components/ActiveProjectsStream";
import { ActionItem } from "@/types";

export default function OverviewPage() {
  const [items, setItems] = useState<ActionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch("/api/action-items");
        if (res.ok) {
          const data: ActionItem[] = await res.json();
          setItems(data);
        }
      } catch (error) {
        console.error("Failed to fetch action items for overview:", error);
      } finally {
        setIsLoading(false);
      }
    }

    loadStats();
  }, []);

  const totalTasks = items.length;
  const pendingTasks = items.filter(
    (t) => (t.status || "").toLowerCase() === "pending"
  ).length;
  const completedTasks = items.filter(
    (t) => (t.status || "").toLowerCase() === "completed"
  ).length;
  const completionRate =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* Stat Tiles in Grid: Total, Pending, Completed */}
      <section
        aria-label="Summary Statistics"
        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
      >
        <StatTile
          label="Total Tasks"
          value={isLoading ? "..." : totalTasks}
          subtext="in database"
        />
        <StatTile
          label="Pending Tasks"
          value={isLoading ? "..." : pendingTasks}
          subtext={pendingTasks > 0 ? "requires attention" : "all clear"}
          subtextColor="text-[#FFC466] font-semibold"
        />
        <StatTile
          label="Completed Tasks"
          value={isLoading ? "..." : completedTasks}
          subtext={`${completionRate}% completed`}
        />
      </section>

      {/* Active Studio Projects Stream */}
      <section aria-label="Active Projects" className="max-w-xl">
        <ActiveProjectsStream />
      </section>
    </div>
  );
}
