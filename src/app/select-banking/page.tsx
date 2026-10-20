import { notFound } from "next/navigation";
import { SHOW_DEMO_HUB, SHOW_DEMO_TOOLS } from "@/lib/demo-tools";
import SelectBankingChooser from "./SelectBankingChooser";

/**
 * The personal-or-business chooser is demo scaffolding: each real door has its own address (`/login` for personal,
 * `/login?type=business` for business). It is reached from the Demo hub, so it exists wherever the hub does and is
 * gone from a build that has neither the hub nor the demo tools.
 */
export default function SelectBankingPage() {
  if (!SHOW_DEMO_HUB && !SHOW_DEMO_TOOLS) notFound();
  return <SelectBankingChooser />;
}
