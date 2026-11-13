"use client";

/**
 * The header bell. Notifications open from it, not as a page, in one of two shapes:
 *
 *   - Wide screens: a panel under the bell, the way YouTube's notifications do.
 *   - Phones: a full-screen panel that slides in from the right, the same way the Dev Mode panel does. A popover
 *     there would be squeezed against the screen edge, and a bottom sheet would fight the list's scrolling.
 *
 * Both shapes show the same content:
 *
 *   - A header with the title and the settings gear.
 *   - Inbox and Archived as tabs below the header.
 *   - A flat, newest-first list. Each row has a date at the right, and on hover archive and delete icons.
 *   - Inbox rows that arrived since the panel was last closed get a dot. Closing the panel clears them, and so does
 *     the bell's dot.
 *   - The list loads a page at a time as it's scrolled to the bottom, with a skeleton while the next page comes in.
 *
 * The delete confirmation is rendered beside the panel, not inside it, so closing the panel can't close the dialog.
 */

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Archive,
  ArrowDownLeft,
  ArrowUpRight,
  Bell,
  CreditCard,
  FileText,
  KeyRound,
  Laptop,
  Phone,
  PiggyBank,
  Repeat,
  RotateCcw,
  Settings,
  Smartphone,
  Trash2,
  Tv,
  TrendingUp,
  Wallet,
  X,
  Zap,
} from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatRelative, type NotificationIcon, type NotificationKind } from "@/lib/mock-data";
import { openSettings } from "@/lib/settings-modal";
import { DURATION, EASE } from "@/lib/motion";
import { cn } from "@/lib/utils";
import {
  useHasNewNotifications,
  useNotificationFeed,
  useNotificationsStore,
  type NotificationStatus,
} from "@/lib/notifications-store";

type View = "inbox" | "archived";

/** How many rows each page adds, and how long the next page takes to come in. */
const PAGE_SIZE = 10;
const LOAD_DELAY_MS = 600;

const DESKTOP_QUERY = "(min-width: 640px)";

/** Wide screens get the popover under the bell; below `sm` the panel takes the whole screen. */
function useDesktop() {
  return useSyncExternalStore(
    (notify) => {
      const mq = window.matchMedia(DESKTOP_QUERY);
      mq.addEventListener("change", notify);
      return () => mq.removeEventListener("change", notify);
    },
    () => window.matchMedia(DESKTOP_QUERY).matches,
    () => true,
  );
}

/** The glyph for each icon name a notification can carry. The feed picks the name; this is the only place a glyph is chosen. */
const ICON_GLYPH: Record<NotificationIcon, React.ElementType> = {
  ArrowDownLeft,
  ArrowUpRight,
  Phone,
  Tv,
  FileText,
  Smartphone,
  TrendingUp,
  CreditCard,
  Repeat,
  PiggyBank,
  Zap,
  Wallet,
  KeyRound,
  Laptop,
};

/** Colour only. The icon comes from the notification, and the kind decides how it's tinted. */
const KIND_TINT: Record<NotificationKind, string> = {
  submission: "text-muted-foreground",
  approval: "text-success-text",
  rejection: "text-warning-text",
  status: "text-muted-foreground",
};

/** Newest first. ISO dates sort as strings. */
function newestFirst(a: NotificationStatus, b: NotificationStatus) {
  return b.date.localeCompare(a.date);
}

function IconButton({
  label,
  icon: Icon,
  onClick,
}: {
  label: string;
  icon: React.ElementType;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      <Icon size={16} aria-hidden="true" />
    </button>
  );
}

