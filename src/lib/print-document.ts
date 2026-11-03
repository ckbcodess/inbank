/**
 * Hand a finished HTML document to the browser's print dialog, where "Save as PDF" is one of the destinations. It prints
 * from a hidden frame so the page itself is untouched. Returns false when the frame could not be made.
 */
export function printDocument(html: string): boolean {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;";
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  if (!doc || !frame.contentWindow) {
    frame.remove();
    return false;
  }
  doc.open();
  doc.write(html);
  doc.close();
  const win = frame.contentWindow;
  win.onafterprint = () => frame.remove();
  setTimeout(() => win.print(), 150);
  return true;
}

export const escapeHtml = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
