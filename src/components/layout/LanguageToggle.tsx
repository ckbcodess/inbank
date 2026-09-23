"use client";

import { Check, Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SimpleTooltip } from "@/components/ui/tooltip";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { cn } from "@/lib/utils";

interface LanguageToggleProps {
  className?: string;
  showLabel?: boolean;
}

export default function LanguageToggle({
  className,
  showLabel = true,
}: LanguageToggleProps) {
  const { language, setLanguage, languages, t } = useTranslation();

  const current = languages.find((l) => l.code === language) ?? languages[0];

  return (
    <DropdownMenu>
      <SimpleTooltip content={t("header.language", "Language")} side="bottom">
        <DropdownMenuTrigger
          className={cn(
            "flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg px-2 text-[12.5px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground outline-none cursor-pointer",
            className
          )}
          aria-label={t("header.language", "Change language")}
        >
          <Globe size={16} strokeWidth={1.8} className="shrink-0" />
          {showLabel && (
            <span className="font-mono text-[11.5px] tracking-wide text-foreground">
              {current.shortLabel}
            </span>
          )}
        </DropdownMenuTrigger>
      </SimpleTooltip>

      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {t("header.language", "Select Language")}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {languages.map((lang) => {
          const isSelected = lang.code === language;
          return (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => setLanguage(lang.code)}
              className="flex items-center justify-between py-2 text-[13px] cursor-pointer"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-[15px] select-none shrink-0" aria-hidden="true">
                  {lang.flag}
                </span>
                <span
                  className={cn(
                    "truncate",
                    isSelected ? "text-foreground font-medium" : "text-muted-foreground"
                  )}
                >
                  {lang.nativeName}
                </span>
              </div>
              {isSelected && (
                <Check size={14} strokeWidth={2.2} className="text-foreground shrink-0" />
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
