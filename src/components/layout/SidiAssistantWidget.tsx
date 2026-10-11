"use client";

import { useState } from "react";
import Image from "next/image";
import { X, Send, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";

export function SidiAssistantWidget() {
  const [open, setOpen] = useState(false);
  const [bubbleVisible, setBubbleVisible] = useState(true);
  const [message, setMessage] = useState("");
  const [chatLog, setChatLog] = useState<Array<{ sender: "user" | "sidi"; text: string }>>([
    {
      sender: "sidi",
      text: "Hello! I’m Sidi, your GCB Digital Assistant. How can I help you today?",
    },
  ]);

  const quickPrompts = [
    "Check my balance",
    "Pay ECG Prepaid bill",
    "Reset my PIN",
    "Find nearest branch",
  ];

  function handleSend(text?: string) {
    const q = text ?? message.trim();
    if (!q) return;
    setChatLog((prev) => [
      ...prev,
      { sender: "user", text: q },
      {
        sender: "sidi",
        text: `Thanks for asking about "${q}". I’m ready to guide you or direct you to the right service!`,
      },
    ]);
    setMessage("");
  }

  return (
    <>
      {/* Floating launcher button with conversational bubble */}
      <div className="fixed bottom-6 right-6 z-40 flex items-center gap-3 select-none">
        {/* "How can I help?" bubble */}
        <AnimatePresence>
          {!open && bubbleVisible && (
            <motion.div
              initial={{ opacity: 0, x: 10, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 10, scale: 0.95 }}
              className="flex items-center gap-2 rounded-full border border-border/80 bg-card/95 py-2 pl-3.5 pr-2.5 shadow-lg backdrop-blur-md"
            >
              <span className="text-[13px] font-medium text-foreground">How can I help?</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setBubbleVisible(false);
                }}
                className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                aria-label="Dismiss greeting"
              >
                <X size={12} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Avatar Trigger Button */}
        <motion.button
          type="button"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            setOpen((v) => !v);
            setBubbleVisible(false);
          }}
          className="relative flex size-14 items-center justify-center rounded-full border-2 border-primary bg-background shadow-xl ring-4 ring-primary/20 transition-shadow hover:shadow-2xl cursor-pointer overflow-hidden"
          aria-label="Open Sidi digital assistant"
        >
          <Image
            src="/sidi-avatar.png"
            alt="Sidi Assistant"
            width={56}
            height={56}
            className="size-full object-cover"
          />
          <span className="absolute bottom-0 right-0 size-3.5 rounded-full border-2 border-background bg-success" />
        </motion.button>
      </div>

      {/* Assistant Chat Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-24 right-6 z-50 flex h-[480px] w-[350px] sm:w-[380px] flex-col rounded-3xl border border-border bg-card shadow-2xl overflow-hidden text-left"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border bg-muted/30 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="relative size-10 overflow-hidden rounded-full border border-primary/50">
                  <Image
                    src="/sidi-avatar.png"
                    alt="Sidi"
                    width={40}
                    height={40}
                    className="size-full object-cover"
                  />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[14px] font-medium text-foreground">Sidi</span>
                    <Sparkles size={13} className="text-primary fill-primary" />
                  </div>
                  <span className="text-[11.5px] text-muted-foreground">GCB Digital Assistant</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                aria-label="Close assistant"
              >
                <X size={16} />
              </button>
            </div>

            {/* Conversation Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatLog.map((chat, idx) => (
                <div
                  key={idx}
                  className={`flex ${chat.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[82%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                      chat.sender === "user"
                        ? "bg-primary text-primary-foreground font-medium rounded-br-xs"
                        : "bg-muted/60 text-foreground border border-border/50 rounded-bl-xs"
                    }`}
                  >
                    {chat.text}
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Suggestions */}
            <div className="border-t border-border/60 bg-muted/20 px-4 py-2.5">
              <div className="flex flex-wrap gap-1.5">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => handleSend(prompt)}
                    className="rounded-full border border-border bg-card px-2.5 py-1 text-[11.5px] text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors cursor-pointer"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>

            {/* Chat Input */}
            <div className="border-t border-border p-3 bg-card">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex items-center gap-2"
              >
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ask Sidi a question…"
                  className="flex-1 rounded-xl border border-field-border bg-field px-3.5 py-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-hidden focus:ring-1 focus:ring-primary"
                />
                <Button
                  type="submit"
                  size="sm"
                  className="size-9 rounded-xl p-0 shrink-0 cursor-pointer"
                  disabled={!message.trim()}
                >
                  <Send size={15} />
                </Button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
