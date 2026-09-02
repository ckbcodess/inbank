import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, HandCoins, Bell, CalendarClock, ShieldAlert, CreditCard, FileCheck, Check } from "lucide-react";
import { toast } from "sonner";

export function ActionRequiredWidget() {
  const [page, setPage] = useState(0);

  const [allPages, setAllPages] = useState([
    [
      {
        id: "bills-due",
        title: "Bills Due",
        subtitle: "No bills due at the moment",
        icon: HandCoins,
        href: "/payments/bills",
        resolved: false,
      },
      {
        id: "notifications",
        title: "Notifications",
        subtitle: "Review 3 security & activity alerts",
        icon: Bell,
        href: "/notifications",
        resolved: false,
      },
      {
        id: "upcoming-payments",
        title: "Upcoming Payments",
        subtitle: "Standing order to St Marys in 3 days",
        icon: CalendarClock,
        href: "/payments/standing",
        resolved: false,
      },
    ],
    [
      {
        id: "kyc-review",
        title: "KYC Verification",
        subtitle: "Proof of address verification complete",
        icon: ShieldAlert,
        href: "/profile-selection",
        resolved: false,
      },
      {
        id: "card-pin",
        title: "Card PIN Setup",
        subtitle: "Activate contactless PIN for Visa Debit",
        icon: CreditCard,
        href: "/cards",
        resolved: false,
      },
      {
        id: "tax-cert",
        title: "Annual Tax Certificate",
        subtitle: "2025 statement available for download",
        icon: FileCheck,
        href: "/reports",
        resolved: false,
      },
    ],
  ]);

  const currentPageItems = allPages[page] || [];
  const activeItemsCount = allPages.flat().filter((item) => !item.resolved).length;

  const handleResolveItem = (e: React.MouseEvent, itemId: string, itemTitle: string) => {
    e.preventDefault();
    e.stopPropagation();

    setAllPages((prev) =>
      prev.map((p) =>
        p.map((item) => (item.id === itemId ? { ...item, resolved: true } : item))
      )
    );

    toast.success(`"${itemTitle}" marked as completed`, {
      description: "Item has been cleared from your action list.",
    });
  };

  return (
    <div className="flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-xs transition-all">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <h2 className="text-[16px] font-medium text-foreground">Action Required</h2>
          {activeItemsCount > 0 && (
            <span className="flex size-6 items-center justify-center rounded-full bg-[#e54a4a] text-[13px] font-medium text-white transition-all">
              {activeItemsCount}
            </span>
          )}
        </div>

        {/* Carousel / Navigation Controls */}
        <div className="flex items-center gap-1">
          <span className="text-[12px] text-muted-foreground mr-1">
            {page + 1}/{allPages.length}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40 cursor-pointer"
            aria-label="Previous items"
          >
            <ChevronLeft size={18} strokeWidth={1.8} />
          </button>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(allPages.length - 1, p + 1))}
            disabled={page >= allPages.length - 1}
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40 cursor-pointer"
            aria-label="Next items"
          >
            <ChevronRight size={18} strokeWidth={1.8} />
          </button>
        </div>
      </div>

      {/* Action Items List */}
      <div className="my-auto py-1 flex flex-col divide-y divide-border/60">
        {currentPageItems.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.id}
              className={`group flex items-center justify-between py-2.5 transition-all rounded-lg px-2 -mx-2 first:pt-1 last:pb-1 ${
                item.resolved ? "opacity-40 line-through" : "hover:bg-muted/40"
              }`}
            >
              <Link href={item.href} className="flex items-center gap-3 flex-1 min-w-0">
                <div className={`flex h-[26px] w-[34px] items-center justify-center rounded-[6px] text-foreground border border-border/40 ${
                  item.resolved ? "bg-muted/40" : "bg-muted/80"
                }`}>
                  <Icon size={16} strokeWidth={1.8} />
                </div>
                <div className="flex flex-col min-w-0 pr-2">
                  <span className="text-[14px] font-normal text-foreground truncate">{item.title}</span>
                  <span className="text-[12px] text-muted-foreground truncate">{item.subtitle}</span>
                </div>
              </Link>

              <div className="flex items-center gap-1.5 shrink-0">
                {!item.resolved && (
                  <button
                    type="button"
                    onClick={(e) => handleResolveItem(e, item.id, item.title)}
                    title="Mark completed"
                    className="flex size-7 items-center justify-center rounded-md text-muted-foreground opacity-60 hover:opacity-100 hover:bg-muted hover:text-emerald-600 transition-all cursor-pointer"
                  >
                    <Check size={15} strokeWidth={2} />
                  </button>
                )}
                <Link href={item.href} className="flex size-7 items-center justify-center rounded-md text-muted-foreground group-hover:text-foreground">
                  <ChevronRight
                    size={14}
                    className="transition-transform group-hover:translate-x-0.5"
                  />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
