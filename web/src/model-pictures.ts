import type { CivitaiImage, CivitaiModel } from "./api.js";

// The pictures a checkpoint or LoRA's cover can be changed to, from its Civitai page:
// the creator's own showcase, and what everyone else posted made with it — the
// pictures under the model's reviews and comments, which on Civitai are the same feed.

/**
 * The creator's showcase, the linked version's first and then the other versions'.
 * Each picture once: versions often share their showcase.
 */
export function creatorPictures(model: CivitaiModel | null, versionId: number): string[] {
  if (!model) return [];
  const ordered = [...model.versions].sort((a, b) => (a.id === versionId ? -1 : b.id === versionId ? 1 : 0));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of ordered) {
    for (const url of v.images) {
      if (url && !seen.has(url)) {
        seen.add(url);
        out.push(url);
      }
    }
  }
  return out;
}

/**
 * Another page of the community feed added to what is shown: the creator's own posts
 * left out (they are the other tab), and nothing twice — the feed's pages overlap when
 * someone posts while it is being read.
 */
export function addCommunityPage(shown: CivitaiImage[], page: CivitaiImage[], creator?: string): CivitaiImage[] {
  const who = creator?.trim().toLowerCase() ?? "";
  const seen = new Set(shown.map((i) => i.id));
  const fresh = page.filter((i) => {
    if (seen.has(i.id) || !i.url) return false;
    seen.add(i.id);
    return !who || (i.username ?? "").toLowerCase() !== who;
  });
  return [...shown, ...fresh];
}
