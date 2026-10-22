import BusinessTheme, { BUSINESS_THEME_SCRIPT } from "@/components/corporate/BusinessTheme";

/**
 * Everything under /business, signed in or not, wears business banking's smoke-ash theme (BusinessTheme).
 * The route groups below it keep their own layouts: `(app)` the signed-in shell, `(entry)` sign-up and activation.
 */
export default function BusinessRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: BUSINESS_THEME_SCRIPT }} />
      <BusinessTheme />
      {children}
    </>
  );
}
