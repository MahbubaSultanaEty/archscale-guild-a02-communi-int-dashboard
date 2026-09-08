"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const isTabActive = (path: string) => {
    if (path === "/dashboard") {
      return pathname === "/dashboard";
    }
    return pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen flex flex-col items-center px-4 sm:px-8 py-8 max-w-6xl mx-auto w-full">
      {/* Header & Brand */}
      <header className="w-full flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#EAF6EE] opacity-80" />
            <p className="text-xs uppercase tracking-widest text-[#EAF6EE]/75 font-semibold">
              ArchScale Studio
            </p>
          </div>
          <h1 className="text-2xl sm:text-3xl font-heading text-white tracking-wide mt-1">
            Communication Intelligence
          </h1>
        </div>

        {/* Top Nav (Glass Pill Tabs with Next.js Links) */}
        <nav
          aria-label="Dashboard views"
          className="flex items-center gap-2 p-1.5 rounded-full glass-panel"
        >
          <Link
            href="/dashboard"
            className={`px-5 py-2 text-sm font-medium rounded-full cursor-pointer transition-all ${
              isTabActive("/dashboard")
                ? "glass-pill-active"
                : "glass-pill-inactive"
            }`}
          >
            Overview
          </Link>
          <Link
            href="/dashboard/communication"
            className={`px-5 py-2 text-sm font-medium rounded-full cursor-pointer transition-all ${
              isTabActive("/dashboard/communication")
                ? "glass-pill-active"
                : "glass-pill-inactive"
            }`}
          >
            Communication
          </Link>
          <Link
            href="/dashboard/action-items"
            className={`px-5 py-2 text-sm font-medium rounded-full cursor-pointer transition-all ${
              isTabActive("/dashboard/action-items")
                ? "glass-pill-active"
                : "glass-pill-inactive"
            }`}
          >
            Action Items
          </Link>
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="w-full flex-1">{children}</main>

      {/* Subtle Studio Footer */}
      <footer className="mt-12 text-center text-xs text-[#EAF6EE]/50 font-body">
        ArchScale Communication Intelligence · Green Glassmorphic Studio Admin
      </footer>
    </div>
  );
}
