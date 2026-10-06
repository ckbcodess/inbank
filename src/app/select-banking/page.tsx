"use client";

import { useRouter } from "next/navigation";
import { Building2, ChevronRight, User } from "lucide-react";
import AuthLayout from "@/components/auth/AuthLayout";

/**
 * Personal or business banking: the choice that used to open the app. The front door is now the personal
 * log-in (`/` goes straight to `/login`), so this screen is reached from the Demo hub. Each option carries its
 * type to the log-in screen.
 */
export default function SelectBankingPage() {
  const router = useRouter();

  const options = [
    {
      type: "personal",
      tour: "entry-personal",
      icon: User,
      title: "Personal",
      description: "For individual accounts and everyday banking.",
    },
    {
      type: "business",
      tour: "entry-business",
      icon: Building2,
      title: "Business",
      description: "For companies, organizations, and business accounts.",
    },
  ] as const;

  return (
    <AuthLayout
      title="How do you prefer using Internet Banking?"
      titleClassName="text-[19.5px] sm:text-[21.5px] sm:whitespace-nowrap"
      width="compact"
    >
      <div className="flex flex-col gap-3">
        {options.map(({ type, tour, icon: Icon, title, description }) => (
          <button
            key={type}
            type="button"
            data-tour={tour}
            onClick={() => router.push(`/login?type=${type}`)}
            className="group flex items-center justify-between gap-4 rounded-2xl border border-border/80 bg-card-item p-4.5 sm:p-5 text-left transition duration-200 hover:border-primary/50 hover:bg-muted/40 hover:shadow-xs cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Icon size={18} strokeWidth={2.2} />
              </div>
              <div className="flex flex-col">
                <span className="text-[15.5px] sm:text-[16.5px] font-medium text-foreground tracking-[-0.01em]">{title}</span>
                <span className="mt-0.5 text-[13px] sm:text-[13.5px] leading-snug text-muted-foreground">{description}</span>
              </div>
            </div>
            <ChevronRight
              size={20}
              strokeWidth={2.2}
              className="shrink-0 text-foreground/70 transition duration-200 group-hover:text-foreground"
            />
          </button>
        ))}
      </div>
    </AuthLayout>
  );
}
