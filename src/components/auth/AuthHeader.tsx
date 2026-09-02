"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { MapPin, Moon, Sun } from "lucide-react";

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
        <div className="relative h-9 w-10 shrink-0">
          <Image
            src="/images/gcb-logo.svg"
            alt="GCB Bank"
            fill
            className="object-contain"
            priority
          />
        </div>
        <span className="text-[17px] font-semibold tracking-tight text-foreground sm:text-[18px]">
          Online Banking
        </span>
      </Link>

      {/* Header Utilities */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={toggleTheme}
          aria-label="Toggle color theme"
          className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
        >
          {theme === "light" ? (
            <Sun size={19} strokeWidth={1.8} />
          ) : (
            <Moon size={19} strokeWidth={1.8} />
          )}
        </button>

        <a
          href="https://www.gcbbank.com.gh/branches-and-atms"
          target="_blank"
          rel="noreferrer"
          aria-label="Branch and ATM locator"
          className="flex size-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
        >
          <MapPin size={19} strokeWidth={1.8} />
        </a>
      </div>
    </header>
  );
}
