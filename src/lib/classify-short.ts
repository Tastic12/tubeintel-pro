/** Portrait Shorts-style thumbnail (typically 9:16). */
export const SHORT_THUMB_RATIO_MIN = 1.15;

/**
 * YouTube Shorts now allow up to 3 minutes. Treat anything at or below this as short-form
 * when Hide Shorts is on (sports clips, vertical uploads, cross-posted Shorts, etc.).
 */
export const MAX_SHORT_FORM_DURATION_SEC = 180;

/** Parse ISO 8601 duration to total seconds (no hours component). */
export function parseDurationSecondsFromIso(
  durationIso: string | null | undefined
): number | null {
  if (!durationIso) return null;
  if (/PT\d+H/.test(durationIso)) return null;

  const minutes = parseInt(durationIso.match(/(\d+)M/)?.[1] ?? '0', 10);
  const seconds = parseInt(durationIso.match(/(\d+)S/)?.[1] ?? '0', 10);
  const total = minutes * 60 + seconds;
  return total > 0 ? total : null;
}

/** Matches SQL public.is_short_duration — up to 3 minutes, no hours component. */
export function isShortDuration(durationIso: string | null | undefined): boolean {
  const total = parseDurationSecondsFromIso(durationIso);
  return total != null && total <= MAX_SHORT_FORM_DURATION_SEC;
}

export type ClassifyShortInput = {
  durationIso?: string | null;
  thumbnailWidth?: number | null;
  thumbnailHeight?: number | null;
};

function isPortraitThumbnail(width: number, height: number): boolean {
  return width > 0 && height > 0 && height / width > SHORT_THUMB_RATIO_MIN;
}

/**
 * Matches SQL public.classify_as_short.
 * Duration up to 3m always wins (YouTube often serves 16:9 thumbs for Shorts).
 * Portrait thumbnail is a secondary signal when duration is missing.
 */
export function classifyAsShort(input: ClassifyShortInput): boolean {
  if (isShortDuration(input.durationIso)) return true;

  const w = input.thumbnailWidth ?? 0;
  const h = input.thumbnailHeight ?? 0;

  if (isPortraitThumbnail(w, h)) {
    return true;
  }

  return false;
}

export function hasShortsHashtag(title?: string | null, description?: string | null): boolean {
  const t = (title ?? '').toLowerCase();
  const d = (description ?? '').toLowerCase();
  return (
    t.includes('#shorts') ||
    t.includes('#short') ||
    d.includes('#shorts') ||
    d.includes('#short')
  );
}
