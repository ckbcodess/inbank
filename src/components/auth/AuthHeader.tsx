"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { MapPin, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GCBLogo } from "@/components/ui/GCBLogo";

export default function AuthHeader() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    if (document.documentElement.classList.contains("dark")) {
      setTheme("dark");
    }
  }, []);

  function toggleTheme() {
    if (theme === "light") {
      document.documentElement.classList.add("dark");
      setTheme("dark");
    } else {
      document.documentElement.classList.remove("dark");
      setTheme("light");
    }
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-30 flex h-16 w-full items-center justify-between border-b border-border/40 bg-background/80 px-6 backdrop-blur-md transition-colors lg:px-12">
      {/* Brand Logo & Title */}
      <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-90">
        <div className="flex items-center justify-center shrink-0">
          <GCBLogo className="h-8 w-auto text-foreground" />
        </div>
        <span className="text-[17px] font-medium tracking-tight text-foreground sm:text-[18px]">
          Online Banking
        </span>
      </Link>

      {/* Header Utilities */}
      <div className="flex items-center gap-2 sm:gap-3">
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={toggleTheme}
          aria-label="Toggle color theme"
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
              aria-label="Branch and ATM locator"
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
