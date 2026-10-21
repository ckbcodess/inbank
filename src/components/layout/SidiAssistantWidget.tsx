"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, Maximize2, Minimize2, ArrowUp, FileText, ArrowRightLeft, Search, SquarePen, CircleHelp, Phone, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useSession } from "@/lib/session-store";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { DURATION, EASE, SPRING } from "@/lib/motion";
import { isBusinessProfile } from "@/lib/profile";

interface ChatMessage {
  id: string;
  sender: "user" | "sidi";
  text: string;
  timestamp: string;
}

interface SuggestionItem {
  id: string;
  title: string;
  icon: React.ElementType;
  query: string;
}

const SUGGESTIONS: SuggestionItem[] = [
  {
    id: "summary",
    title: "Summarize recent transactions",
    icon: FileText,
    query: "Summarize my recent transactions",
  },
  {
    id: "standing-order",
    title: "Set up a scheduled payment",
    icon: ArrowRightLeft,
    query: "How to set up a scheduled payment",
  },
  {
    id: "highest-expenses",
    title: "Find my biggest expenses",
    icon: Search,
    query: "Find my highest expenses this month",
  },
];

const PRESET_ANSWERS: Record<string, string> = {
  summary:
    "Here is your recent account summary for October 2026:\n\n• Total Debits: GHS 3,741.90 across 8 transactions\n• Total Inflow: GHS 8,450.00\n• Top Spending Category: Utilities & Household (38%)\n• Largest Single Expense: Melcom Cantonments (GHS 500.00)\n\nYour operating balance remains healthy at GHS 42,500.00.",
  "standing-order":
    "To set up a scheduled payment:\n\n1. Go to Send & Pay in the main navigation.\n2. Select Scheduled Payments.\n3. Choose your beneficiary, transfer frequency (Weekly or Monthly), and amount.\n4. Authorise with the 6-digit code we send you.\n\nYou can review or cancel active instructions anytime under Send & Pay.",
  "virtual-card":
    "You can generate an instant GCB Virtual Card directly:\n\n1. Open the Cards section.\n2. Tap Request New Card and select Virtual Prepaid Card.\n3. Enter your starting top-up amount from your Current Account.\n\nYour card details (16-digit number, expiry, and CVV) are generated immediately for secure online shopping.",
  "highest-expenses":
    "Here are your highest debit transactions this month:\n\n1. GHS 500.00 — Melcom Stores (Retail & Household)\n2. GHS 320.40 — Shoprite Accra Mall (Groceries)\n3. GHS 249.50 — Melcom Supermarket (Supplies)\n4. GHS 150.00 — ECG Prepaid Electricity (Utilities)\n\nTotal discretionary debits: GHS 1,219.90.",
  "cash-flow":
    "Here is your liquidity outlook for the next 14 days:\n\n• Current Operating Funds: GHS 42,500.00\n• Upcoming Scheduled Bill: DStv Premium (GHS 245.00 due on 15th)\n• Expected Scheduled Payment: Family support (GHS 200.00)\n• Projected Surplus: +GHS 42,055.00\n\nYou are tracking comfortably within your monthly budget.",
  help:
    "I'm here to assist with all your GCB Internet Banking needs!\n\nYou can ask me about:\n• Checking balances, statements & transaction search\n• Domestic bank transfers (GIP, ACH) and GhanaPay QR\n• Mobile Money wallet cash-in and cash-out\n• Card management, limits, blocking and replacements\n• 24/7 GCB Customer Care hotline: +233 302 681 531",
};

const INTRO_KEY = "sidi-intro-seen";
const INTRO_DELAY = 1500;
const INTRO_HOLD = 6000;

const headerButton =
  "flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors duration-hover hover:bg-item-hover hover:text-foreground cursor-pointer";

