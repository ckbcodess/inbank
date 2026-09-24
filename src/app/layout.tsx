import { Suspense } from "react";
import type { Metadata } from "next";
import { DM_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { AmountVisibilityProvider } from "@/components/providers/AmountVisibilityProvider";
import { Toaster } from "sonner";
import { cn } from "@/lib/utils";

import { DevStateProvider } from "@/components/providers/DevStateProvider";
import PersonaFlowSwitcher from "@/components/dev/PersonaFlowSwitcher";
import TourOverlay from "@/components/dev/TourOverlay";
import { AndroidRippleProvider } from "@/components/providers/AndroidRippleProvider";

import { TooltipProvider } from "@/components/ui/tooltip";
import { RouteLoadingProvider } from "@/components/providers/RouteLoadingProvider";
import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import { NavHistoryTracker } from "@/components/layout/NavHistoryTracker";

const dmSans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});
const geistMono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GCB Bank — Internet Banking",
  description: "GCB Bank PLC Internet Banking — Personal, Corporate and SME Banking",
};

/**
 * Runs before paint: if a non-English language is saved, hide the page until
 * the DOM translator has done its first pass, so English never flashes.
 * Failsafe reveals the page after 1.5s regardless.
 */
const LANGUAGE_BOOT_SCRIPT = `try{var l=localStorage.getItem("gcb-language");if(l&&l!=="en"){var d=document.documentElement;d.lang=l;d.classList.add("i18n-pending");setTimeout(function(){d.classList.remove("i18n-pending")},1500)}}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={cn(dmSans.variable, geistMono.variable, "font-sans")}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: LANGUAGE_BOOT_SCRIPT }} />
      </head>
      <body className="antialiased">
        <NavHistoryTracker />
        <ThemeProvider>
          <LanguageProvider>
            <RouteLoadingProvider>
              <TooltipProvider delay={350} closeDelay={100} timeout={300}>
                <AmountVisibilityProvider>
                  <AndroidRippleProvider>
                    <DevStateProvider>
                      <Toaster position="top-right" style={{ zIndex: 999999 }} />
                      {children}
                      <Suspense fallback={null}>
                        <PersonaFlowSwitcher />
                      </Suspense>
                      <TourOverlay />
                    </DevStateProvider>
                  </AndroidRippleProvider>
                </AmountVisibilityProvider>
              </TooltipProvider>
            </RouteLoadingProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
