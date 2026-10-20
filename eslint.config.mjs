import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

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
    // Business never imports retail code.
    files: BUSINESS_ZONE,
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          group: ["@/app/(customer)/**", "@/components/customer/**", "@/lib/customer/**"],
          message: "Business must not import retail code. Share through components/ui or a plain lib.",
        }],
      }],
    },
  },
];

// eslint-config-next 15.x ships legacy (eslintrc) configs, so they are bridged
// into flat config here rather than imported directly.
const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [".next/**", "out/**", "build/**", "next-env.d.ts", "node_modules/**"],
  },
  ...shellFirewall,
];

export default eslintConfig;
