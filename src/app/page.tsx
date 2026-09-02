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
      <div className="flex flex-col gap-3">
        {/* Personal Banking Option */}
        <button
          type="button"
          onClick={() => selectOption("personal")}
          className="group flex items-center justify-between rounded-2xl border border-border/80 bg-card p-4.5 text-left transition-all duration-200 hover:border-[#E5A500] hover:bg-[#FFFBF0] dark:hover:bg-[#F2B200]/10 hover:shadow-md hover:shadow-[#F2B200]/10 active:scale-[0.96] cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#FEF3D6] text-[#B27B00] dark:bg-[#F2B200]/20 dark:text-[#F2B200] transition-colors group-hover:bg-[#E5A500] group-hover:text-white dark:group-hover:bg-[#F2B200] dark:group-hover:text-black">
              <User size={22} strokeWidth={2} />
            </div>
            <div className="flex flex-col">
              <span className="text-[15px] font-semibold text-foreground">
                Personal
              </span>
              <span className="text-[12.5px] text-muted-foreground">
                For individual accounts and everyday banking.
              </span>
            </div>
          </div>

          <div className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground/60 transition-all duration-200 group-hover:translate-x-1 group-hover:text-[#E5A500] dark:group-hover:text-[#F2B200]">
            <ArrowRight size={18} strokeWidth={2} />
          </div>
        </button>

        {/* Business Banking Option */}
        <button
          type="button"
          onClick={() => selectOption("business")}
          className="group flex items-center justify-between rounded-2xl border border-border/80 bg-card p-4.5 text-left transition-all duration-200 hover:border-[#E5A500] hover:bg-[#FFFBF0] dark:hover:bg-[#F2B200]/10 hover:shadow-md hover:shadow-[#F2B200]/10 active:scale-[0.96] cursor-pointer"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#FEF3D6] text-[#B27B00] dark:bg-[#F2B200]/20 dark:text-[#F2B200] transition-colors group-hover:bg-[#E5A500] group-hover:text-white dark:group-hover:bg-[#F2B200] dark:group-hover:text-black">
              <Building2 size={22} strokeWidth={2} />
            </div>
            <div className="flex flex-col">
              <span className="text-[15px] font-semibold text-foreground">
                Business
              </span>
              <span className="text-[12.5px] text-muted-foreground">
                For companies, organizations, and business accounts.
              </span>
            </div>
          </div>

          <div className="flex size-7 shrink-0 items-center justify-center rounded-full text-muted-foreground/60 transition-all duration-200 group-hover:translate-x-1 group-hover:text-[#E5A500] dark:group-hover:text-[#F2B200]">
            <ArrowRight size={18} strokeWidth={2} />
          </div>
        </button>
      </div>
    </AuthLayout>
  );
}