function NotificationRow({
  n,
  onNavigate,
  onArchive,
  onRestore,
  onDelete,
}: {
  n: NotificationStatus;
  /** A row with a link closes the panel, since the page changes. */
  onNavigate: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onDelete: () => void;
}) {
  const Icon = n.icon ? ICON_GLYPH[n.icon] : Bell;
  const className = KIND_TINT[n.kind];
  const content = (
    <>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
        <Icon size={16} aria-hidden="true" className={className} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="flex items-center gap-2 text-[14px] leading-snug text-foreground">
          {n.isNew && !n.archived && (
            <>
              <span className="size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
              <span className="sr-only">New: </span>
            </>
          )}
          {n.title}
        </span>
        <span className="line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">{n.body}</span>
        {/* On phones there's no hover, so the date sits under the text. From `sm` it's at the right. */}
        <span className="mt-0.5 text-[12px] text-muted-foreground tabular sm:hidden">{formatRelative(n.date)}</span>
      </span>
    </>
  );

  // The date sits at the right. On hover (or keyboard focus) it gives way to the row's actions. On phones the
  // actions stay visible, since there's no hover.
  return (
    <li className="group flex items-center gap-3 border-b border-border/60 px-4 py-3 transition-colors last:border-b-0 hover:bg-muted/50 focus-within:bg-muted/50">
      {n.href ? (
        <Link href={n.href} onClick={onNavigate} className="flex min-w-0 flex-1 items-start gap-3 rounded-xl">
          {content}
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 items-start gap-3">{content}</div>
      )}

      <div className="relative flex h-10 w-[88px] shrink-0 items-center justify-end">
        <span className="text-[12px] text-muted-foreground tabular transition-opacity group-hover:opacity-0 group-focus-within:opacity-0 max-sm:hidden">
          {formatRelative(n.date)}
        </span>
        <div className="absolute inset-0 flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100 max-sm:opacity-100">
          {n.archived ? (
            <IconButton label={`Move back to Inbox: ${n.title}`} icon={RotateCcw} onClick={onRestore} />
          ) : (
            <IconButton label={`Archive: ${n.title}`} icon={Archive} onClick={onArchive} />
          )}
          <IconButton label={`Delete: ${n.title}`} icon={Trash2} onClick={onDelete} />
        </div>
      </div>
    </li>
  );
}

/**
 * A placeholder with a real row's geometry: the same inset, tile, gap, divider and date column. The shimmer-free
 * list ListSkeleton uses is inset differently, so the text slid sideways when the rows came in.
 */