export function SidiAssistantWidget() {
  const [open, setOpen] = useState(false);
  // On the first load of a session the button opens itself for a few seconds to point at the assistant.
  const [intro, setIntro] = useState(false);
  const [introLabel, setIntroLabel] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputText, setInputText] = useState("");
  const [chatLog, setChatLog] = useState<ChatMessage[]>([]);

  const { actor, activeProfile } = useSession();
  const firstName = actor?.name?.split(" ")[0];
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatLog]);

  // Depend on whether someone is signed in, not on the actor object: the session store hands out a new object when
  // it hydrates or refreshes, and re-running this effect would cancel the timers that end the greeting, leaving it stuck.
  const signedIn = Boolean(actor);
  useEffect(() => {
    if (!signedIn) return;
    try {
      if (sessionStorage.getItem(INTRO_KEY)) return;
      sessionStorage.setItem(INTRO_KEY, "1");
    } catch {
      return;
    }
    // No cleanup on purpose: the greeting must always be allowed to finish and fold away. (Setting state after the
    // widget has gone is harmless.)
    setTimeout(() => {
      setIntroLabel(true);
      setIntro(true);
    }, INTRO_DELAY);
    setTimeout(() => setIntro(false), INTRO_DELAY + INTRO_HOLD);
    // The greeting stays until the pill has folded away, so the text doesn't change mid-fold.
    setTimeout(() => setIntroLabel(false), INTRO_DELAY + INTRO_HOLD + 600);
  }, [signedIn]);

  // Opening puts the cursor in the box; Escape closes.
  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  function handleSendQuery(queryText?: string, presetId?: string) {
    const q = (queryText ?? inputText).trim();
    if (!q) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: "user",
      text: q,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    let reply = presetId && PRESET_ANSWERS[presetId] ? PRESET_ANSWERS[presetId] : null;

    if (!reply) {
      const lower = q.toLowerCase();
      if (lower.includes("balance") || lower.includes("account")) {
        reply = `Your primary Operating Account balance is GHS 42,500.00. You also hold a Smart Save account with GHS 12,850.00.`;
      } else if (lower.includes("card")) {
        reply = `You have 3 active cards: a GCB Visa Debit Card (∗∗∗∗ 4561), a Payroll Prepaid Card (∗∗∗∗ 6654), and a Virtual Card (∗∗∗∗ 1029). All cards are active and ready.`;
      } else if (lower.includes("qr") || lower.includes("scan")) {
        reply = `To receive payments with your QR code or scan a merchant terminal, go to Send & Pay and choose Scan to Pay or My QR.`;
      } else {
        reply = `I understand you're asking about "${q}". Based on your GCB account profile, everything is in order. Let me know if you would like me to guide you to transfers, card controls, or download an account statement.`;
      }
    }

    const sidiMsg: ChatMessage = {
      id: `sidi-${Date.now() + 1}`,
      sender: "sidi",
      text: reply,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setChatLog((prev) => [...prev, userMsg, sidiMsg]);
    setInputText("");
  }

  const hasChat = chatLog.length > 0;

  // The assistant answers personal banking questions and links into personal screens; business has none yet.
  if (isBusinessProfile(activeProfile)) return null;

  return (
    <>
      {/* Floating launcher: the avatar, which opens into a pill with its name on hover or focus. */}
      <div data-intro={intro} className="group/fab fixed bottom-[calc(1.5rem+env(safe-area-inset-bottom))] right-3.5 z-40 select-none sm:right-5">
        {/* A golden glow circling the edge while hovered: a soft blurred halo behind a thin sharp ring. Not on the close button. */}
        {!open && (
          <span
            aria-hidden
            className="pointer-events-none absolute -inset-1.5 rounded-full opacity-0 transition-opacity delay-500 duration-sweep ease-settle group-hover/fab:opacity-70 group-hover/fab:delay-0 group-hover/fab:duration-reveal group-focus-within/fab:opacity-70 group-focus-within/fab:delay-0 group-focus-within/fab:duration-reveal group-data-[intro=true]/fab:opacity-70 group-data-[intro=true]/fab:delay-0 group-data-[intro=true]/fab:duration-reveal"
          >
            <span className="glow-orbit absolute inset-0 rounded-full blur-md" />
            <span className="glow-orbit absolute inset-1 rounded-full" />
          </span>
        )}
        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          transition={SPRING.snappy}
          onClick={() => {
            setOpen((v) => !v);
            setIntro(false);
          }}
          data-intro={intro}
          className="group relative z-10 flex h-12 items-center overflow-hidden rounded-full border border-border bg-card shadow-lg outline-none transition-shadow duration-hover hover:shadow-xl focus-visible:ring-2 focus-visible:ring-ring cursor-pointer"
          aria-label={open ? "Close Sidi assistant" : "Ask Sidi"}
          aria-expanded={open}
        >
          {/* Both faces stay mounted and cross-fade together, so closing never waits on the X to leave. */}
          <span className="relative size-12 shrink-0">
            <motion.span
              className="absolute inset-0 flex items-center justify-center text-foreground will-change-transform"
              initial={false}
              animate={open ? { opacity: 1, rotate: 0, scale: 1 } : { opacity: 0, rotate: -90, scale: 0.6 }}
              transition={{ duration: DURATION.hover, ease: EASE.snappy }}
            >
              <X size={20} strokeWidth={1.8} />
            </motion.span>
            <motion.span
              className="absolute inset-0 will-change-transform"
              initial={false}
              animate={open ? { opacity: 0, rotate: 90, scale: 0.6 } : { opacity: 1, rotate: 0, scale: 1 }}
              transition={{ duration: DURATION.hover, ease: EASE.snappy }}
            >
              <Image src="/sidi-avatar-clear.png" alt="" width={56} height={56} className="size-full rounded-full object-cover" />
            </motion.span>
          </span>
          {/* One amber sweep across the button on hover. It resets instantly on leave, so it never plays backwards. */}
          {!open && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-0 -left-full z-10 w-full -skew-x-12 mix-blend-multiply dark:mix-blend-plus-lighter bg-linear-to-r from-transparent via-primary/40 to-transparent group-hover:translate-x-[200%] group-hover:transition-transform group-hover:duration-sweep group-hover:ease-in-out group-focus-visible:translate-x-[200%] group-focus-visible:transition-transform group-focus-visible:duration-sweep group-focus-visible:ease-in-out group-data-[intro=true]:translate-x-[200%] group-data-[intro=true]:transition-transform group-data-[intro=true]:duration-sweep group-data-[intro=true]:ease-in-out"
          />
          )}
          {!open && (
            <span className="max-w-0 overflow-hidden whitespace-nowrap pr-0 text-[13px] font-medium text-foreground opacity-0 transition-[max-width,padding,opacity] duration-reveal ease-settle group-hover:max-w-[96px] group-hover:pr-4 group-hover:opacity-100 group-focus-visible:max-w-[96px] group-focus-visible:pr-4 group-focus-visible:opacity-100 group-data-[intro=true]:max-w-[176px] group-data-[intro=true]:pr-4 group-data-[intro=true]:opacity-100">
              {introLabel ? "How can I help?" : "Ask Sidi"}
            </span>
          )}
        </motion.button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-label="Sidi assistant"
            style={{ transformOrigin: "bottom right" }}
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97, transition: { duration: DURATION.hover, ease: EASE.settle } }}
            transition={SPRING.settle}
            className={cn(
              "fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-3.5 z-50 flex flex-col overflow-hidden rounded-2xl border border-border bg-modal text-left shadow-2xl transition-[width,height] duration-reveal ease-settle sm:right-5",
              isExpanded
                ? "h-[720px] max-h-[calc(100dvh-8rem)] w-[calc(100vw-2rem)] sm:w-[540px]"
                : "h-[560px] max-h-[calc(100dvh-8rem)] w-[calc(100vw-2rem)] sm:w-[390px]",
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 pb-2 pt-3">
              <span className="text-[14px] font-medium text-foreground">{hasChat ? "Chat with Sidi" : "New chat"}</span>
              <div className="-mr-2 flex items-center gap-0.5">
                {/* Ways to reach a person when the assistant isn't enough. */}
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="mr-1 flex h-7 cursor-pointer items-center gap-2 rounded-lg px-2 text-[13px] text-muted-foreground outline-none transition-colors duration-hover hover:bg-item-hover hover:text-foreground aria-expanded:bg-item-hover aria-expanded:text-foreground"
                    aria-label="Get help"
                  >
                    <CircleHelp size={15} strokeWidth={1.7} />
                    Get help
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" sideOffset={6} className="w-56">
                    <DropdownMenuItem render={<a href="tel:+233302681531" />} className="gap-2 px-2 py-2">
                      <Phone size={16} strokeWidth={1.7} className="text-muted-foreground" />
                      <span className="flex flex-col">
                        <span className="text-[13px] text-foreground">Call customer care</span>
                        <span className="text-[12px] text-muted-foreground tabular">+233 302 681 531, 24/7</span>
                      </span>
                    </DropdownMenuItem>
                    <DropdownMenuItem render={<Link href="/locate-us" onClick={() => setOpen(false)} />} className="gap-2 px-2 py-2">
                      <MapPin size={16} strokeWidth={1.7} className="text-muted-foreground" />
                      <span className="flex flex-col">
                        <span className="text-[13px] text-foreground">Find a branch</span>
                        <span className="text-[12px] text-muted-foreground">Visit us in person</span>
                      </span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                {hasChat && (
                  <button type="button" onClick={() => setChatLog([])} title="Start a new chat" className={headerButton} aria-label="Start a new chat">
                    <SquarePen size={16} strokeWidth={1.7} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsExpanded((v) => !v)}
                  title={isExpanded ? "Make smaller" : "Make larger"}
                  className={cn(headerButton, "max-sm:hidden")}
                  aria-label={isExpanded ? "Make smaller" : "Make larger"}
                >
                  {isExpanded ? <Minimize2 size={16} strokeWidth={1.7} /> : <Maximize2 size={16} strokeWidth={1.7} />}
                </button>
                <button type="button" onClick={() => setOpen(false)} title="Close" className={headerButton} aria-label="Close assistant">
                  <X size={17} strokeWidth={1.7} />
                </button>
              </div>
            </div>

            {/* Body: welcome with suggestions, or the conversation */}
            <div className="custom-scrollbar flex flex-1 flex-col overflow-y-auto overscroll-contain px-4">
              {!hasChat ? (
                <div className="flex flex-1 flex-col items-center justify-end gap-5 pb-5 text-center animate-in fade-in duration-200">
                  <div className="flex flex-col items-center gap-2">
                    <Image src="/sidi-avatar-clear.png" alt="" width={44} height={44} className="size-10 rounded-full bg-tile object-cover" />
                    <div className="flex flex-col gap-1">
                      <h2 className="text-[16px] font-medium text-foreground">{firstName ? `Hi ${firstName}` : "Hi there"}</h2>
                      <p className="text-[13px] text-muted-foreground">Ask anything or tell Sidi what you need</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    {SUGGESTIONS.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleSendQuery(item.query, item.id)}
                          className="flex cursor-pointer items-center gap-2 rounded-full bg-tile px-3 py-2 text-[13px] text-foreground transition-colors duration-hover hover:bg-tile-hover"
                        >
                          <Icon size={15} strokeWidth={1.7} className="text-muted-foreground" />
                          {item.title}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-3 pb-2 pt-1 animate-in fade-in duration-200">
                  {chatLog.map((chat) => (
                    <div key={chat.id} className={cn("flex flex-col gap-1", chat.sender === "user" ? "items-end" : "items-start")}>
                      <div
                        className={cn(
                          "max-w-[85%] whitespace-pre-line rounded-2xl px-3 py-2 text-[13px] leading-relaxed",
                          chat.sender === "user" ? "bg-primary text-primary-foreground" : "bg-tile text-foreground",
                        )}
                      >
                        {chat.text}
                      </div>
                      <span className="px-2 text-[11px] text-muted-foreground tabular">{chat.timestamp}</span>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Input: the message and send, nothing else */}
            <div className="p-3 pt-2">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendQuery();
                }}
                className="flex items-center gap-2 rounded-2xl border border-field-border bg-field py-2 pl-3 pr-2 transition-colors duration-hover focus-within:border-ring"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Ask Sidi anything"
                  aria-label="Message Sidi"
                  className="h-8 flex-1 bg-transparent text-[14px] text-foreground outline-none placeholder:text-muted-foreground"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors duration-hover hover:bg-primary-hover active:brightness-95 disabled:cursor-not-allowed disabled:opacity-35"
                  aria-label="Send"
                >
                  <ArrowUp size={16} strokeWidth={2} />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
