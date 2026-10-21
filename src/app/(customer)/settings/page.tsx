import { redirect } from "next/navigation";

/**
 * Settings is a modal over the page the customer is on (see `lib/settings-modal.ts`), not a page of its own. This
 * route only keeps old links working: `/settings?tab=security` lands on Overview with Security open.
 */
const SECTION_FOR_TAB: Record<string, string> = {
  profile: "profile",
  security: "security",
  notifications: "alerts",
  alerts: "alerts",
};

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  redirect(`/overview?settings=${SECTION_FOR_TAB[tab ?? ""] ?? "menu"}`);
}
