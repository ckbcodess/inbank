import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { AmountVisibilityProvider } from "@/components/providers/AmountVisibilityProvider";
import { Toaster } from "sonner";
import { cn } from "@/lib/utils";

import { DevStateProvider } from "@/components/providers/DevStateProvider";
import PersonaFlowSwitcher from "@/components/dev/PersonaFlowSwitcher";

import { TooltipProvider } from "@/components/ui/tooltip";

const geist = Geist({ variable: "--font-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "NIBS — New Internet Banking Solution",
  description: "Retail, corporate and internal banking operations",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={cn(geist.variable, geistMono.variable, "font-sans")}>
      <body className="antialiased">
        <ThemeProvider>
          <TooltipProvider delay={200}>
            <AmountVisibilityProvider>
              <DevStateProvider>
                <Toaster position="top-right" richColors />
                {children}
                <PersonaFlowSwitcher />
              </DevStateProvider>
            </AmountVisibilityProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
