/**
 * How a customer reaches the bank. One source, so Contact support, the assistant's "Get help" menu and anything else
 * that names a number or address read the same. Placeholders until the bank confirms them (see WORKING_LOG).
 */

export const SUPPORT = {
  phone: { display: "+233 302 681 531", tel: "+233302681531", hours: "Open 24/7" },
  whatsapp: { display: "+233 302 681 531", url: "https://wa.me/233302681531" },
  email: { display: "customercare@gcb.com.gh", href: "mailto:customercare@gcb.com.gh" },
} as const;
