/** Pick the best YouTube thumbnail URL plus dimensions from a snippet.thumbnails object. */
export type ThumbnailPick = {
  url: string | undefined;
  width: number | null;
  height: number | null;
};

type ThumbVariant = { url?: string; width?: number; height?: number };

export function pickThumbnailFromYoutube(
  thumbnails:
    | {
        maxres?: ThumbVariant;
        standard?: ThumbVariant;
        high?: ThumbVariant;
        medium?: ThumbVariant;
        default?: ThumbVariant;
      }
    | undefined
    | null
): ThumbnailPick {
  if (!thumbnails) return { url: undefined, width: null, height: null };

  const candidates = [
    thumbnails.maxres,
    thumbnails.standard,
    thumbnails.high,
    thumbnails.medium,
    thumbnails.default,
  ].filter((t): t is ThumbVariant => !!t?.url);

  if (!candidates.length) return { url: undefined, width: null, height: null };

  let best = candidates[0];
  let bestArea = (best.width ?? 0) * (best.height ?? 0);

  for (const c of candidates) {
    const area = (c.width ?? 0) * (c.height ?? 0);
    if (area > bestArea) {
      best = c;
      bestArea = area;
    }
  }

  return {
    url: best.url,
    width: best.width ?? null,
    height: best.height ?? null,
  };
}
