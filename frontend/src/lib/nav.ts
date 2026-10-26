/** A debate may only start when the visitor really asked for it from the home page.
 *  The picker leaves a one-time note in sessionStorage right before it navigates; the debate page
 *  reads and removes it. A refresh, the back button or a pasted link has no note, so those visits
 *  go to the home page instead of silently starting (and paying for) another debate. */
const KEY = "sd-debate-start";

let consumed: { href: string; allowed: boolean; at: number } | null = null;

export function markDebateStart() {
  try {
    sessionStorage.setItem(KEY, String(Date.now()));
  } catch {
    /* storage blocked: the debate page then allows the visit (see consumeDebateStart) */
  }
}

export function consumeDebateStart(): boolean {
  // React can run an effect twice in development; answer the same way both times.
  if (consumed && consumed.href === location.href && Date.now() - consumed.at < 1500) return consumed.allowed;
  let allowed: boolean;
  try {
    allowed = sessionStorage.getItem(KEY) !== null;
    sessionStorage.removeItem(KEY);
  } catch {
    allowed = true; // cannot tell, so do not break the page
  }
  consumed = { href: location.href, allowed, at: Date.now() };
  return allowed;
}
