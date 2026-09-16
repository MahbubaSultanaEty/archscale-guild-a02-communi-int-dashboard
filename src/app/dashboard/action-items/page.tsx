"use client";

import React, { useState, useEffect, useId, useCallback } from "react";
import TaskCard from "@/components/TaskCard";
import { ActionItem } from "@/types";

export default function ActionItemsPage() {
  const [items, setItems] = useState<ActionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("All");

  const filterSearchId = useId();
  const filterStatusId = useId();

  // Fetch real data using GET /api/action-items
  const fetchActionItems = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/action-items");
      if (!res.ok) {
        throw new Error("Failed to load action items");
      }
      const data: ActionItem[] = await res.json();
      setItems(data);
    } catch (error) {
      console.error(error);
      setErrorMessage("Could not load action items from the server.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActionItems();
  }, [fetchActionItems]);

  // Toggle Item Status using PATCH /api/action-items
  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const nextStatus =
      currentStatus.toLowerCase() === "completed" ? "pending" : "completed";
    setUpdatingId(id);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/action-items", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id,
          status: nextStatus,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || "Failed to update task status");
      }

      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, status: nextStatus } : item
        )
      );
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to update task status"
      );
    } finally {
      setUpdatingId(null);
    }
  };

  // Delete Item using DELETE /api/action-items
  const handleDelete = async (id: string) => {
    setDeletingId(id);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const res = await fetch(`/api/action-items?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || "Failed to delete task");
      }

      setItems((prev) => prev.filter((item) => item.id !== id));
      setSuccessMessage("Task deleted successfully!");

      setTimeout(() => {
        setSuccessMessage(null);
      }, 3500);
    } catch (error) {
      console.error(error);
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Failed to delete task. Please try again."
      );
    } finally {
      setDeletingId(null);
    }
  };

  // Filtering
  const filteredItems = items.filter((item) => {
    const taskText = (item.task || item.description || "").toLowerCase();
    const clientText = (item.client || "").toLowerCase();
    const query = searchQuery.toLowerCase();

    const matchesSearch =
      taskText.includes(query) || clientText.includes(query);

    const matchesStatus =
      filterStatus === "All" ||
      item.status.toLowerCase() === filterStatus.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Success Notification */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-[#2F6B4F]/90 border border-white/30 text-white text-sm flex items-center justify-between shadow-lg">
          <span className="flex items-center gap-2 font-medium">
            ✓ {successMessage}
          </span>
          <button
            type="button"
            onClick={() => setSuccessMessage(null)}
            className="text-xs underline text-white/80 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Error Notification */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-red-900/80 border border-red-400/40 text-white text-sm flex items-center justify-between shadow-lg">
          <span>✕ {errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-xs underline text-white/80 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter Bar */}
      <div className="glass-panel p-4 sm:p-5 flex flex-wrap items-center gap-3">
        {/* Search input */}
        <div className="flex-1 min-w-[200px]">
          <label htmlFor={filterSearchId} className="sr-only">
            Search tasks or clients...
          </label>
          <input
            id={filterSearchId}
            type="text"
            placeholder="Search tasks, details, clients..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2.5 glass-input text-sm text-white font-body"
          />
        </div>

        {/* Status filter */}
        <div className="w-full sm:w-auto">
          <label htmlFor={filterStatusId} className="sr-only">
            Filter by Status
          </label>
          <select
            id={filterStatusId}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full sm:w-40 px-3 py-2.5 glass-input text-sm text-white cursor-pointer [&>option]:bg-[#0F2A1F] font-body"
          >
            <option value="All">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Loading state */}
      {isLoading ? (
        <div className="glass-panel p-12 text-center text-[#EAF6EE]/75 text-sm font-body">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white mb-2" />
          <p>Loading action items from MongoDB...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="glass-panel p-12 text-center text-[#EAF6EE]/75 text-sm font-body">
          {items.length === 0
            ? "No action items saved yet. Analyze communications to extract and save action items!"
            : "No action items match the current filters."}
        </div>
      ) : (
        /* Responsive Grid: Mobile 1 col, Tablet 2 cols, Desktop 3 cols */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredItems.map((item) => (
            <TaskCard
              key={item.id}
              item={item}
              onToggleStatus={handleToggleStatus}
              onDelete={handleDelete}
              isUpdating={updatingId === item.id}
              isDeleting={deletingId === item.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
