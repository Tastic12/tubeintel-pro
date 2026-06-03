/** Portrait Shorts-style thumbnail (typically 9:16). */
export const SHORT_THUMB_RATIO_MIN = 1.15;

/** Landscape 16:9 or wider — treat as long-form. */
export const LONG_FORM_THUMB_RATIO_MAX = 1.05;

/** Matches SQL public.is_short_duration. */
export function isShortDuration(durationIso: string | null | undefined): boolean {
  if (!durationIso) return false;
  if (/PT\d+H/.test(durationIso)) return false;

  const minutes = parseInt(durationIso.match(/(\d+)M/)?.[1] ?? '0', 10);
  const seconds = parseInt(durationIso.match(/(\d+)S/)?.[1] ?? '0', 10);
  const total = minutes * 60 + seconds;
  return total > 0 && total < 60;
}

export type ClassifyShortInput = {
  durationIso?: string | null;
  thumbnailWidth?: number | null;
  thumbnailHeight?: number | null;
};

/**
 * Matches SQL public.classify_as_short — portrait thumbnail OR duration under 60s.
 */
export function classifyAsShort(input: ClassifyShortInput): boolean {
  const w = input.thumbnailWidth ?? 0;
  const h = input.thumbnailHeight ?? 0;

  if (w > 0 && h > 0) {
    const ratio = h / w;
    if (ratio > SHORT_THUMB_RATIO_MIN) return true;
    if (ratio <= LONG_FORM_THUMB_RATIO_MAX) return false;
  }

  return isShortDuration(input.durationIso);
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
