"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MapPin, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GCBLogo } from "@/components/ui/GCBLogo";
import LanguageToggle from "@/components/layout/LanguageToggle";
import { useTranslation } from "@/lib/i18n/LanguageProvider";
import { switchTheme } from "@/lib/theme-transition";

export default function AuthHeader() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const { t } = useTranslation();

  useEffect(() => {
    if (document.documentElement.classList.contains("dark")) {
      setTheme("dark");
    }
  }, []);

  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    switchTheme(next, () => setTheme(next));
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-30 flex h-16 w-full items-center justify-between border-b border-border/40 bg-background/80 px-6 backdrop-blur-md transition-colors lg:px-12">
      {/* Brand Logo & Title */}
      <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-90">
        <div className="flex items-center justify-center shrink-0">
          <GCBLogo className="h-8 w-auto text-foreground" />
        </div>
        <span className="text-[17px] font-medium tracking-tight text-foreground sm:text-[18px]">
          {t("header.brand", "Internet Banking")}
        </span>
      </Link>

      {/* Header Utilities */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Global Language Selector */}
        <LanguageToggle />

        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={toggleTheme}
          aria-label={t("header.themeLight", "Toggle color theme")}
          className="rounded-full text-muted-foreground"
        >
          {theme === "light" ? (
            <Sun size={18} strokeWidth={1.8} />
          ) : (
            <Moon size={18} strokeWidth={1.8} />
          )}
        </Button>

        <Button
          nativeButton={false}
          render={
            <a
              href="https://www.gcbbank.com.gh/branches-and-atms"
              target="_blank"
              rel="noreferrer"
              aria-label={t("header.locator", "Branch and ATM locator")}
            />
          }
          variant="ghost"
          size="icon-sm"
          className="rounded-full text-muted-foreground"
        >
          <MapPin size={18} strokeWidth={1.8} />
        </Button>
      </div>
    </header>
  );
}
