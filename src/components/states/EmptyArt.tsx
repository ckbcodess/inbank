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
    <svg viewBox="0 0 200 132" width={290} height={191} aria-hidden="true" className="mx-auto h-auto max-w-full">
      {children}
    </svg>
  );
}

const OBJECT = "fill-card stroke-foreground/55";

const CARD_LAYERS: Layer[] = [
  { b: "a", scale: 1.35, rotate: 0, opacity: 0.14 },
  { b: "b", scale: 1.05, rotate: 38, opacity: 0.28 },
  { b: "a", scale: 0.72, rotate: -28, opacity: 0.55 },
];
const ACTIVITY_LAYERS: Layer[] = [
  { b: "b", scale: 1.3, rotate: 20, opacity: 0.14 },
  { b: "a", scale: 1.0, rotate: -35, opacity: 0.28 },
  { b: "b", scale: 0.7, rotate: 50, opacity: 0.55 },
];

/** Two cards, one fanned behind the other, for the empty Cards page. */
export function EmptyArtCards() {
  return (
    <Frame>
      <Shapes cx={100} cy={68} layers={CARD_LAYERS} />
      <g transform="translate(92 62) rotate(-11)" strokeWidth={1.6} strokeLinejoin="round">
        <rect x={-36} y={-22} width={72} height={44} rx={7} className={OBJECT} />
      </g>
      <g transform="translate(106 72) rotate(6)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <rect x={-36} y={-22} width={72} height={44} rx={7} className="fill-card stroke-foreground/75" />
        <rect x={-27} y={-12} width={15} height={11} rx={2.5} className="fill-card stroke-primary" />
        <path d="M-27 10 H-2" className="fill-none stroke-foreground/45" />
        <path d="M10 10 H27" className="fill-none stroke-foreground/45" />
      </g>
    </Frame>
  );
}

/** A receipt with a few lines on it, for the empty transactions list. */
export function EmptyArtActivity() {
  return (
    <Frame>
      <Shapes cx={100} cy={66} layers={ACTIVITY_LAYERS} />
      <g transform="translate(100 66) rotate(-4)" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
        <path
          d="M-26 -38 H26 V36 L20 31 L13 36 L6.5 31 L0 36 L-6.5 31 L-13 36 L-20 31 L-26 36 Z"
          className="fill-card stroke-foreground/75"
        />
        <circle cx={-15} cy={-25} r={5} className="fill-card stroke-primary" />
        <path d="M-5 -25 H14" className="fill-none stroke-foreground/45" />
        <path d="M-17 -9 H5 M13 -9 H17" className="fill-none stroke-foreground/45" />
        <path d="M-17 3 H-1 M9 3 H17" className="fill-none stroke-foreground/45" />
        <path d="M-17 15 H9 M13 15 H17" className="fill-none stroke-foreground/45" />
      </g>
    </Frame>
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

/** A phone and a card, for no linked cards or wallets. */
export function EmptyArtSources() {
  return (
    <Frame>
      <Shapes cx={100} cy={66} layers={L2} />
      <g transform="translate(116 60) rotate(9)" {...SW}>
        <rect x={-15} y={-26} width={30} height={52} rx={6} className={BACK} />
        <path d="M-5 -19 H5" className={LINE} />
        <circle cx={0} cy={17} r={2.2} className="fill-card stroke-primary" />
      </g>
      <g transform="translate(86 74) rotate(-9)" {...SW}>
        <rect x={-31} y={-20} width={62} height={40} rx={7} className={FRONT} />
        <rect x={-23} y={-11} width={13} height={10} rx={2.5} className="fill-card stroke-primary" />
        <path d="M-23 9 H-4" className={LINE} />
      </g>
    </Frame>
  );
}

/** Two people, for no saved people or billers. */
export function EmptyArtPeople() {
  return (
    <Frame>
      <Shapes cx={100} cy={66} layers={L3} />
      <g {...SW}>
        <circle cx={118} cy={52} r={9} className={BACK} />
        <path d="M100 88 C100 74 108 68 118 68 C128 68 136 74 136 88 Z" className={BACK} />
        <circle cx={86} cy={50} r={10} className="fill-card stroke-primary" />
        <path d="M66 90 C66 74 75 66 86 66 C97 66 106 74 106 90 Z" className={FRONT} />
      </g>
    </Frame>
  );
}

/** Three people, for no payment groups. */
export function EmptyArtGroups() {
  return (
    <Frame>
      <Shapes cx={100} cy={66} layers={L4} />
      <g {...SW}>
        <circle cx={72} cy={62} r={7} className={BACK} />
        <path d="M58 86 C58 76 64 71 72 71 C80 71 86 76 86 86 Z" className={BACK} />
        <circle cx={128} cy={62} r={7} className={BACK} />
        <path d="M114 86 C114 76 120 71 128 71 C136 71 142 76 142 86 Z" className={BACK} />
        <circle cx={100} cy={52} r={9} className="fill-card stroke-primary" />
        <path d="M82 90 C82 76 90 68 100 68 C110 68 118 76 118 90 Z" className={FRONT} />
      </g>
    </Frame>
  );
}

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
