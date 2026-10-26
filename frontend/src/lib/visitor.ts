/** A random id for THIS visit (this browser tab). The API stores it with each debate, so a visitor only
 *  ever sees the debates from their own session.
 *
 *  It lives in sessionStorage on purpose: refreshing the page keeps it, but closing the tab, opening the
 *  site in a new tab or window, or coming back later gives a brand-new id and therefore an empty history. */
const KEY = "sd-visitor-session";

let memory = "";

function makeId(): string {
  try {
    return crypto.randomUUID();
  } catch {
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }
}

export function getVisitorId(): string {
  if (typeof window === "undefined") return "";
  try {
    let id = sessionStorage.getItem(KEY);
    if (!id) {
      id = makeId();
      sessionStorage.setItem(KEY, id);
    }
    // Older versions kept a permanent id in localStorage. Remove it so nothing links visits together.
    localStorage.removeItem("sd-visitor");
    return id;
  } catch {
    // Storage blocked: keep an id for this page load only.
    if (!memory) memory = makeId();
    return memory;
  }
}
