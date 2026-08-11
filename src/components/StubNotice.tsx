import { Construction } from "lucide-react";

/**
 * Marks a screen that exists structurally — correct route, correct shell,
 * correct place in the sitemap — but whose interaction is not built for the
 * MVP's first pass.
 */
export default function StubNotice({
  section,
  states,
}: {
  /** Consolidation-doc section this screen comes from. */
  section: string;
  /** State model this screen will implement when built out. */
  states?: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-dashed border-border bg-muted/30 px-4 py-3.5">
      <Construction size={16} strokeWidth={1.8} className="mt-px shrink-0 text-muted-foreground" />
      <div className="text-[12.5px] leading-relaxed text-muted-foreground">
        <span className="text-foreground">Static stub.</span> Structure and placement per {section}.
        {states && <> Full interaction and the {states} state model are not built in this pass.</>}
      </div>
    </div>
  );
}
