const CHANNEL_ID_RE = /^UC[\w-]{22}$/;

/** True when value is already a YouTube channel ID (UC + 22 chars). */
export function isYoutubeChannelId(value: string): boolean {
  return CHANNEL_ID_RE.test(value.trim());
}

function normalizeInput(raw: string): string {
  return raw.trim().replace(/\s+/g, '');
}

/**
 * Parse channel ID from pasted text without calling the API.
 * Supports raw UC… IDs and youtube.com/channel/UC… URLs.
 */
export function tryParseChannelIdLocally(input: string): string | null {
  const trimmed = normalizeInput(input);
  if (!trimmed) return null;
  if (isYoutubeChannelId(trimmed)) return trimmed;

  const withProtocol = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(withProtocol);
    const host = url.hostname.replace(/^www\./, '');
    if (host !== 'youtube.com' && host !== 'm.youtube.com') return null;

    const parts = url.pathname.split('/').filter(Boolean);
    const channelIdx = parts.indexOf('channel');
    if (channelIdx !== -1 && parts[channelIdx + 1]) {
      const id = parts[channelIdx + 1].split('?')[0];
      if (isYoutubeChannelId(id)) return id;
    }
  } catch {
    // Not a URL — fall through.
  }

  return null;
}

/** Extract @handle from URL or bare @handle / handle string. */
export function tryParseHandleLocally(input: string): string | null {
  const trimmed = normalizeInput(input);
  if (!trimmed) return null;

  if (trimmed.startsWith('@')) {
    const handle = trimmed.slice(1).split('/')[0];
    return handle || null;
  }

  const withProtocol = trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;

  try {
    const url = new URL(withProtocol);
    const host = url.hostname.replace(/^www\./, '');
    if (host !== 'youtube.com' && host !== 'm.youtube.com') return null;

    const match = url.pathname.match(/^\/@([^/]+)/);
    if (match?.[1]) return match[1];
  } catch {
    // Not a URL.
  }

  return null;
}

/**
 * Resolve any supported channel input to a UC… channel ID.
 * Local parse first (free), then one cheap API lookup for @handles / legacy URLs.
 */
export async function resolveYoutubeChannelInput(input: string): Promise<string> {
  const trimmed = normalizeInput(input);
  if (!trimmed) {
    throw new Error('Please enter a YouTube channel URL, @handle, or channel ID.');
  }

  const localId = tryParseChannelIdLocally(trimmed);
  if (localId) return localId;

  const response = await fetch(
    `/api/youtube/resolve-channel?input=${encodeURIComponent(trimmed)}`
  );

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(
      body?.error || 'Could not find that channel. Check the URL or ID and try again.'
    );
  }

  const data = (await response.json()) as { channelId?: string };
  if (!data.channelId || !isYoutubeChannelId(data.channelId)) {
    throw new Error('Could not resolve a valid YouTube channel ID.');
  }

  return data.channelId;
}
