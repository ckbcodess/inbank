/** Option lists for the beneficiary form: banks, networks, billers and the countries each cross-border rail reaches. */

import { BILLERS } from "./mock-data";

export const GHANA_BANKS = [
  "GCB Bank",
  "Standard Bank Ghana",
  "Ecobank Ghana",
  "Absa Ghana",
  "Fidelity Bank",
  "Stanbic Bank Ghana",
  "CalBank",
  "CBG (Consolidated Bank Ghana)",
  "Access Bank",
  "Zenith Bank Ghana",
];

export const WALLET_NETWORKS = ["MTN Mobile Money", "Telecel Cash", "AT Money", "GhanaPay", "G-Money"];
export const AIRTIME_NETWORKS = ["MTN Ghana", "Telecel Ghana", "AT Ghana", "GhanaPay", "G-Money"];
export const BILLER_CATEGORIES = Array.from(new Set(BILLERS.map((b) => b.category)));

export const SWIFT_COUNTRIES = [
  { name: "United States", currency: "USD" },
  { name: "United Kingdom", currency: "GBP" },
  { name: "Germany (Eurozone)", currency: "EUR" },
  { name: "France (Eurozone)", currency: "EUR" },
  { name: "Canada", currency: "CAD" },
  { name: "China", currency: "CNY" },
  { name: "United Arab Emirates", currency: "AED" },
  { name: "Australia", currency: "AUD" },
  { name: "Japan", currency: "JPY" },
  { name: "South Africa", currency: "ZAR" },
];

export const INTERNATIONAL_BANKS_BY_COUNTRY: Record<string, string[]> = {
  "United States": [
    "JPMorgan Chase Bank",
    "Bank of America",
    "Citibank",
    "Wells Fargo",
    "Goldman Sachs",
    "Morgan Stanley",
    "PNC Bank",
    "U.S. Bank",
  ],
  "United Kingdom": [
    "Barclays",
    "HSBC UK",
    "Lloyds Bank",
    "NatWest",
    "Royal Bank of Scotland",
    "Standard Chartered",
    "Santander UK",
  ],
  "Germany (Eurozone)": [
    "Deutsche Bank",
    "Commerzbank",
    "KfW",
    "DZ Bank",
    "Landesbank Baden-Württemberg",
    "HypoVereinsbank",
  ],
  "France (Eurozone)": [
    "BNP Paribas",
    "Crédit Agricole",
    "Société Générale",
    "BPCE",
    "Crédit Mutuel",
  ],
  "Canada": [
    "RBC Royal Bank",
    "TD Bank",
    "Scotiabank",
    "BMO Bank of Montreal",
    "CIBC",
  ],
  "China": [
    "Industrial & Commercial Bank of China (ICBC)",
    "China Construction Bank",
    "Bank of China",
    "Agricultural Bank of China",
  ],
  "United Arab Emirates": [
    "Emirates NBD",
    "First Abu Dhabi Bank (FAB)",
    "Abu Dhabi Commercial Bank (ADCB)",
    "Mashreq Bank",
  ],
  "Australia": [
    "Commonwealth Bank of Australia",
    "ANZ Bank",
    "National Australia Bank (NAB)",
    "Westpac",
  ],
  "Japan": [
    "MUFG Bank",
    "Sumitomo Mitsui Banking Corporation (SMBC)",
    "Mizuho Bank",
    "Japan Post Bank",
  ],
  "South Africa": [
    "Standard Bank South Africa",
    "FirstNational Bank (FNB)",
    "Absa Bank South Africa",
    "Nedbank",
    "Capitec Bank",
  ],
};

export const PAPSS_COUNTRIES = [
  { name: "Nigeria", currency: "NGN" },
  { name: "Kenya", currency: "KES" },
  { name: "Côte d'Ivoire", currency: "XOF" },
  { name: "South Africa", currency: "ZAR" },
  { name: "Egypt", currency: "EGP" },
  { name: "Rwanda", currency: "RWF" },
  { name: "Zambia", currency: "ZMW" },
];

export const PAPSS_BANKS_BY_COUNTRY: Record<string, string[]> = {
  "Nigeria": [
    "Access Bank Nigeria",
    "Zenith Bank",
    "Guaranty Trust Bank (GTBank)",
    "First Bank of Nigeria",
    "United Bank for Africa (UBA)",
    "Fidelity Bank Nigeria",
  ],
  "Kenya": [
    "KCB Bank Kenya",
    "Equity Bank Kenya",
    "NCBA Bank",
    "Co-operative Bank of Kenya",
    "Absa Bank Kenya",
    "Standard Chartered Kenya",
  ],
  "South Africa": [
    "Standard Bank South Africa",
    "FirstNational Bank (FNB)",
    "Absa Bank South Africa",
    "Nedbank",
    "Capitec Bank",
  ],
  "Côte d'Ivoire": [
    "Société Générale Côte d'Ivoire (SGCI)",
    "Ecobank Côte d'Ivoire",
    "NSIA Banque",
    "Banque Atlantique",
    "SIB (Société Ivoirienne de Banque)",
  ],
  "Egypt": [
    "National Bank of Egypt",
    "Banque Misr",
    "Commercial International Bank (CIB)",
    "QNB Alahli",
    "Banque du Caire",
  ],
  "Rwanda": [
    "Bank of Kigali",
    "I&M Bank Rwanda",
    "Equity Bank Rwanda",
    "Cogebanque",
    "Access Bank Rwanda",
  ],
  "Zambia": [
    "Zanaco (Zambia National Commercial Bank)",
    "Stanbic Bank Zambia",
    "Absa Bank Zambia",
    "Standard Chartered Zambia",
    "Atlas Mara Zambia",
  ],
};
