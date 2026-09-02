import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Sparkles, TrendingUp, Globe, Calculator, X } from "lucide-react";
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
      theme: "from-[#f9c632] via-[#f5bc19] to-[#f0b100]",
      content: (
        <>
          <div className="relative z-10 flex flex-col justify-between h-full max-w-[55%]">
            <div>
              <h3 className="text-[22px] font-bold leading-tight tracking-tight text-black sm:text-[26px]">
                Banking made easier,<br />wherever you are.
              </h3>
            </div>

            {/* QR Code Container */}
            <div className="mt-6 flex items-center">
              <div className="size-[120px] sm:size-[140px] overflow-hidden rounded-xl bg-white p-2 shadow-md">
                <Image
                  src="/images/dashboard/qr-code-1.png"
                  alt="QR Code to download NIBS Mobile App"
                  width={140}
                  height={140}
                  className="h-full w-full object-contain"
                />
              </div>
            </div>
          </div>

          {/* 3D Phone / App Illustration */}
          <div className="pointer-events-none absolute -bottom-4 -right-2 h-[260px] w-[210px] sm:h-[290px] sm:w-[250px]">
            <Image
              src="/images/dashboard/phone-app-mockup.png"
              alt="NIBS Mobile App Preview"
              width={260}
              height={300}
              className="h-full w-full object-contain drop-shadow-2xl"
            />
          </div>
        </>
      ),
    },
    {
      id: "fixed-deposit",
      title: "Grow your wealth with 14.5% p.a. Fixed Deposit",
      theme: "from-[#10b981] via-[#059669] to-[#047857]",
      content: (
        <div className="relative z-10 flex flex-col justify-between h-full w-full text-white">
          <div className="flex flex-col gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[12px] font-medium backdrop-blur-xs w-fit">
              <Sparkles size={14} /> High Yield Savings
            </div>
            <h3 className="text-[22px] font-bold leading-tight tracking-tight text-white sm:text-[26px]">
              Earn up to 14.5% p.a.<br />on Fixed Deposits.
            </h3>
            <p className="text-[13px] text-white/80 max-w-[80%]">
              Guaranteed returns with flexible tenures from 3 to 24 months. Bank of Ghana protected.
            </p>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowCalculator(true)}
              className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-[13px] font-medium text-emerald-900 shadow-md hover:bg-white/90 cursor-pointer"
            >
              <Calculator size={15} />
              Calculate Returns
            </button>
            <Link
              href="/accounts"
              className="flex items-center gap-1.5 text-[13px] font-medium text-white hover:underline"
            >
              Open Account <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      ),
    },
    {
      id: "remittances",
      title: "Instant diaspora transfers at zero markup",
      theme: "from-[#3b82f6] via-[#2563eb] to-[#1d4ed8]",
      content: (
        <div className="relative z-10 flex flex-col justify-between h-full w-full text-white">
          <div className="flex flex-col gap-2">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[12px] font-medium backdrop-blur-xs w-fit">
              <Globe size={14} /> Global Payments
            </div>
            <h3 className="text-[22px] font-bold leading-tight tracking-tight text-white sm:text-[26px]">
              Zero-fee international<br />money transfers.
            </h3>
            <p className="text-[13px] text-white/80 max-w-[80%]">
              Send directly to UK, USA, Europe, and 45+ African destinations instantly at live interbank rates.
            </p>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <Link
              href="/payments/send"
              className="flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-[13px] font-medium text-blue-900 shadow-md hover:bg-white/90"
            >
              Send Money Now <ArrowRight size={14} />
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
      <div className="flex h-full w-full flex-col items-center justify-between gap-3">
        <div className={`relative flex flex-1 w-full flex-col justify-between overflow-hidden rounded-2xl p-7 shadow-xs min-h-[300px] bg-gradient-to-br ${slides[currentSlide].theme} transition-all duration-500`}>
          {/* Background ambient glow effect */}
          <div className="pointer-events-none absolute -left-12 -top-12 size-[280px] rounded-full bg-white/25 blur-2xl" />

          {/* Slide Content */}
          {slides[currentSlide].content}
        </div>

        {/* Carousel Pagination Indicator Dots */}
        <div className="flex items-center gap-2 py-1">
          {slides.map((_, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setCurrentSlide(idx)}
              aria-label={`Go to slide ${idx + 1}`}
              className={`rounded-full transition-all cursor-pointer ${
                currentSlide === idx
                  ? "size-2.5 bg-foreground scale-110"
                  : "size-2 bg-muted-foreground/40 hover:bg-muted-foreground"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Fixed Deposit Calculator Modal */}
      {showCalculator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-border/60 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <h3 className="text-[16px] font-medium text-foreground">Fixed Deposit Calculator</h3>
                  <p className="text-[12px] text-muted-foreground">Estimated interest at 14.50% p.a.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCalculator(false)}
                className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-5 flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[13px] font-medium text-foreground">Deposit Amount (GHS)</label>
                <div className="flex items-center rounded-xl border border-border bg-muted/40 px-4 py-2.5">
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
                      className={`rounded-lg border py-2 text-[13px] font-medium transition-colors cursor-pointer ${
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
                  <span className="font-semibold text-emerald-600 dark:text-[#49ff8d]">
                    +GHS {estimatedReturn.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="mt-2 flex justify-between border-t border-emerald-500/20 pt-2 text-[15px] font-medium text-foreground">
                  <span>Total at Maturity</span>
                  <span className="font-semibold">
                    GHS {totalMaturity.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCalculator(false)}
                  className="rounded-xl border border-border px-4 py-2 text-[14px] font-medium text-foreground hover:bg-muted cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCalculator(false);
                    toast.success("Fixed Deposit application initiated.");
                  }}
                  className="rounded-xl bg-emerald-600 px-5 py-2 text-[14px] font-medium text-white hover:bg-emerald-700 cursor-pointer shadow-xs"
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
