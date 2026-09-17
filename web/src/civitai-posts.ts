import type { CivitaiPost } from "./api.js";

/**
 * Appends a page of posts to the ones already shown.
 *
 * Posts come from the server as a page of someone's pictures grouped by post,
 * and the catalogue pages pictures, not posts — so a post with many pictures can
 * end one page and continue on the next, arriving as two posts with one id. The
 * continuation is folded into the post already on screen rather than shown as a
 * second card. Any other repeat (a cursor that shifted under us) is dropped.
 */
export function mergeCivitaiPosts(have: CivitaiPost[], page: CivitaiPost[]): CivitaiPost[] {
  if (have.length === 0) return page.slice();
  const out = have.slice();
  const seen = new Set(have.map((p) => p.id));
  for (const post of page) {
    if (!seen.has(post.id)) {
      seen.add(post.id);
      out.push(post);
      continue;
    }
    const last = out[out.length - 1];
    if (last.id === post.id) {
      const known = new Set(last.images.map((i) => i.id));
      out[out.length - 1] = { ...last, images: [...last.images, ...post.images.filter((i) => !known.has(i.id))] };
    }
  }
  return out;
}

/** When a post was made, for its card; "" when the feed did not say. */
export function postDate(post: CivitaiPost): string {
  const iso = post.createdAt ?? post.images[0]?.createdAt ?? "";
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}
