"use client";

import React, { useState, useId } from "react";
import TaskCard from "@/components/TaskCard";
import { ActionItem, Priority, Status } from "@/types";

const INITIAL_ITEMS: ActionItem[] = [
  {
    id: "act-1",
    client: "Evelyn Vance",
    project: "Vance Penthouse",
    date: "Sep 7, 2026",
    description: "Review and approve Italian Calacatta marble slab alternatives due to supplier lead-time delay on master bathroom vanity.",
    priority: "High",
    deadline: "2026-09-12",
    status: "Pending",
  },
  {
    id: "act-2",
    client: "Marcus & Olivia Sterling",
    project: "Komorebi Modern Pavilion",
    date: "Sep 6, 2026",
    description: "Transmit revised millwork drawings for custom acoustic walnut panelling in private listening room to contractor.",
    priority: "Medium",
    deadline: "2026-09-18",
    status: "Pending",
  },
  {
    id: "act-3",
    client: "Julian Thorne",
    project: "Thorne Residence",
    date: "Sep 5, 2026",
    description: "Sign off on brass hardware finish samples and confirm delivery window with Paris foundry.",
    priority: "Low",
    deadline: "2026-09-25",
    status: "Completed",
  },
];

export default function ActionItemsPage() {
  const [items, setItems] = useState<ActionItem[]>(INITIAL_ITEMS);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterClient, setFilterClient] = useState("All");
  const [filterStatus, setFilterStatus] = useState<"All" | Status>("All");
  const [filterPriority, setFilterPriority] = useState<"All" | Priority>("All");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;

  const filterClientId = useId();
  const filterSearchId = useId();
  const filterStatusId = useId();
  const filterPriorityId = useId();

  // Toggle Item Completion (ready for MongoDB / API update)
  const toggleItemStatus = (id: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id
          ? { ...item, status: item.status === "Pending" ? "Completed" : "Pending" }
          : item
      )
    );
  };

  // Reject Item (ready for MongoDB / API delete)
  const handleReject = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  // Filtering
  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.project.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesClient = filterClient === "All" || item.client === filterClient;
    const matchesStatus = filterStatus === "All" || item.status === filterStatus;
    const matchesPriority = filterPriority === "All" || item.priority === filterPriority;

    return matchesSearch && matchesClient && matchesStatus && matchesPriority;
  });

  const totalPages = Math.max(1, Math.ceil(filteredItems.length / itemsPerPage));
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const uniqueClients = Array.from(new Set(items.map((i) => i.client)));

  return (
    <div className="space-y-6">
      {/* Horizontal Glass Filter Bar */}
      <div className="glass-panel p-4 sm:p-5 flex flex-wrap items-center gap-3">
        {/* Search input */}
        <div className="flex-1 min-w-[200px]">
          <label htmlFor={filterSearchId} className="sr-only">
            Search actions, clients, keywords...
          </label>
          <input
            id={filterSearchId}
            type="text"
            placeholder="Search actions, clients, keywords..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full px-4 py-2.5 glass-input text-sm text-white font-body"
          />
        </div>

        {/* Client filter */}
        <div className="w-full sm:w-auto">
          <label htmlFor={filterClientId} className="sr-only">
            Filter by Client
          </label>
          <select
            id={filterClientId}
            value={filterClient}
            onChange={(e) => {
              setFilterClient(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full sm:w-44 px-3 py-2.5 glass-input text-sm text-white cursor-pointer [&>option]:bg-[#0F2A1F] font-body"
          >
            <option value="All">All Clients</option>
            {uniqueClients.map((client) => (
              <option key={client} value={client}>
                {client}
              </option>
            ))}
          </select>
        </div>

        {/* Status filter */}
        <div className="w-full sm:w-auto">
          <label htmlFor={filterStatusId} className="sr-only">
            Filter by Status
          </label>
          <select
            id={filterStatusId}
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value as "All" | Status);
              setCurrentPage(1);
            }}
            className="w-full sm:w-36 px-3 py-2.5 glass-input text-sm text-white cursor-pointer [&>option]:bg-[#0F2A1F] font-body"
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Completed">Completed</option>
          </select>
        </div>

        {/* Priority filter */}
        <div className="w-full sm:w-auto">
          <label htmlFor={filterPriorityId} className="sr-only">
            Filter by Priority
          </label>
          <select
            id={filterPriorityId}
            value={filterPriority}
            onChange={(e) => {
              setFilterPriority(e.target.value as "All" | Priority);
              setCurrentPage(1);
            }}
            className="w-full sm:w-36 px-3 py-2.5 glass-input text-sm text-white cursor-pointer [&>option]:bg-[#0F2A1F] font-body"
          >
            <option value="All">All Priorities</option>
            <option value="High">High Priority</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>
      </div>

      {/* Cards Stack (16px gaps, using reusable TaskCard) */}
      <div className="space-y-4">
        {paginatedItems.length === 0 ? (
          <div className="glass-panel p-12 text-center text-[#EAF6EE]/75 text-sm font-body">
            No action items match the current filters.
          </div>
        ) : (
          paginatedItems.map((item) => (
            <TaskCard
              key={item.id}
              item={item}
              onToggleComplete={toggleItemStatus}
              onReject={handleReject}
            />
          ))
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-4 font-body">
          <button
            type="button"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            className={`px-4 py-2 text-xs rounded-full glass-panel cursor-pointer text-[#EAF6EE] transition-all ${
              currentPage === 1 ? "opacity-40 cursor-not-allowed" : "hover:bg-[#0F2A1F]/80"
            }`}
          >
            ← Previous
          </button>

          <span className="text-xs text-[#EAF6EE]/85 px-2 font-medium">
            Page {currentPage} of {totalPages}
          </span>

          <button
            type="button"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            className={`px-4 py-2 text-xs rounded-full glass-panel cursor-pointer text-[#EAF6EE] transition-all ${
              currentPage === totalPages ? "opacity-40 cursor-not-allowed" : "hover:bg-[#0F2A1F]/80"
            }`}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
