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
 *   - Unread notifications sit under "Important"; read ones under "More notifications".
 *   - The list loads a page at a time as it's scrolled to the bottom, with a skeleton while the next page comes in.
 *   - The ⋮ on each row archives or deletes it. Delete asks first.
 *   - Archived notifications open inside the same panel, so nothing leaves the header.
 *   - The gear opens Notification settings (Settings › Alerts).
 *
 * The delete confirmation is rendered beside the panel, not inside it, so closing the panel can't close the dialog.
 */

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import {
  ArrowLeft,
  Archive,
  Bell,
  CheckCircle2,
  MoreVertical,
  RotateCcw,
  Send,
  Settings,
  Trash2,
  TriangleAlert,
  X,
  XCircle,
} from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogBody, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ListSkeleton } from "@/components/states/ListStates";
import { formatRelative, type NotificationKind } from "@/lib/mock-data";
import { openSettings } from "@/lib/settings-modal";
import { DURATION, EASE } from "@/lib/motion";
import { cn } from "@/lib/utils";
import {
  useNotificationFeed,
  useNotificationsStore,
  useUnreadNotificationCount,
  type NotificationStatus,
} from "@/lib/notifications-store";

type View = "recent" | "archived";

/** How many rows each page adds, and how long the next page takes to come in. */
const PAGE_SIZE = 5;
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

