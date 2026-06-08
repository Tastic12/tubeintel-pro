import { SHORT_THUMB_RATIO_MIN } from '@/lib/classify-short';

/** Pick the best YouTube thumbnail URL plus dimensions from a snippet.thumbnails object. */
export type ThumbnailPick = {
  url: string | undefined;
  width: number | null;
  height: number | null;
};

export type YoutubeThumbnails = {
  maxres?: ThumbVariant;
  standard?: ThumbVariant;
  high?: ThumbVariant;
  medium?: ThumbVariant;
  default?: ThumbVariant;
};

type ThumbVariant = { url?: string; width?: number; height?: number };

/** Best portrait variant for short-form classification (scans all API sizes). */
export function pickPortraitClassificationDims(
  thumbnails: YoutubeThumbnails | undefined | null
): { width: number; height: number } | null {
  if (!thumbnails) return null;

  const candidates = [
    thumbnails.maxres,
    thumbnails.standard,
    thumbnails.high,
    thumbnails.medium,
    thumbnails.default,
  ];

  let best: { width: number; height: number; ratio: number } | null = null;

  for (const variant of candidates) {
    const w = variant?.width ?? 0;
    const h = variant?.height ?? 0;
    if (w <= 0 || h <= 0) continue;

    const ratio = h / w;
    if (ratio <= SHORT_THUMB_RATIO_MIN) continue;

    if (!best || ratio > best.ratio) {
      best = { width: w, height: h, ratio };
    }
  }

  return best ? { width: best.width, height: best.height } : null;
}

export function pickThumbnailFromYoutube(
  thumbnails: YoutubeThumbnails | undefined | null
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
