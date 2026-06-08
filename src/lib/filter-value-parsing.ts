/** Shared parsers for SearchFilters slider / input values. */

export function parseFilterNumber(value: string | undefined | null): number | null {
  if (!value) return null;

  let raw = value;
  if (raw.includes('+')) {
    raw = raw.replace('+', '');
  }

  if (/[Kk]/.test(raw)) {
    return parseFloat(raw.replace(/[Kk]/g, '')) * 1_000;
  }
  if (/[Mm]/.test(raw)) {
    return parseFloat(raw.replace(/[Mm]/g, '')) * 1_000_000;
  }
  if (/[Bb]/.test(raw)) {
    return parseFloat(raw.replace(/[Bb]/g, '')) * 1_000_000_000;
  }

  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : null;
}

export function parseFilterDurationSeconds(value: string | undefined | null): number | null {
  if (!value) return null;

  const parts = value.split(':').map((part) => parseInt(part, 10));
  if (parts.length === 3 && parts.every((p) => !Number.isNaN(p))) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2 && parts.every((p) => !Number.isNaN(p))) {
    return parts[0] * 60 + parts[1];
  }

  if (value.includes('+')) {
    const n = parseFloat(value.replace(/\+/g, ''));
    return Number.isFinite(n) ? n : null;
  }

  const n = parseFloat(value);
  return Number.isFinite(n) ? n : null;
}

export function parseFilterMultiplier(value: string | undefined | null): number | null {
  if (!value) return null;

  const raw = value.includes('x') ? value.replace(/x/gi, '') : value;
  const cleaned = raw.replace('+', '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function isOpenEndedMax(value: string | undefined | null): boolean {
  return Boolean(value?.includes('+'));
}

/** Channel age filter min — "Brand new" → 0 years. */
export function parseChannelAgeMinYears(value: string | undefined | null): number | null {
  if (!value || value === 'Brand new') return 0;
  if (/years ago/i.test(value)) {
    const n = parseFloat(value.replace(/years ago/i, '').replace('+', '').trim());
    return Number.isFinite(n) ? n : null;
  }
  return parseFilterNumber(value);
}

/** Channel age filter max — "20 years ago+" → open-ended (null). */
export function parseChannelAgeMaxYears(value: string | undefined | null): number | null {
  if (!value || value === '20 years ago+') return null;
  if (/years ago/i.test(value)) {
    const n = parseFloat(value.replace(/years ago/i, '').replace('+', '').trim());
    return Number.isFinite(n) ? n : null;
  }
  return parseFilterNumber(value);
}

export function channelAgeInYears(publishedAt: Date | string): number {
  const created = new Date(publishedAt);
  return (Date.now() - created.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
}