const KIND_ICON: Record<NotificationKind, { icon: React.ElementType; className: string }> = {
  submission: { icon: Send, className: "text-muted-foreground" },
  approval: { icon: CheckCircle2, className: "text-success-text" },
  rejection: { icon: TriangleAlert, className: "text-warning-text" },
  status: { icon: XCircle, className: "text-muted-foreground" },
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
  view,
  onOpen,
  onArchive,
  onRestore,
  onDelete,
}: {
  n: NotificationStatus;
  view: View;
  /** Called when the row is opened. A row with a link also closes the panel, since the page changes. */
  onOpen: (closePanel: boolean) => void;
  onArchive: () => void;
  onRestore: () => void;
  onDelete: () => void;
}) {
  const { icon: Icon, className } = KIND_ICON[n.kind];
  const content = (
    <>
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
        <Icon size={16} aria-hidden="true" className={className} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={cn("text-[14px] leading-snug", n.read ? "text-muted-foreground" : "text-foreground")}>
          {n.title}
        </span>
        <span className="line-clamp-2 text-[13px] leading-relaxed text-muted-foreground">{n.body}</span>
        <span className="mt-0.5 text-[12px] text-muted-foreground tabular">{formatRelative(n.date)}</span>
      </span>
    </>
  );

  return (
    <li className="flex items-center gap-1 px-4 py-3 transition-colors hover:bg-muted/50">
      {n.href ? (
        <Link href={n.href} onClick={() => onOpen(true)} className="flex min-w-0 flex-1 items-start gap-3 rounded-xl">
          {content}
        </Link>
      ) : (
        <button
          type="button"
          onClick={() => onOpen(false)}
          className="flex min-w-0 flex-1 cursor-pointer items-start gap-3 rounded-xl text-left"
        >
          {content}
        </button>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label={`More options for ${n.title}`}
          className="flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <MoreVertical size={16} aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          {view === "recent" ? (
            <DropdownMenuItem onClick={onArchive} className="cursor-pointer text-[13px]">
              <Archive size={14} aria-hidden="true" />
              Archive
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={onRestore} className="cursor-pointer text-[13px]">
              <RotateCcw size={14} aria-hidden="true" />
              Move back to Recent
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={onDelete} className="cursor-pointer text-[13px] text-destructive">
            <Trash2 size={14} aria-hidden="true" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}

function SectionHeading({ children, action }: { children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 px-4 pt-3 pb-1">
      <h3 className="text-[13px] font-medium text-foreground">{children}</h3>
      {action}
    </div>
  );
}

export function NotificationsMenu() {
  const desktop = useDesktop();
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<View>("recent");
  const [shown, setShown] = useState(PAGE_SIZE);
  const [loadingMore, setLoadingMore] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<NotificationStatus | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const feed = useNotificationFeed();
  const unreadCount = useUnreadNotificationCount();
  const markRead = useNotificationsStore((s) => s.markRead);
  const setArchived = useNotificationsStore((s) => s.setArchived);
  const remove = useNotificationsStore((s) => s.remove);

  const recent = feed.filter((n) => !n.archived).sort(newestFirst);
  const archived = feed.filter((n) => n.archived).sort(newestFirst);
  // Unread first, so "Important" is always the top of the list and the paging never splits the two groups.
  const list = view === "recent" ? [...recent.filter((n) => !n.read), ...recent.filter((n) => n.read)] : archived;
  const visible = list.slice(0, shown);
  const hasMore = shown < list.length;

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

  function archive(n: NotificationStatus) {
    setArchived(n.id, true);
    toast.success("Archived", {
      description: n.title,
      action: { label: "Undo", onClick: () => setArchived(n.id, false) },
    });
  }

  function restore(n: NotificationStatus) {
    setArchived(n.id, false);
    toast.success("Moved back to Recent", { description: n.title });
  }

  function confirmDelete() {
    if (!pendingDelete) return;
    remove(pendingDelete.id);
    toast.success("Notification deleted");
    setPendingDelete(null);
  }

  const rowFor = (n: NotificationStatus) => (
    <NotificationRow
      key={n.id}
      n={n}
      view={view}
      onOpen={(closePanel) => {
        markRead([n.id]);
        if (closePanel) close();
      }}
      onArchive={() => archive(n)}
      onRestore={() => restore(n)}
      onDelete={() => setPendingDelete(n)}
    />
  );

  const emptyCopy = view === "recent" ? "Nothing to catch up on." : "Nothing archived.";
  const important = visible.filter((n) => !n.read);
  const more = visible.filter((n) => n.read);

  // The same panel in both shapes. On a phone it fills the screen, so it takes the full height.
  const body = (
    <div className={cn("flex flex-col", desktop ? "max-h-[min(72vh,600px)]" : "h-full")}>
      <div className="flex h-12 shrink-0 items-center gap-1 pl-4 pr-2">
        {view === "archived" ? (
          <IconButton label="Back to notifications" icon={ArrowLeft} onClick={() => switchView("recent")} />
        ) : (
          !desktop && <IconButton label="Close notifications" icon={X} onClick={close} />
        )}
        <h2 className="min-w-0 flex-1 truncate text-[16px] font-medium text-foreground">
          {view === "recent" ? "Notifications" : "Archived"}
        </h2>
        {view === "recent" && (
          <Button variant="outline" size="sm" onClick={() => switchView("archived")} className="shrink-0 gap-2">
            Archived
            <span className="text-muted-foreground tabular">{archived.length}</span>
          </Button>
        )}
        <IconButton
          label="Notification settings"
          icon={Settings}
          onClick={() => {
            close();
            openSettings("alerts");
          }}
        />
      </div>

      <div
        ref={scrollRef}
        className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain border-t border-border/60"
      >
        {list.length === 0 ? (
          <p className="px-4 py-10 text-center text-[13px] text-muted-foreground">{emptyCopy}</p>
        ) : (
          <>
            {view === "recent" ? (
              <>
                {important.length > 0 && (
                  <section>
                    <SectionHeading
                      action={
                        <button
                          type="button"
                          onClick={() => markRead(recent.map((n) => n.id))}
                          className="cursor-pointer text-[12px] text-muted-foreground transition-colors hover:text-foreground"
                        >
                          Mark all as read
                        </button>
                      }
                    >
                      Important
                    </SectionHeading>
                    <ul>{important.map(rowFor)}</ul>
                  </section>
                )}
                {more.length > 0 && (
                  <section>
                    <SectionHeading>More notifications</SectionHeading>
                    <ul>{more.map(rowFor)}</ul>
                  </section>
                )}
              </>
            ) : (
              <ul>{visible.map(rowFor)}</ul>
            )}

            <div ref={sentinelRef} aria-hidden="true" />
            {loadingMore && <ListSkeleton rows={2} />}
            {!hasMore && view === "recent" && (
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
      {unreadCount > 0 && (
        <span className="absolute right-1 top-1 size-1.5 rounded-full bg-destructive ring-2 ring-card" aria-hidden />
      )}
    </>
  );
  const bellLabel = unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications";

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
