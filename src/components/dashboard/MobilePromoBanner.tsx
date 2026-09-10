import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronLeft, ChevronRight, Sparkles, TrendingUp, Globe, Calculator, X } from "lucide-react";
import { toast } from "sonner";

export function MobilePromoBanner() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showCalculator, setShowCalculator] = useState(false);
  const [depositAmount, setDepositAmount] = useState("10000");
  const [tenureMonths, setTenureMonths] = useState(12);

  const slides = [
    {
      id: "mobile-app",
      title: "Banking made easier, wherever you are.",
      containerClass:
        "border-amber-300/50 bg-gradient-to-br from-[#fefbf2] via-[#fbf3db] to-[#f7e8bd] dark:from-[#211a0c] dark:via-[#191409] dark:to-[#130f07] dark:border-amber-500/20",
      content: (
        <>
          <div className="relative z-10 flex flex-col justify-between min-h-[175px] max-w-[62%]">
            <div>
              <h3 className="text-[17px] font-medium leading-snug tracking-tight text-foreground sm:text-[19px]">
                Banking made easier, wherever you are.
              </h3>
              <p className="mt-1 text-[12px] text-muted-foreground leading-relaxed">
                Scan with phone camera to install the InBank mobile app.
              </p>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <div className="size-[72px] shrink-0 overflow-hidden rounded-lg bg-white p-1.5 shadow-2xs border border-black/10 dark:border-white/10">
                <Image
                  src="/images/dashboard/qr-code-1.png"
                  alt="QR Code"
                  width={72}
                  height={72}
                  className="h-full w-full object-contain"
                />
              </div>
              <span className="text-[11.5px] text-muted-foreground leading-tight">
                Available on<br />
                <span className="font-medium text-foreground">iOS & Android</span>
              </span>
            </div>
          </div>
          <div className="pointer-events-none absolute -bottom-3 -right-2 h-[190px] w-[140px] sm:h-[200px] sm:w-[155px]">
            <Image
              src="/images/dashboard/phone-app-mockup.png"
              alt="InBank Mobile App Preview"
              width={200}
              height={240}
              className="h-full w-full object-contain drop-shadow-md"
            />
          </div>
        </>
      ),
    },
    {
      id: "fixed-deposit",
      title: "Grow your wealth with 14.5% p.a. Fixed Deposit",
      containerClass:
        "border-emerald-300/50 bg-gradient-to-br from-[#f0fbf5] via-[#e2f7ec] to-[#cbf0dc] dark:from-[#0d2118] dark:via-[#091711] dark:to-[#07110c] dark:border-emerald-500/20",
      content: (
        <div className="relative z-10 flex flex-col justify-between min-h-[175px] w-full">
          <div className="flex flex-col gap-1">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300 w-fit">
              <Sparkles size={12} strokeWidth={1.8} /> High Yield Savings
            </div>
            <h3 className="mt-1 text-[17px] font-medium leading-snug tracking-tight text-foreground sm:text-[19px]">
              Earn up to 14.5% p.a. on Fixed Deposits.
            </h3>
            <p className="text-[12px] text-muted-foreground leading-relaxed max-w-[85%]">
              Guaranteed returns with flexible tenures from 3 to 24 months. Bank of Ghana protected.
            </p>
          </div>
          <div className="mt-3 flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setShowCalculator(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 dark:bg-emerald-600 px-3.5 py-2 text-[12.5px] font-medium text-white shadow-2xs hover:opacity-90 active:scale-[0.96] transition-transform cursor-pointer"
            >
              <Calculator size={14} strokeWidth={1.8} />
              <span>Calculate Returns</span>
            </button>
            <Link
              href="/accounts"
              className="inline-flex items-center gap-1 text-[12.5px] font-medium text-foreground hover:underline active:scale-[0.96] transition-transform"
            >
              <span>Open Account</span>
              <ArrowRight size={13} strokeWidth={1.8} />
            </Link>
          </div>
        </div>
      ),
    },
    {
      id: "remittances",
      title: "Instant diaspora transfers at zero markup",
      containerClass:
        "border-blue-300/50 bg-gradient-to-br from-[#f0f6ff] via-[#e1eeff] to-[#cfe2fe] dark:from-[#0d1a2d] dark:via-[#091220] dark:to-[#060d17] dark:border-blue-500/20",
      content: (
        <div className="relative z-10 flex flex-col justify-between min-h-[175px] w-full">
          <div className="flex flex-col gap-1">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 px-2.5 py-0.5 text-[11px] font-medium text-blue-700 dark:text-blue-300 w-fit">
              <Globe size={12} strokeWidth={1.8} /> Global Payments
            </div>
            <h3 className="mt-1 text-[17px] font-medium leading-snug tracking-tight text-foreground sm:text-[19px]">
              Zero-fee international money transfers.
            </h3>
            <p className="text-[12px] text-muted-foreground leading-relaxed max-w-[85%]">
              Send directly to UK, USA, Europe, and 45+ African destinations instantly at live interbank rates.
            </p>
          </div>
          <div className="mt-3 flex items-center gap-2.5">
            <Link
              href="/payments/send"
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-700 dark:bg-blue-600 px-3.5 py-2 text-[12.5px] font-medium text-white shadow-2xs hover:opacity-90 active:scale-[0.96] transition-transform"
            >
              <span>Send Money Now</span>
              <ArrowRight size={13} strokeWidth={1.8} />
            </Link>
          </div>
        </div>
      ),
    },
  ];

  const interestRate = 0.145;
  const numDeposit = parseFloat(depositAmount || "0");
  const estimatedReturn = numDeposit * (interestRate * (tenureMonths / 12));
  const totalMaturity = numDeposit + estimatedReturn;

  return (
    <>
      <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-xs transition-colors">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-0.5 text-[11.5px] font-medium text-amber-700 dark:text-amber-300">
              <Sparkles size={12} strokeWidth={1.8} />
              Featured
            </span>
            <span className="text-[12px] text-muted-foreground tabular">{currentSlide + 1} of {slides.length}</span>
          </div>

          {/* Slide Controls */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setCurrentSlide((s) => (s === 0 ? slides.length - 1 : s - 1))}
              className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-[0.96] transition-transform cursor-pointer"
              aria-label="Previous slide"
            >
              <ChevronLeft size={16} strokeWidth={1.8} />
            </button>
            <button
              type="button"
              onClick={() => setCurrentSlide((s) => (s === slides.length - 1 ? 0 : s + 1))}
              className="flex size-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:scale-[0.96] transition-transform cursor-pointer"
              aria-label="Next slide"
            >
              <ChevronRight size={16} strokeWidth={1.8} />
            </button>
          </div>
        </div>

        {/* Slide Stage Container */}
        <div className="my-auto py-2">
          <div
            className={`relative overflow-hidden rounded-xl border p-5 shadow-2xs transition-[background-color,border-color] duration-200 ${slides[currentSlide].containerClass}`}
          >
            {slides[currentSlide].content}
          </div>
        </div>

        {/* Symmetrical Footer */}
        <div className="flex items-center justify-between border-t border-border/50 pt-3 text-[12px] text-muted-foreground">
          <span>Special offer · Terms apply</span>
          <div className="flex items-center gap-1.5">
            {slides.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentSlide(idx)}
                aria-label={`Go to slide ${idx + 1}`}
                className={`rounded-full transition-all duration-200 cursor-pointer ${
                  currentSlide === idx
                    ? "h-1.5 w-4 bg-foreground"
                    : "size-1.5 bg-muted-foreground/35 hover:bg-muted-foreground"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Fixed Deposit Calculator Modal */}
      {showCalculator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                  <TrendingUp size={18} strokeWidth={1.8} />
                </div>
                <div>
                  <h3 className="text-[15px] font-medium text-foreground">Fixed Deposit Calculator</h3>
                  <p className="text-[12px] text-muted-foreground">Estimated interest at 14.50% p.a.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCalculator(false)}
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground active:scale-[0.96] transition-transform cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-foreground">Deposit Amount (GHS)</label>
                <div className="flex items-center rounded-xl border border-border bg-muted/40 px-4 py-2.5 focus-within:border-primary">
                  <span className="text-[16px] font-medium text-muted-foreground mr-2">GHS</span>
                  <input
                    type="number"
                    min="500"
                    step="500"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    className="w-full bg-transparent text-[20px] font-medium text-foreground outline-none tabular"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-foreground">Tenure (Months)</label>
                <div className="grid grid-cols-4 gap-2">
                  {[3, 6, 12, 24].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setTenureMonths(m)}
                      className={`rounded-lg border py-2 text-[12.5px] font-medium transition-colors active:scale-[0.96] transition-transform cursor-pointer ${
                        tenureMonths === m
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-muted/40 text-foreground hover:bg-muted"
                      }`}
                    >
                      {m} Months
                    </button>
                  ))}
                </div>
              </div>

              {/* Earnings Result Card */}
              <div className="mt-2 rounded-xl bg-emerald-500/10 p-4 dark:bg-emerald-500/15 border border-emerald-500/20">
                <div className="flex justify-between text-[13px] text-muted-foreground">
                  <span>Estimated Interest</span>
                  <span className="font-medium text-emerald-600 dark:text-emerald-400 tabular">
                    +GHS {estimatedReturn.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="mt-2 flex justify-between border-t border-emerald-500/20 pt-2 text-[14px] font-medium text-foreground">
                  <span>Total at Maturity</span>
                  <span className="tabular">
                    GHS {totalMaturity.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCalculator(false)}
                  className="rounded-xl border border-border px-4 py-2 text-[13.5px] font-medium text-foreground hover:bg-muted active:scale-[0.96] transition-transform cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCalculator(false);
                    toast.success("Fixed Deposit application initiated.");
                  }}
                  className="rounded-xl bg-emerald-700 dark:bg-emerald-600 px-5 py-2 text-[13.5px] font-medium text-white hover:opacity-90 active:scale-[0.96] transition-transform cursor-pointer shadow-xs"
                >
                  Create Deposit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
