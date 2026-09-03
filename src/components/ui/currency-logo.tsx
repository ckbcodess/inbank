"use client";

import React, { useId } from "react";
import { cn } from "@/lib/utils";

export interface CurrencyMeta {
  code: string;
  name: string;
  country: string;
  symbol: string;
}

export const CURRENCY_METADATA: Record<string, CurrencyMeta> = {
  USD: { code: "USD", name: "US Dollar", country: "United States", symbol: "$" },
  GBP: { code: "GBP", name: "British Pound", country: "United Kingdom", symbol: "£" },
  EUR: { code: "EUR", name: "Euro", country: "European Union", symbol: "€" },
  CHF: { code: "CHF", name: "Swiss Franc", country: "Switzerland", symbol: "CHF" },
  ZAR: { code: "ZAR", name: "South African Rand", country: "South Africa", symbol: "R" },
  NGN: { code: "NGN", name: "Nigerian Naira", country: "Nigeria", symbol: "₦" },
  CNY: { code: "CNY", name: "Chinese Yuan", country: "China", symbol: "¥" },
  GHS: { code: "GHS", name: "Ghanaian Cedi", country: "Ghana", symbol: "GH₵" },
  CAD: { code: "CAD", name: "Canadian Dollar", country: "Canada", symbol: "CA$" },
  KES: { code: "KES", name: "Kenyan Shilling", country: "Kenya", symbol: "KSh" },
};

export function getCurrencyMeta(code: string): CurrencyMeta {
  const normalized = code.toUpperCase().trim();
  return (
    CURRENCY_METADATA[normalized] ?? {
      code: normalized,
      name: `${normalized} Currency`,
      country: normalized,
      symbol: normalized,
    }
  );
}

export interface CurrencyLogoProps {
  currency: string;
  size?: number;
  className?: string;
  showBorder?: boolean;
}

/**
 * Circular country logo for currencies.
 * Renders high-fidelity, authentic vector flags in a circular badge.
 */
