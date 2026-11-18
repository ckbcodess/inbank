import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

// Shell firewall: retail (`(customer)`) and business (`/business`) are separate products that share only
// `components/ui`, tokens and the plain libs (money, motion, i18n, authorisation). Zones are by folder:
//   business: src/app/business, src/components/corporate, src/lib/corporate
//   retail:   src/app/(customer), the retail component folders below, src/components/customer, src/lib/customer
// The retail pages business still borrows (accounts, payments, cards, beneficiaries...) sit in `(customer)`
// until they get business versions; the shared libs (mock-data, roles, navigation) are split later.
const BUSINESS_ZONE = [
  "src/app/business/**",
  "src/components/corporate/**",
  "src/lib/corporate/**",
];
const RETAIL_ZONE = [
  "src/app/(customer)/**",
  "src/components/customer/**",
  "src/lib/customer/**",
  "src/components/dashboard/**",
  "src/components/accounts/**",
  "src/components/cards/**",
  "src/components/beneficiaries/**",
  "src/components/insights/**",
];

/** A path into one of personal banking's screens (a leading slash and the first segment). */
const PERSONAL_PATH =
  "/^\\/(overview|accounts|cards|payments|transactions|beneficiaries|settings|reports|fx-rates|notifications|invest|loans|insure|lifestyle|locate-us|groups)([/?#]|$)/";

// Type scale (CONSTITUTION §5): font sizes come from the named steps (text-meta … text-fact, type-page-title,
// type-headline, type-balance), never a raw px size or Tailwind's rem names, which the 14px root distorts.
// Exempt: drawn objects and bespoke fields (card art, the cash-out ticket, avatars, OtpInput, the amount field) and
// prototype tooling. A one-off exemption carries an eslint-disable comment that says why.
const TYPE_SCALE_MESSAGE =
  "Use a type-scale step (text-meta/body/heading/title/fact, type-page-title, type-headline, type-balance), not a raw font size. A label is text-body font-medium.";
const RAW_SIZE = String.raw`/(^|[\s:])text-(\[[0-9.]+px\]|base|lg|xl|[2-9]xl|micro|label)(\s|$)/`;
const TYPE_SCALE = [
  { selector: `Literal[value=${RAW_SIZE}]`, message: TYPE_SCALE_MESSAGE },
  { selector: `TemplateElement[value.raw=${RAW_SIZE}]`, message: TYPE_SCALE_MESSAGE },
];
const TYPE_SCALE_EXEMPT = [
  "src/app/sandbox/**",
  "src/app/motion-lab/**",
  "src/components/dev/**",
  "src/components/payments/CashoutTicket.tsx",
  "src/components/ui/payee-avatar.tsx",
  "src/components/auth/OtpInput.tsx",
];

const shellFirewall = [
  {
    // Retail never imports business code.
    files: RETAIL_ZONE,
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          group: ["@/app/business/**", "@/components/corporate/**", "@/lib/corporate/**"],
          message: "Retail must not import business code. Share through components/ui or a plain lib.",
        }],
      }],
      // And it doesn't branch on business roles or profiles: that branch belongs in the business shell.
      "no-restricted-syntax": ["error",
        ...TYPE_SCALE,
        {
          selector: "Literal[value=/^CORPORATE/]",
          message: "Retail code must not branch on CORPORATE profiles or roles. Move that behaviour into the business shell.",
        },
        {
          selector: "CallExpression[callee.name=/^(isApprover|isCorporateAdmin)$/]",
          message: "Approver and admin checks belong in the business shell, not in retail code.",
        },
      ],
    },
  },
  {
    // Business never imports retail code, and never links to a personal screen: every path it writes starts
    // with /business, so Back, links and redirects cannot land in the personal app.
    files: BUSINESS_ZONE,
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          group: ["@/app/(customer)/**", "@/components/customer/**", "@/lib/customer/**"],
          message: "Business must not import retail code. Share through components/ui or a plain lib.",
        }],
      }],
      "no-restricted-syntax": ["error",
        ...TYPE_SCALE,
        {
          selector: `Literal[value=${PERSONAL_PATH}]`,
          message: "Business code must not point at a personal screen. Use the /business/* page, or build one.",
        },
        {
          selector: `TemplateElement[value.raw=${PERSONAL_PATH}]`,
          message: "Business code must not point at a personal screen. Use the /business/* page, or build one.",
        },
      ],
    },
  },
];

// eslint-config-next 16 ships flat configs, so they are imported directly.
// Its React Compiler rules (react-hooks v7) flag ~125 existing spots (setState in effects, ref reads in render).
// They are off until those are cleaned up deliberately; see WORKING_LOG.
const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "off",
      "react-hooks/purity": "off",
      "react-hooks/refs": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "react-hooks/static-components": "off",
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: TYPE_SCALE_EXEMPT,
    rules: { "no-restricted-syntax": ["error", ...TYPE_SCALE] },
  },
  {
    ignores: [".next/**", "out/**", "build/**", "next-env.d.ts", "node_modules/**"],
  },
  ...shellFirewall,
];

export default eslintConfig;
