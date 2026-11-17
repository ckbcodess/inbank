"use client";

import { useMobileFields } from "@/lib/use-mobile-fields";

/** Phone keyboard behaviour for every text field in the app, logged in or not. Renders nothing. */
export function MobileFields() {
  useMobileFields();
  return null;
}
