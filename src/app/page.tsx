"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Building2, User } from "lucide-react";
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
      title="Select how you would want to use Online Banking"
      description="Choose your account category to continue to sign in."
      width="compact"
    >
      <div className="flex flex-col gap-3.5">
        {/* Personal Banking Option */}
        <button
          type="button"
          data-tour="entry-personal"
          onClick={() => selectOption("personal")}
          className="group flex items-center justify-between rounded-2xl border border-border/80 bg-card p-5 sm:p-5.5 text-left transition-all duration-200 hover:border-primary/50 hover:bg-muted/40 hover:shadow-xs cursor-pointer"
        >
          <div className="flex items-center gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <User size={22} strokeWidth={2} />
            </div>
            <div className="flex flex-col">
              <span className="text-[15.5px] font-medium text-foreground">
                Personal
              </span>
              <span className="text-[13px] text-muted-foreground mt-0.5">
                For individual accounts and everyday banking.
              </span>
            </div>
          </div>

          <div className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground/60 transition-all duration-200 group-hover:translate-x-1 group-hover:text-primary">
            <ArrowRight size={18} strokeWidth={2} />
          </div>
        </button>

        {/* Business Banking Option */}
        <button
          type="button"
          data-tour="entry-business"
          onClick={() => selectOption("business")}
          className="group flex items-center justify-between rounded-2xl border border-border/80 bg-card p-5 sm:p-5.5 text-left transition-all duration-200 hover:border-primary/50 hover:bg-muted/40 hover:shadow-xs cursor-pointer"
        >
          <div className="flex items-center gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <Building2 size={22} strokeWidth={2} />
            </div>
            <div className="flex flex-col">
              <span className="text-[15.5px] font-medium text-foreground">
                Business
              </span>
              <span className="text-[13px] text-muted-foreground mt-0.5">
                For companies, organizations, and business accounts.
              </span>
            </div>
          </div>

          <div className="flex size-8 shrink-0 items-center justify-center rounded-full text-muted-foreground/60 transition-all duration-200 group-hover:translate-x-1 group-hover:text-primary">
            <ArrowRight size={18} strokeWidth={2} />
          </div>
        </button>
      </div>
    </AuthLayout>
  );
}
