# Brand logos to source

Every company and brand named in the prototype's mock data, grouped by what it is. "Have" means a logo file is already in the repo and used. Drop new files in `public/brands/` as `<id>.svg` (or .png) and add `logo: "/brands/<id>.svg"` to the line in `src/lib/brands.ts`.

Marks are trademarks. Get them from each company's own brand or press page, and check that we are allowed to use them.

## Have

| Brand | File |
|---|---|
| MTN (Ghana, Mobile Money, Broadband) | `public/mtn.svg` |
| Telecel (Cash, Ghana) | `public/telecel.svg` |
| AT (AT Money, AirtelTigo) | `public/at.svg` |
| GhanaPay | `public/ghanapay.svg` |
| G-Money | `public/gmoney.svg` |
| GCB Bank | `public/brands/gcb.svg` |
| GH-Link (card network) | `public/ghlink.svg` |
| UnionPay (card network) | `public/images/unionpay.svg` |

## Utilities, TV and telecom

| Brand | Where it appears | Table id |
|---|---|---|
| ECG, Electricity Company of Ghana (ECG PowerApp, ECG Prepaid) | Bills, ledger, saved payees | `ecg` |
| Ghana Water Ltd (GWCL) | Bills, ledger | `gwcl` |
| NEDCo (Northern Electricity Distribution) | Bills, saved payees | to add |
| DStv / MultiChoice | Bills, TV packages | `dstv` |
| GOtv | Bills | `gotv` |
| StarTimes | Bills, TV packages | `startimes` |
| Surfline | Bills | `surfline` |

## Banks (Ghana)

Named in the ledger or the bank pickers. The full bank list is in `src/components/payments/flows/shared.tsx` (`BANKS`).

| Brand | Table id |
|---|---|
| Absa Bank Ghana | `absa` |
| Ecobank Ghana | `ecobank` |
| Stanbic Bank Ghana | `stanbic` |
| Fidelity Bank | `fidelity` |
| CalBank | `calbank` |
| Standard Chartered Bank | to add |
| Access Bank | to add |
| Zenith Bank Ghana | to add |
| United Bank for Africa (UBA) | to add |
| Guaranty Trust Bank (GTBank) | to add |
| Republic Bank | to add |
| Société Générale Ghana | to add |
| First National Bank (FNB) | to add |
| Agricultural Development Bank (ADB) | to add |
| National Investment Bank (NIB) | to add |
| Universal Merchant Bank (UMB) | to add |
| Prudential Bank | to add |
| OmniBSIC | to add |
| Consolidated Bank Ghana | to add |
| First Atlantic Bank | to add |
| Bank of Africa | to add |
| ARB Apex Bank | to add |
| Bank of Ghana | to add |

Others in the list that are savings and loans, or payment services: Adehyeman, Advans, Affinity, Bestpoint, Letshego, Services Integrity, Sinapi Aba, Etranzact, TransFlow, First Bank Ghana.

## Banks (abroad, for international and cross-border payments)

Ecobank Nigeria, Ecobank Côte d'Ivoire, Access Bank Nigeria, Fidelity Bank Nigeria, Stanbic Bank Zambia, Standard Bank South Africa, Equity Bank Kenya, KCB Bank Kenya.

## Shops, fuel and services (the ledger)

| Brand | Table id |
|---|---|
| Melcom (Melcom Stores, Melcom Plus) | `melcom` |
| Shoprite | `shoprite` |
| Shell | to add |
| TotalEnergies | to add |
| Bolt | to add |
| Netflix | to add |
| Spotify | to add |

## Government and public bodies

| Brand | Where it appears |
|---|---|
| Ghana Revenue Authority (GRA) | Tax payments |
| DVLA | Driver licence renewal |
| Passports Office | Passport fees |
| National Health Insurance Scheme (NHIS) | Saved payees |
| WAEC | Exam portal |
| Ghana Cocoa Board | Ledger (corporate) |
| Ministry of Education | Ledger (corporate) |

## Education, health and faith (saved payees)

KNUST, University of Ghana (Legon), Korle Bu Teaching Hospital, SIC Insurance, Action Chapel International, ICGC Christ Temple.

## Card networks (already on card faces)

Visa and Mastercard also appear on cards. Check the card faces in `src/components/cards/NetworkLogo.tsx` for the marks that are already drawn.

## Not brands

Names of people and small businesses in the mock data (Kofi Mensah, Accra Fabrics Ltd, Tema Logistics and so on) stay as initials. They have no logo to find.
