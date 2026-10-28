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

/** The doors that close over the home page right before the debate page loads. They stay shut across the
 *  page change, so the visitor never sees a bare cut or an empty page. The debate page takes them over with
 *  its own doors (releaseDoors) and opens them. */
let cover: HTMLElement | null = null;

export function closeDoors(): Promise<void> {
  if (typeof document === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return Promise.resolve();
  releaseDoors();
  const el = document.createElement("div");
  el.className = "dv-cover";
  el.setAttribute("aria-hidden", "true");
  el.innerHTML = '<div class="dv-a"></div><div class="dv-b"></div>';
  document.body.appendChild(el);
  cover = el;
  const opts: KeyframeAnimationOptions = { duration: 520, easing: "cubic-bezier(.76,0,.24,1)", fill: "forwards" };
  const [l, r] = Array.from(el.children) as HTMLElement[];
  l.animate([{ transform: "translateX(-100%)" }, { transform: "translateX(0)" }], opts);
  const done = r.animate([{ transform: "translateX(100%)" }, { transform: "translateX(0)" }], opts).finished;
  setTimeout(releaseDoors, 8000); // safety net: never leave the screen covered
  return done.then(() => undefined, () => undefined);
}

export function releaseDoors() {
  cover?.remove();
  cover = null;
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
