"use client";

import { useRouter } from "next/navigation";
import { Building2, ChevronRight, User } from "lucide-react";
import AuthLayout from "@/components/auth/AuthLayout";

export default function RootRoutingPage() {
  const router = useRouter();

  function selectOption(type: "personal" | "business") {
    if (type === "personal") {
      router.push("/login?type=personal");
    } else {
      router.push("/login?type=business");
    }
  }

  return (
    <AuthLayout
      title="How do you prefer using Internet Banking?"
      titleClassName="text-[19.5px] sm:text-[21.5px] sm:whitespace-nowrap"
      description="Choose your account category to continue to sign in."
      width="compact"
    >
      <div className="flex flex-col gap-3.5">
        {/* Personal Banking Option */}
        <button
          type="button"
          data-tour="entry-personal"
          onClick={() => selectOption("personal")}
          className="group flex items-center justify-between gap-4 rounded-2xl border border-border/80 bg-card p-5 sm:p-5.5 text-left transition-all duration-200 hover:border-primary/50 hover:bg-muted/40 hover:shadow-xs cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <User size={18} strokeWidth={2.2} />
            </div>
            <div className="flex flex-col">
              <span className="text-[15.5px] sm:text-[16.5px] font-medium text-foreground tracking-[-0.01em]">
                Personal
              </span>
              <span className="text-[13px] sm:text-[13.5px] text-muted-foreground leading-snug mt-0.5">
                For individual accounts and everyday banking.
              </span>
            </div>
          </div>

          <ChevronRight
            size={20}
            strokeWidth={2.2}
            className="shrink-0 text-foreground/70 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-foreground"
          />
        </button>

        {/* Business Banking Option */}
        <button
          type="button"
          data-tour="entry-business"
          onClick={() => selectOption("business")}
          className="group flex items-center justify-between gap-4 rounded-2xl border border-border/80 bg-card p-5 sm:p-5.5 text-left transition-all duration-200 hover:border-primary/50 hover:bg-muted/40 hover:shadow-xs cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Building2 size={18} strokeWidth={2.2} />
            </div>
            <div className="flex flex-col">
              <span className="text-[15.5px] sm:text-[16.5px] font-medium text-foreground tracking-[-0.01em]">
                Business
              </span>
              <span className="text-[13px] sm:text-[13.5px] text-muted-foreground leading-snug mt-0.5">
                For companies, organizations, and business accounts.
              </span>
            </div>
          </div>

          <ChevronRight
            size={20}
            strokeWidth={2.2}
            className="shrink-0 text-foreground/70 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-foreground"
          />
        </button>
      </div>
    </AuthLayout>
  );
}
