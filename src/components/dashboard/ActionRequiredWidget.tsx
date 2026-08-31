"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronLeft, ChevronRight, HandCoins, Bell, CalendarClock } from "lucide-react";

export function ActionRequiredWidget() {
  const [page, setPage] = useState(0);

  const actionItems = [
    {
      id: "bills-due",
      title: "Bills Due",
      subtitle: "No bills due at the moment",
      icon: HandCoins,
      href: "/payments/bills",
    },
    {
      id: "notifications",
      title: "Notifications",
      subtitle: "No bills due at the moment",
      icon: Bell,
      href: "/notifications",
    },
    {
      id: "upcoming-payments",
      title: "Upcoming Payments",
      subtitle: "No bills due at the moment",
      icon: CalendarClock,
      href: "/payments/standing",
    },
  ];

  return (
    <div className="flex flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-xs transition-all">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <h2 className="text-[15px] font-medium text-foreground">Action Required</h2>
          <span className="flex size-5 items-center justify-center rounded-full bg-[#e54a4a] text-[11px] font-semibold text-white">
            3
          </span>
        </div>

        {/* Carousel / Navigation Controls */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40 cursor-pointer"
            aria-label="Previous items"
          >
            <ChevronLeft size={16} strokeWidth={1.8} />
          </button>
          <button
            type="button"
            onClick={() => setPage((p) => p + 1)}
            disabled={page >= 0}
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40 cursor-pointer"
            aria-label="Next items"
          >
            <ChevronRight size={16} strokeWidth={1.8} />
          </button>
        </div>
      </div>

      {/* Action Items List */}
      <div className="mt-4 flex flex-col divide-y divide-border/60">
        {actionItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              href={item.href}
              className="group flex items-center justify-between py-2.5 transition-colors hover:bg-muted/40 rounded-lg px-2 -mx-2 first:pt-1 last:pb-1"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-10 items-center justify-center rounded-md bg-muted/80 text-foreground border border-border/40">
                  <Icon size={17} strokeWidth={1.8} />
                </div>
                <div className="flex flex-col">
                  <span className="text-[13px] font-medium text-foreground">{item.title}</span>
                  <span className="text-[12px] text-muted-foreground">{item.subtitle}</span>
                </div>
              </div>

              <ChevronRight
                size={15}
                className="text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-foreground"
              />
            </Link>
          );
        })}
      </div>
    </div>
  );
}
