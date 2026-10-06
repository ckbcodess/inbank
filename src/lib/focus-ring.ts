/**
 * When a modal closes, the dialog hands focus back to the control that opened it. If the person was typing in
 * the modal (a PIN, say) the browser counts that as keyboard use and draws the focus ring on that control, as if
 * they had tabbed to it. This hides the ring until they actually move with the keyboard (Tab or an arrow key)
 * or use the pointer. Focus itself still returns, so a keyboard user never loses their place.
 */

const ATTR = "data-hide-focus-ring";
let listening = false;

function show() {
  document.documentElement.removeAttribute(ATTR);
  document.removeEventListener("keydown", onKey, true);
  document.removeEventListener("pointerdown", show, true);
  listening = false;
}

function onKey(e: KeyboardEvent) {
  if (e.key === "Tab" || e.key.startsWith("Arrow")) show();
}

export function hideFocusRingUntilNextMove() {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute(ATTR, "");
  if (listening) return;
  listening = true;
  document.addEventListener("keydown", onKey, true);
  document.addEventListener("pointerdown", show, true);
}
