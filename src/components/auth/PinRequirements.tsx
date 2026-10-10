"use client";

import { Check } from "lucide-react";
import { PIN_RULES } from "@/lib/auth-shared";

interface PinRequirementsProps {
  pin: string;
  originalPin?: string;
  isConfirm?: boolean;
}

export default function PinRequirements({
  pin,
  originalPin,
  isConfirm = false,
}: PinRequirementsProps) {
  const confirmMatch = isConfirm && originalPin ? pin.length === 4 && pin === originalPin : false;

  return (
    <div className="w-full rounded-2xl border border-border/80 bg-muted/20 p-4 text-left">
      <p className="mb-2.5 text-[12px] font-medium uppercase tracking-wider text-muted-foreground">
        PIN Requirements
      </p>
      <ul className="grid grid-cols-1 gap-2.5 text-[12.5px] sm:grid-cols-2" aria-label="PIN requirements">
        {PIN_RULES.map((rule) => {
          const met = rule.test(pin);
          return (
            <li key={rule.id} className="flex items-center gap-2">
              <span
                className={`flex size-4 shrink-0 items-center justify-center rounded-full text-[10px] transition-colors ${
                  met ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                <Check size={11} strokeWidth={3} aria-hidden="true" />
              </span>
              <span className={met ? "text-foreground font-medium" : "text-muted-foreground"}>
                {rule.label}
                <span className="sr-only">{met ? " \u2014 met" : " \u2014 not yet"}</span>
              </span>
            </li>
          );
        })}
        {isConfirm && (
          <li className="flex items-center gap-2">
            <span
              className={`flex size-4 shrink-0 items-center justify-center rounded-full text-[10px] transition-colors ${
                confirmMatch ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              <Check size={11} strokeWidth={3} aria-hidden="true" />
            </span>
            <span className={confirmMatch ? "text-foreground font-medium" : "text-muted-foreground"}>
              PINs match
              <span className="sr-only">{confirmMatch ? " \u2014 met" : " \u2014 not yet"}</span>
            </span>
          </li>
        )}
      </ul>
    </div>
  );
}