export function CurrencyLogo({
  currency,
  size = 24,
  className,
  showBorder = true,
}: CurrencyLogoProps) {
  const code = currency.toUpperCase().trim();
  const id = useId().replace(/:/g, "");
  const clipId = `circle-clip-${id}-${code}`;

  const renderFlag = () => {
    switch (code) {
      // Ghana (GHS)
      case "GHS":
      case "GH":
        return (
          <g>
            <rect y="0" width="32" height="10.67" fill="#DE2010" />
            <rect y="10.67" width="32" height="10.67" fill="#FFD100" />
            <rect y="21.33" width="32" height="10.67" fill="#008751" />
            {/* Center Black Star */}
            <polygon
              points="16,11.5 17.4,14.7 20.9,15.1 18.3,17.4 19.1,20.8 16,19 12.9,20.8 13.7,17.4 11.1,15.1 14.6,14.7"
              fill="#111111"
            />
          </g>
        );

      // United States (USD)
      case "USD":
      case "US":
        return (
          <g>
            {/* 13 Stripes */}
            {Array.from({ length: 13 }).map((_, i) => (
              <rect
                key={i}
                x="0"
                y={(i * 32) / 13}
                width="32"
                height={32 / 13}
                fill={i % 2 === 0 ? "#BF0A30" : "#FFFFFF"}
              />
            ))}
            {/* Blue canton */}
            <rect x="0" y="0" width="15" height="17.2" fill="#002868" />
            {/* Mini stars pattern */}
            <circle cx="3.5" cy="3.5" r="0.9" fill="#FFFFFF" />
            <circle cx="7.5" cy="3.5" r="0.9" fill="#FFFFFF" />
            <circle cx="11.5" cy="3.5" r="0.9" fill="#FFFFFF" />
            <circle cx="5.5" cy="7" r="0.9" fill="#FFFFFF" />
            <circle cx="9.5" cy="7" r="0.9" fill="#FFFFFF" />
            <circle cx="3.5" cy="10.5" r="0.9" fill="#FFFFFF" />
            <circle cx="7.5" cy="10.5" r="0.9" fill="#FFFFFF" />
            <circle cx="11.5" cy="10.5" r="0.9" fill="#FFFFFF" />
            <circle cx="5.5" cy="14" r="0.9" fill="#FFFFFF" />
            <circle cx="9.5" cy="14" r="0.9" fill="#FFFFFF" />
          </g>
        );

      // United Kingdom (GBP)
      case "GBP":
      case "GB":
      case "UK":
        return (
          <g>
            <rect width="32" height="32" fill="#012169" />
            {/* St Andrew & St Patrick diagonals */}
            <path d="M0,0 L32,32 M32,0 L0,32" stroke="#FFFFFF" strokeWidth="5.5" />
            <path d="M0,0 L16,16 M32,0 L16,16" stroke="#C8102E" strokeWidth="2" />
            <path d="M32,32 L16,16 M0,32 L16,16" stroke="#C8102E" strokeWidth="2" />
            {/* St George Cross */}
            <path d="M16,0 V32 M0,16 H32" stroke="#FFFFFF" strokeWidth="9.5" />
            <path d="M16,0 V32 M0,16 H32" stroke="#C8102E" strokeWidth="5.5" />
          </g>
        );

      // European Union (EUR)
      case "EUR":
      case "EU":
        return (
          <g>
            <rect width="32" height="32" fill="#003399" />
            {/* 12 Stars Circle */}
            {Array.from({ length: 12 }).map((_, i) => {
              const angle = (i * 30 * Math.PI) / 180;
              const cx = 16 + 9 * Math.sin(angle);
              const cy = 16 - 9 * Math.cos(angle);
              return <circle key={i} cx={cx} cy={cy} r="1.15" fill="#FFCC00" />;
            })}
          </g>
        );

      // Switzerland (CHF)
      case "CHF":
      case "CH":
        return (
          <g>
            <rect width="32" height="32" fill="#D52B1E" />
            {/* Swiss Cross */}
            <rect x="7" y="13.2" width="18" height="5.6" rx="0.8" fill="#FFFFFF" />
            <rect x="13.2" y="7" width="5.6" height="18" rx="0.8" fill="#FFFFFF" />
          </g>
        );

      // South Africa (ZAR)
      case "ZAR":
      case "ZA":
        return (
          <g>
            <rect width="32" height="16" fill="#DE3831" />
            <rect y="16" width="32" height="16" fill="#002395" />
            {/* Black hoist triangle */}
            <polygon points="0,4 12,16 0,28" fill="#000000" />
            {/* Yellow border */}
            <polygon points="0,2 14,16 0,30" fill="none" stroke="#FFB612" strokeWidth="1.8" />
            {/* White/Green Y-shape */}
            <path
              d="M0,0 L16,14 L32,14 L32,18 L16,18 L0,32"
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="6"
            />
            <path
              d="M0,0 L16,14 L32,14 L32,18 L16,18 L0,32"
              fill="none"
              stroke="#007A3D"
              strokeWidth="3.6"
            />
          </g>
        );

      // Nigeria (NGN)
      case "NGN":
      case "NG":
        return (
          <g>
            <rect x="0" y="0" width="10.67" height="32" fill="#008751" />
            <rect x="10.67" y="0" width="10.67" height="32" fill="#FFFFFF" />
            <rect x="21.33" y="0" width="10.67" height="32" fill="#008751" />
          </g>
        );

      // China (CNY)
      case "CNY":
      case "CN":
        return (
          <g>
            <rect width="32" height="32" fill="#DE2910" />
            {/* Large Star */}
            <polygon
              points="9,4 10.3,7.5 14,7.8 11.2,10.2 12,13.8 9,11.8 6,13.8 6.8,10.2 4,7.8 7.7,7.5"
              fill="#FFDE00"
            />
            {/* 4 Small Arc Stars */}
            <circle cx="16" cy="5.5" r="1.1" fill="#FFDE00" />
            <circle cx="18.5" cy="8.5" r="1.1" fill="#FFDE00" />
            <circle cx="18.5" cy="12.5" r="1.1" fill="#FFDE00" />
            <circle cx="16" cy="15.5" r="1.1" fill="#FFDE00" />
          </g>
        );

      // Canada (CAD)
      case "CAD":
      case "CA":
        return (
          <g>
            <rect x="0" y="0" width="8" height="32" fill="#FF0000" />
            <rect x="8" y="0" width="16" height="32" fill="#FFFFFF" />
            <rect x="24" y="0" width="8" height="32" fill="#FF0000" />
            {/* Maple Leaf */}
            <path
              d="M16,7 L17.5,11.5 L19.5,10.5 L19,13.5 L22,14 L20,16.5 L21.5,17.5 L18.5,19 L19,21 L16.5,20 L16,24.5 L15.5,20 L13,21 L13.5,19 L10.5,17.5 L12,16.5 L10,14 L13,13.5 L12.5,10.5 L14.5,11.5 Z"
              fill="#FF0000"
            />
          </g>
        );

      // Kenya (KES)
      case "KES":
      case "KE":
        return (
          <g>
            <rect y="0" width="32" height="9" fill="#000000" />
            <rect y="9" width="32" height="1.5" fill="#FFFFFF" />
            <rect y="10.5" width="32" height="11" fill="#BB0000" />
            <rect y="21.5" width="32" height="1.5" fill="#FFFFFF" />
            <rect y="23" width="32" height="9" fill="#006600" />
            {/* Maasai Shield Center */}
            <ellipse cx="16" cy="16" rx="4.5" ry="9" fill="#880000" stroke="#FFFFFF" strokeWidth="0.8" />
            <circle cx="16" cy="16" r="1.5" fill="#FFFFFF" />
          </g>
        );

      // Generic fallback
      default:
        return (
          <g>
            <rect width="32" height="32" fill="#3B82F6" />
            <text
              x="16"
              y="20"
              fontSize="10"
              fontWeight="bold"
              textAnchor="middle"
              fill="#FFFFFF"
              fontFamily="sans-serif"
            >
              {code.slice(0, 3)}
            </text>
          </g>
        );
    }
  };

  return (
    <div
      className={cn(
        "relative shrink-0 inline-flex items-center justify-center rounded-full overflow-hidden shadow-xs",
        showBorder && "ring-1 ring-border/80 dark:ring-white/15",
        className
      )}
      style={{ width: size, height: size }}
      aria-label={`${code} flag`}
    >
      <svg
        viewBox="0 0 32 32"
        width={size}
        height={size}
        className="block shrink-0"
      >
        <defs>
          <clipPath id={clipId}>
            <circle cx="16" cy="16" r="16" />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clipId})`}>{renderFlag()}</g>
      </svg>
    </div>
  );
}

/**
 * CurrencyPairLogos
 *
 * Renders dual overlapping circular logos for currency pairs like USD/GHS.
 * Base currency sits prominently in the front, quote currency tucked cleanly behind.
 */
export function CurrencyPairLogos({
  base,
  quote = "GHS",
  size = 28,
  className,
}: {
  base: string;
  quote?: string;
  size?: number;
  className?: string;
}) {
  const secondarySize = Math.round(size * 0.78);
  const offset = Math.round(size * 0.45);

  return (
    <div
      className={cn("relative flex items-center shrink-0", className)}
      style={{ width: size + offset, height: size }}
    >
      {/* Base currency (front) */}
      <CurrencyLogo
        currency={base}
        size={size}
        className="relative z-10 shadow-sm"
      />
      {/* Quote currency (behind) */}
      <div
        className="absolute top-1/2 -translate-y-1/2"
        style={{ left: offset }}
      >
        <CurrencyLogo
          currency={quote}
          size={secondarySize}
          className="shadow-xs opacity-95 ring-1 ring-background"
        />
      </div>
    </div>
  );
}
