/**
 * Drawings for first-time empty states. Each is one simple object in front of the
 * layered amber shapes used elsewhere in the app (Recommended for you), so empty
 * states look like they belong to this product. Objects are filled with the card surface (#fafafa light, #181818 dark, the `card` token) so the amber never shows through them; strokes use theme tokens,
 * so one drawing serves light and dark. Decorative: the words carry the meaning.
 */

const BLOB_A =
  "M52 3 C66 1 74 14 82 22 C92 30 99 44 94 58 C90 70 78 74 72 84 C66 94 54 99 42 95 C30 91 24 82 14 76 C4 68 2 54 8 42 C14 30 12 20 24 12 C34 6 42 4 52 3 Z";
const BLOB_B =
  "M46 5 C58 8 62 20 74 24 C86 28 98 38 96 52 C94 66 84 70 78 80 C72 90 62 98 50 96 C38 94 34 84 24 78 C12 72 3 62 5 50 C7 38 18 34 22 24 C26 14 36 3 46 5 Z";

interface Layer {
  b: "a" | "b";
  scale: number;
  rotate: number;
  opacity: number;
}

/** Soft amber layers, faint to solid, centred on (cx, cy). */
function Shapes({ cx, cy, layers }: { cx: number; cy: number; layers: Layer[] }) {
  return (
    <>
      {layers.map((l, i) => (
        <g key={i} transform={`translate(${cx} ${cy}) rotate(${l.rotate}) scale(${l.scale}) translate(-50 -50)`}>
          <path d={l.b === "a" ? BLOB_A : BLOB_B} className="fill-primary" opacity={l.opacity} />
        </g>
      ))}
    </>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <svg viewBox="0 0 200 132" width={330} height={218} aria-hidden="true" className="mx-auto h-auto max-w-full">
      {children}
    </svg>
  );
}


/* ── The rest of the set. Same recipe: an object over the layered shapes, each turned differently. ── */

const L2: Layer[] = [
  { b: "a", scale: 1.3, rotate: 70, opacity: 0.14 },
  { b: "b", scale: 1.0, rotate: -20, opacity: 0.28 },
  { b: "a", scale: 0.7, rotate: 15, opacity: 0.55 },
];
const L3: Layer[] = [
  { b: "b", scale: 1.35, rotate: -50, opacity: 0.14 },
  { b: "a", scale: 1.05, rotate: 25, opacity: 0.28 },
  { b: "b", scale: 0.72, rotate: -75, opacity: 0.55 },
];
const L4: Layer[] = [
  { b: "a", scale: 1.25, rotate: 110, opacity: 0.14 },
  { b: "b", scale: 0.98, rotate: -60, opacity: 0.28 },
  { b: "a", scale: 0.68, rotate: 40, opacity: 0.55 },
];

const LINE = "fill-none stroke-foreground/45";
const FRONT = "fill-card stroke-foreground/75";
const BACK = "fill-card stroke-foreground/40";
const SW = { strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round" } as const;

/** A calendar, for no standing orders. */
export function EmptyArtStanding() {
  return (
    <Frame>
      <Shapes cx={100} cy={66} layers={L2} />
      <g transform="translate(100 68) rotate(-4)" {...SW}>
        <rect x={-30} y={-28} width={60} height={56} rx={7} className={FRONT} />
        <path d="M-30 -14 H30" className={LINE} />
        <path d="M-15 -34 V-22 M15 -34 V-22" className="fill-none stroke-foreground/75" />
        <circle cx={-14} cy={-2} r={2.4} className="fill-foreground/35 stroke-none" />
        <circle cx={0} cy={-2} r={2.4} className="fill-foreground/35 stroke-none" />
        <circle cx={14} cy={-2} r={2.4} className="fill-card stroke-primary" />
        <circle cx={-14} cy={12} r={2.4} className="fill-foreground/35 stroke-none" />
        <circle cx={0} cy={12} r={2.4} className="fill-foreground/35 stroke-none" />
      </g>
    </Frame>
  );
}

/** A page with a folded corner, for no statements. */
export function EmptyArtStatements() {
  return (
    <Frame>
      <Shapes cx={100} cy={66} layers={L3} />
      <g transform="translate(100 66) rotate(5)" {...SW}>
        <path d="M-24 -34 H10 L24 -20 V34 H-24 Z" className={FRONT} />
        <path d="M10 -34 V-20 H24" className={LINE} />
        <path d="M-14 -6 H14 M-14 6 H14 M-14 18 H2" className={LINE} />
        <rect x={-14} y={-24} width={12} height={7} rx={2} className="fill-card stroke-primary" />
      </g>
    </Frame>
  );
}

/** Two coins and a swap arrow, for no exchange rates. */
export function EmptyArtRates() {
  return (
    <Frame>
      <Shapes cx={100} cy={66} layers={L4} />
      <g {...SW}>
        <circle cx={84} cy={60} r={20} className={FRONT} />
        <circle cx={116} cy={66} r={20} className="fill-card stroke-primary" />
        <path d="M76 56 H92 M86 50 L92 56 L86 62" className={LINE} />
        <path d="M124 70 H108 M114 64 L108 70 L114 76" className="fill-none stroke-foreground/55" />
      </g>
    </Frame>
  );
}

/** Three bars, for no spending or activity to chart. */
export function EmptyArtChart() {
  return (
    <Frame>
      <Shapes cx={100} cy={66} layers={L2} />
      <g {...SW}>
        <rect x={66} y={62} width={16} height={26} rx={3} className={BACK} />
        <rect x={92} y={44} width={16} height={44} rx={3} className={FRONT} />
        <rect x={118} y={54} width={16} height={34} rx={3} className="fill-card stroke-primary" />
        <path d="M58 94 H142" className={LINE} />
      </g>
    </Frame>
  );
}

/** A circle with a tick, for nothing waiting on you. */
export function EmptyArtCaughtUp() {
  return (
    <Frame>
      <Shapes cx={100} cy={66} layers={L3} />
      <g {...SW}>
        <circle cx={100} cy={66} r={28} className={FRONT} />
        <path d="M87 67 L96 76 L115 55" className="fill-none stroke-foreground/75" strokeWidth={2.6} />
        <circle cx={126} cy={42} r={4.5} className="fill-card stroke-primary" />
      </g>
    </Frame>
  );
}
