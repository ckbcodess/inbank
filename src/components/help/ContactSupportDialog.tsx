"use client";

/**
 * The ways to reach a person at the bank: call, WhatsApp or email, each one tap from here. The numbers come from
 * `lib/support.ts`. A written case to track is Report an issue, and a branch is Locate us; both sit beside this in
 * the Help menu, so they are not repeated here.
 */

import type { ComponentType } from "react";
import { ChevronRight, Mail, MessageCircle, Phone } from "@/components/ui/icons";
import { Dialog, DialogBody, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SUPPORT } from "@/lib/support";

type IconType = ComponentType<{ size?: number; className?: string; "aria-hidden"?: boolean | "true" }>;

const CHANNELS: { icon: IconType; title: string; detail: string; href: string; external?: boolean }[] = [
  { icon: Phone, title: "Call us", detail: `${SUPPORT.phone.display} · ${SUPPORT.phone.hours}`, href: `tel:${SUPPORT.phone.tel}` },
  { icon: MessageCircle, title: "Chat on WhatsApp", detail: SUPPORT.whatsapp.display, href: SUPPORT.whatsapp.url, external: true },
  { icon: Mail, title: "Email us", detail: SUPPORT.email.display, href: SUPPORT.email.href },
];

export function ContactSupportDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm">
        <DialogHeader>
          <DialogTitle>Contact Support</DialogTitle>
        </DialogHeader>
        <DialogBody className="gap-3">
          <ul className="flex flex-col gap-0.5">
            {CHANNELS.map(({ icon: Icon, title, detail, href, external }) => (
              <li key={title}>
                <a
                  href={href}
                  {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  className="flex items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
                    <Icon size={16} aria-hidden="true" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-body text-foreground">{title}</span>
                    <span className="tabular truncate text-caption text-muted-foreground">
                      {detail}
                    </span>
                  </span>
                  <ChevronRight size={15} aria-hidden="true" className="shrink-0 text-muted-foreground" />
                </a>
              </li>
            ))}
          </ul>
          <p className="px-2 text-caption leading-relaxed text-muted-foreground">
            We’ll never ask for your PIN, password or a one-time code, on the phone or in a message.
          </p>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}
