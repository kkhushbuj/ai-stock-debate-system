import type { ReactNode } from "react";

/** Safe renderer for AI text: paragraphs, bullet lists, **bold**, `code`.
 *  React escapes everything, so stray < & $ in model output can't break the layout. */

function clean(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\s*\([a-z]+(?:_[a-z0-9]+)+\)/g, "")
    .trim();
}

function inline(input: string, key: string): ReactNode[] {
  // A reply that is still streaming can end in the middle of **bold**. Close it for display so the
  // words show as bold at once instead of flashing as raw asterisks.
  const s = (input.match(/\*\*/g) || []).length % 2 === 1 ? input + "**" : input;
  const out: ReactNode[] = [];
  const re = /(\*\*(.+?)\*\*)|(`([^`]+)`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(s))) {
    if (m.index > last) out.push(s.slice(last, m.index));
    if (m[2] !== undefined) out.push(<strong key={`${key}-b${i++}`}>{m[2]}</strong>);
    else out.push(<code key={`${key}-c${i++}`} className="num">{m[4]}</code>);
    last = m.index + m[0].length;
  }
  if (last < s.length) out.push(s.slice(last));
  return out;
}

/** Splits text into word spans that fade in one after another. */
function typed(nodes: ReactNode[], counter: { n: number }): ReactNode[] {
  const out: ReactNode[] = [];
  nodes.forEach((node, k) => {
    if (typeof node !== "string") {
      out.push(node);
      return;
    }
    node.split(/(\s+)/).forEach((tok, t) => {
      if (!tok) return;
      if (/^\s+$/.test(tok)) out.push(tok);
      else out.push(<span key={`w${k}-${t}-${counter.n}`} className="w" style={{ ["--i" as string]: counter.n++ }}>{tok}</span>);
    });
  });
  return out;
}

export function Rich({ text, typing = false }: { text: string; typing?: boolean }) {
  const counter = { n: 0 };
  const blocks = clean(text || "").split(/\n\s*\n/);
  return (
    <div className="prose-ai">
      {blocks.map((block, bi) => {
        const lines = block.split("\n").map((l) => l.trimEnd()).filter((l) => l.trim());
        if (!lines.length) return null;
        const render = (s: string, key: string) => {
          const nodes = inline(s, key);
          return typing ? typed(nodes, counter) : nodes;
        };
        // A line is a bullet if it starts with "-", "*" or "•", even when that mark is all there is so far
        // (the moment a new bullet starts streaming). Lines before the first bullet are normal text; lines
        // after it that are not bullets continue the previous bullet. The layout therefore never flips
        // between "text" and "list" as new letters arrive.
        const isBullet = (l: string) => /^\s*[-*•](\s|$)/.test(l);
        const firstBullet = lines.findIndex(isBullet);
        const textLines = firstBullet === -1 ? lines : lines.slice(0, firstBullet);
        const items: string[] = [];
        if (firstBullet !== -1) {
          for (const l of lines.slice(firstBullet)) {
            if (isBullet(l)) items.push(l.replace(/^\s*[-*•]\s?/, ""));
            else items[items.length - 1] += " " + l.trim();
          }
        }
        return (
          <div key={bi}>
            {textLines.length > 0 && (
              <p>
                {textLines.map((l, li) => (
                  <span key={li}>
                    {li > 0 && <br />}
                    {render(l, `${bi}-${li}`)}
                  </span>
                ))}
              </p>
            )}
            {items.length > 0 && (
              <ul>
                {items.map((t, li) => (
                  <li key={li}>{render(t, `${bi}-i${li}`)}</li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function plain(text: string): string {
  return clean(text).replace(/[*`#]/g, "").replace(/\s+/g, " ").trim();
}
