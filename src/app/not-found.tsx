import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { GCBLogo } from "@/components/ui/GCBLogo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="relative flex min-h-dvh w-full flex-col items-center justify-center bg-background px-4 text-center">
      <div className="w-full max-w-md rounded-3xl border border-border/80 bg-card/95 p-8 shadow-sm backdrop-blur-xl">
        <div className="mb-6 flex justify-center">
          <GCBLogo className="h-10 w-auto text-foreground" />
        </div>
        <span className="text-[13px] font-medium tracking-wide uppercase text-primary">404</span>
        <h1 className="mt-1 text-[22px] font-medium tracking-tight text-foreground">Page not found</h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-muted-foreground">
          The page you are looking for does not exist or has been moved.
        </p>
        <div className="mt-6 flex justify-center">
          <Button nativeButton={false} render={<Link href="/" />} className="gap-2">
            <ChevronLeft size={16} strokeWidth={2} />
            Return home
          </Button>
        </div>
      </div>
    </div>
  );
}
