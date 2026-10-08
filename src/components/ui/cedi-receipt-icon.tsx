import * as React from "react";

export interface CediReceiptIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  strokeWidth?: number | string;
  className?: string;
  "aria-hidden"?: boolean | "true" | "false";
}

/**
 * Receipt icon with the Ghanaian Cedi symbol (₵) inside.
 * Drop-in replacement for Lucide Receipt icon in GCB Pay / Bills actions.
 */
export const CediReceiptIcon = React.forwardRef<SVGSVGElement, CediReceiptIconProps>(
  ({ size = 24, strokeWidth = 2, className, ...props }, ref) => {
    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        width={size}
        height={size}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden={props["aria-hidden"] ?? true}
        {...props}
      >
        {/* Receipt outline */}
        <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
        {/* Cedi symbol (₵) */}
        <path d="M15 9.5a3.8 3.8 0 1 0 0 5" />
        <path d="M12 6.5v11" />
      </svg>
    );
  }
);

CediReceiptIcon.displayName = "CediReceiptIcon";

export const ReceiptCedi = CediReceiptIcon;
export default CediReceiptIcon;
