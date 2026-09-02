import { useState } from "react";
import { ArrowUpDown, ChevronDown, RefreshCw } from "lucide-react";

const CURRENCIES = [
  { code: "GHS", name: "Ghanaian Cedi", symbol: "GH₵", flag: "🇬🇭" },
  { code: "USD", name: "US Dollar", symbol: "$", flag: "🇺🇸" },
  { code: "EUR", name: "Euro", symbol: "€", flag: "🇪🇺" },
  { code: "GBP", name: "British Pound", symbol: "£", flag: "🇬🇧" },
  { code: "NGN", name: "Nigerian Naira", symbol: "₦", flag: "🇳🇬" },
  { code: "KES", name: "Kenyan Shilling", symbol: "KSh", flag: "🇰🇪" },
  { code: "CAD", name: "Canadian Dollar", symbol: "CA$", flag: "🇨🇦" },
];

// Base FX rates relative to 1 USD
const USD_RATES: Record<string, number> = {
  USD: 1.0,
  GHS: 15.65,
  EUR: 0.92,
  GBP: 0.78,
  NGN: 1510.0,
  KES: 129.5,
  CAD: 1.36,
};

export function FxRatesWidget() {
  const [fromAmount, setFromAmount] = useState("1000");
  const [fromCurrency, setFromCurrency] = useState("USD");
  const [toCurrency, setToCurrency] = useState("GHS");

  const [activeTab, setActiveTab] = useState<"convert" | "chart">("convert");
  const [chartRange, setChartRange] = useState<"7d" | "30d" | "90d">("30d");

  const [showFromMenu, setShowFromMenu] = useState(false);
  const [showToMenu, setShowToMenu] = useState(false);

  // Compute exchange rate between fromCurrency and toCurrency
  const fromUsdRate = USD_RATES[fromCurrency] || 1;
  const toUsdRate = USD_RATES[toCurrency] || 1;
  const exchangeRate = toUsdRate / fromUsdRate;

  const handleSwap = () => {
    const prevFrom = fromCurrency;
    setFromCurrency(toCurrency);
    setToCurrency(prevFrom);
    setShowFromMenu(false);
    setShowToMenu(false);
  };

  const numericFromAmount = parseFloat(fromAmount || "0");
  const calculatedToAmount = (numericFromAmount * exchangeRate).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  // Chart data points for 7d, 30d, 90d
  const chartDatasets: Record<"7d" | "30d" | "90d", number[]> = {
    "7d": [15.42, 15.48, 15.51, 15.55, 15.58, 15.61, 15.65],
    "30d": [15.1, 15.18, 15.25, 15.2, 15.32, 15.38, 15.45, 15.42, 15.52, 15.58, 15.65],
    "90d": [14.6, 14.75, 14.82, 14.95, 15.05, 15.2, 15.35, 15.48, 15.65],
  };

  const chartPoints = chartDatasets[chartRange];
  const minVal = Math.min(...chartPoints) * 0.99;
  const maxVal = Math.max(...chartPoints) * 1.01;
  const svgWidth = 280;
  const svgHeight = 100;

  const pathD = chartPoints
    .map((val, idx) => {
      const x = (idx / (chartPoints.length - 1)) * svgWidth;
      const y = svgHeight - ((val - minVal) / (maxVal - minVal)) * svgHeight;
      return `${idx === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <div className="flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-border bg-card p-6 shadow-xs transition-all">
      {/* Top Header with Convert / Chart Switcher */}
      <div className="flex items-center justify-between">
        <h2 className="text-[16px] font-medium text-foreground">FX Rates</h2>
        <div className="flex items-center rounded-lg bg-muted/60 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("convert")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-[13px] font-normal transition-all cursor-pointer ${
              activeTab === "convert"
                ? "bg-card text-foreground shadow-xs font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>Convert</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("chart")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1 text-[13px] font-normal transition-all cursor-pointer ${
              activeTab === "chart"
                ? "bg-card text-foreground shadow-xs font-medium"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span>Chart</span>
          </button>
        </div>
      </div>

      {activeTab === "convert" ? (
        /* Converter Form */
        <div className="mx-auto my-auto flex w-full max-w-[340px] flex-col items-center gap-3 py-2">
          {/* Live Rate Label */}
          <div className="text-center text-[14px] text-muted-foreground">
            1 {fromCurrency} = {exchangeRate >= 1 ? exchangeRate.toFixed(2) : exchangeRate.toFixed(4)} {toCurrency}
          </div>

          {/* From Input */}
          <div className="relative w-full">
            <div className="flex w-full items-center justify-between rounded-xl border border-border bg-muted/40 px-5 py-3 transition-colors focus-within:border-primary">
              <input
                type="number"
                min="0"
                step="any"
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
                className="w-1/2 bg-transparent text-[22px] font-medium text-foreground outline-none tabular"
                placeholder="0.00"
              />
              <button
                type="button"
                onClick={() => {
                  setShowFromMenu(!showFromMenu);
                  setShowToMenu(false);
                }}
                className="flex items-center gap-1.5 rounded-lg bg-card px-2.5 py-1 text-[14px] font-medium text-foreground shadow-2xs border border-border/60 hover:bg-muted cursor-pointer"
              >
                <span>{CURRENCIES.find((c) => c.code === fromCurrency)?.flag}</span>
                <span>{fromCurrency}</span>
                <ChevronDown size={14} className="text-muted-foreground" />
              </button>
            </div>

            {showFromMenu && (
              <div className="absolute right-0 top-full z-40 mt-1 max-h-48 w-44 overflow-auto rounded-xl border border-border bg-card py-1 shadow-xl animate-in fade-in zoom-in-95 duration-100">
                {CURRENCIES.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => {
                      setFromCurrency(c.code);
                      setShowFromMenu(false);
                    }}
                    className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] transition-colors cursor-pointer ${
                      fromCurrency === c.code ? "bg-muted font-medium" : "hover:bg-muted/50"
                    }`}
                  >
                    <span>{c.flag}</span>
                    <span className="font-medium">{c.code}</span>
                    <span className="truncate text-muted-foreground text-[11px]">{c.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Swap Button */}
          <button
            type="button"
            onClick={handleSwap}
            className="flex size-7 items-center justify-center rounded-full bg-muted text-muted-foreground transition-all hover:bg-foreground hover:text-background active:scale-90 cursor-pointer shadow-xs"
            aria-label="Swap currencies"
          >
            <ArrowUpDown size={15} strokeWidth={2} />
          </button>

          {/* To Input */}
          <div className="relative w-full">
            <div className="flex w-full items-center justify-between rounded-xl border border-border bg-muted/40 px-5 py-3 transition-colors">
              <span className="w-1/2 text-[22px] font-medium text-foreground tabular truncate">
                {calculatedToAmount}
              </span>
              <button
                type="button"
                onClick={() => {
                  setShowToMenu(!showToMenu);
                  setShowFromMenu(false);
                }}
                className="flex items-center gap-1.5 rounded-lg bg-card px-2.5 py-1 text-[14px] font-medium text-foreground shadow-2xs border border-border/60 hover:bg-muted cursor-pointer"
              >
                <span>{CURRENCIES.find((c) => c.code === toCurrency)?.flag}</span>
                <span>{toCurrency}</span>
                <ChevronDown size={14} className="text-muted-foreground" />
              </button>
            </div>

            {showToMenu && (
              <div className="absolute right-0 top-full z-40 mt-1 max-h-48 w-44 overflow-auto rounded-xl border border-border bg-card py-1 shadow-xl animate-in fade-in zoom-in-95 duration-100">
                {CURRENCIES.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => {
                      setToCurrency(c.code);
                      setShowToMenu(false);
                    }}
                    className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] transition-colors cursor-pointer ${
                      toCurrency === c.code ? "bg-muted font-medium" : "hover:bg-muted/50"
                    }`}
                  >
                    <span>{c.flag}</span>
                    <span className="font-medium">{c.code}</span>
                    <span className="truncate text-muted-foreground text-[11px]">{c.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Last updated footer */}
          <div className="mt-0.5 flex items-center gap-1.5 text-center text-[12px] text-muted-foreground">
            <RefreshCw size={11} />
            <span>Updated 2 mins ago · Bank of Ghana mid-rate</span>
          </div>
        </div>
      ) : (
        /* Historical Rate Chart View */
        <div className="mx-auto my-auto flex w-full max-w-[340px] flex-col items-center gap-3 py-2">
          <div className="flex w-full items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[12px] text-muted-foreground">Pair Trend</span>
              <span className="text-[17px] font-medium text-foreground">
                {fromCurrency}/{toCurrency} · {exchangeRate.toFixed(2)}
              </span>
            </div>
            <div className="flex gap-1 rounded-lg bg-muted/60 p-0.5">
              {(["7d", "30d", "90d"] as const).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setChartRange(r)}
                  className={`rounded-md px-2 py-0.5 text-[11px] font-medium transition-colors cursor-pointer ${
                    chartRange === r ? "bg-card text-foreground shadow-xs" : "text-muted-foreground"
                  }`}
                >
                  {r.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* SVG Line Chart */}
          <div className="relative h-[110px] w-full rounded-xl bg-muted/30 p-2">
            <svg className="h-full w-full overflow-visible" viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f6bf36" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#f6bf36" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path
                d={`${pathD} L ${svgWidth} ${svgHeight} L 0 ${svgHeight} Z`}
                fill="url(#chartGrad)"
              />
              <path
                d={pathD}
                fill="none"
                stroke="#f6bf36"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>

          <div className="flex w-full items-center justify-between text-[11px] text-muted-foreground">
            <span>Low: {minVal.toFixed(2)}</span>
            <span className="text-emerald-600 font-medium">+1.8% in period</span>
            <span>High: {maxVal.toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