function RowSkeleton() {
  return (
    <div aria-hidden="true" className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
      <span className="size-10 shrink-0 rounded-full bg-muted" />
      <span className="flex min-w-0 flex-1 flex-col gap-2">
        <span className="h-3.5 w-2/5 rounded-full bg-muted" />
        <span className="h-3 w-4/5 rounded-full bg-muted" />
      </span>
      <span className="flex h-10 w-[88px] shrink-0 items-center justify-end">
        <span className="h-3 w-12 rounded-full bg-muted" />
      </span>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "-mb-px flex h-10 shrink-0 cursor-pointer items-center gap-1.5 border-b-2 text-[14px] transition-colors",
        active ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function NotificationsMenu() {
  const desktop = useDesktop();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("inbox");
  const [shown, setShown] = useState(PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<NotificationStatus | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const feed = useNotificationFeed();
  const hasNew = useHasNewNotifications();
  const setArchived = useNotificationsStore((s) => s.setArchived);
  const remove = useNotificationsStore((s) => s.remove);
  const markPanelOpened = useNotificationsStore((s) => s.markPanelOpened);

  const inbox = feed.filter((n) => !n.archived).sort(newestFirst);
  const archived = feed.filter((n) => n.archived).sort(newestFirst);
  const list = view === "inbox" ? inbox : archived;
  const visible = list.slice(0, shown);
  const hasMore = shown < list.length;

  // "Seen" is when the panel closes, so the new dots stay up while it's open and clear once it shuts.
  useEffect(() => {
    if (!open) return;
    return () => markPanelOpened();
  }, [open, markPanelOpened]);

  // Load the next page when the sentinel below the last row scrolls into view.
  useEffect(() => {
    const sentinel = sentinelRef.current;
    const root = scrollRef.current;
    if (!open || !sentinel || !root || !hasMore || loadingMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) setLoadingMore(true);
      },
      { root, rootMargin: "120px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [open, desktop, hasMore, loadingMore, view]);

  // The next page comes in after a short wait, the way a list fetches its next page.
  useEffect(() => {
    if (!loadingMore) return;
    const timer = window.setTimeout(() => {
      setShown((s) => s + PAGE_SIZE);
      setLoadingMore(false);
    }, LOAD_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [loadingMore]);

  // On a phone the panel is full screen and has no popover to dismiss it, so Escape does it.
  useEffect(() => {
    if (!open || desktop) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, desktop]);

  function close() {
    setOpen(false);
  }

  function switchView(next: View) {
    setView(next);
    setShown(PAGE_SIZE);
    scrollRef.current?.scrollTo({ top: 0 });
  }

  // The row's own change is the feedback, so these don't raise a toast.
  function archive(n: NotificationStatus) {
    setArchived(n.id, true);
  }

  function restore(n: NotificationStatus) {
    setArchived(n.id, false);
  }

  function confirmDelete() {
    if (!pendingDelete) return;
    remove(pendingDelete.id);
    setPendingDelete(null);
  }

  const rowFor = (n: NotificationStatus) => (
    <NotificationRow
      key={n.id}
      n={n}
      onNavigate={close}
      onArchive={() => archive(n)}
      onRestore={() => restore(n)}
      onDelete={() => setPendingDelete(n)}
    />
  );

  const emptyCopy = view === "inbox" ? "Nothing to catch up on." : "Nothing archived.";

  // The same panel in both shapes. On a phone it fills the screen, so it takes the full height.
  const body = (
    // `contain: paint` clips anything the list draws, so a skeleton or row can't add a scrollbar to the page behind.
    <div className={cn("flex flex-col [contain:paint]", desktop ? "h-[min(72vh,600px)]" : "h-full")}>
      <div className="flex h-12 shrink-0 items-center gap-1 pl-4 pr-2">
        {!desktop && <IconButton label="Close notifications" icon={X} onClick={close} />}
        <h2 className="min-w-0 flex-1 truncate text-[16px] font-medium text-foreground">Notifications</h2>
        <IconButton
          label="Notification settings"
          icon={Settings}
          onClick={() => {
            close();
            openSettings("alerts");
          }}
        />
      </div>

      <div role="tablist" aria-label="Notifications" className="flex shrink-0 gap-5 border-b border-border/60 px-4">
        <TabButton active={view === "inbox"} onClick={() => switchView("inbox")}>
          Inbox
        </TabButton>
        <TabButton active={view === "archived"} onClick={() => switchView("archived")}>
          Archived
          <span className="text-[12px] text-muted-foreground tabular">{archived.length}</span>
        </TabButton>
      </div>

      <div ref={scrollRef} className="custom-scrollbar min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain">
        {list.length === 0 ? (
          <p className="px-4 py-10 text-center text-[13px] text-muted-foreground">{emptyCopy}</p>
        ) : (
          <>
            <ul>{visible.map(rowFor)}</ul>
            <div ref={sentinelRef} aria-hidden="true" />
            {loadingMore && (
              <div role="status">
                <span className="sr-only">Loading more notifications</span>
                <RowSkeleton />
                <RowSkeleton />
              </div>
            )}
            {!hasMore && (
              <p className="px-4 py-4 text-center text-[12px] text-muted-foreground">You&apos;re all caught up.</p>
            )}
          </>
        )}
      </div>
    </div>
  );

  const bell = (
    <>
      <Bell size={16} />
      {hasNew && (
        <span className="absolute right-1 top-1 size-1.5 rounded-full bg-destructive ring-2 ring-card" aria-hidden />
      )}
    </>
  );
  const bellLabel = hasNew ? "Notifications, new" : "Notifications";

  return (
    <>
      {desktop ? (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            render={<Button variant="ghost" size="icon-sm" className="relative shrink-0" aria-label={bellLabel} />}
          >
            {bell}
          </PopoverTrigger>
          <PopoverContent align="end" sideOffset={8} className="w-[380px] max-w-[calc(100vw-24px)] rounded-2xl">
            {body}
          </PopoverContent>
        </Popover>
      ) : (
        <>
          <Button
            variant="ghost"
            size="icon-sm"
            className="relative shrink-0"
            aria-label={bellLabel}
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
          >
            {bell}
          </Button>
          {/* Portalled to the body: the header is a stacking context with a backdrop blur, which would trap this
              full-screen panel inside the header's box and under the layout. */}
          {typeof document !== "undefined" &&
            createPortal(
              <AnimatePresence>
                {open && (
                  <motion.div
                    key="notifications-panel"
                    role="dialog"
                    aria-modal="true"
                    aria-label="Notifications"
                    initial={{ x: "100%" }}
                    animate={{ x: 0 }}
                    exit={{ x: "100%" }}
                    transition={{ duration: DURATION.move, ease: EASE.settle }}
                    className="fixed inset-0 z-50 flex flex-col bg-background"
                  >
                    {body}
                  </motion.div>
                )}
              </AnimatePresence>,
              document.body,
            )}
        </>
      )}

      <Dialog open={pendingDelete !== null} onOpenChange={(next) => !next && setPendingDelete(null)}>
        <DialogContent size="sm">
          <DialogHeader>
            <DialogTitle>Delete this notification?</DialogTitle>
          </DialogHeader>
          <DialogBody>
            <p className="text-[14px] leading-relaxed text-muted-foreground">
              It will be removed for good. It can&apos;t be restored.
            </p>
          </DialogBody>
          <DialogFooter>
            <Button variant="outline" size="md" onClick={() => setPendingDelete(null)}>
              Cancel
            </Button>
            <Button variant="destructive" size="md" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
