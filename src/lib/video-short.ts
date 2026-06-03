import { Video } from '@/types';
import { classifyAsShort, hasShortsHashtag, isShortDuration } from '@/lib/classify-short';

export { isShortDuration, classifyAsShort };

/** Parse ISO 8601 duration (e.g. PT1M30S) to total seconds. */
export function parseDurationSeconds(durationIso: string | null | undefined): number | null {
  if (!durationIso) return null;
  if (/PT\d+H/.test(durationIso)) {
    const hours = parseInt(durationIso.match(/PT(\d+)H/)?.[1] ?? '0', 10);
    const minutes = parseInt(durationIso.match(/(\d+)M/)?.[1] ?? '0', 10);
    const seconds = parseInt(durationIso.match(/(\d+)S/)?.[1] ?? '0', 10);
    return hours * 3600 + minutes * 60 + seconds;
  }
  const minutes = parseInt(durationIso.match(/(\d+)M/)?.[1] ?? '0', 10);
  const seconds = parseInt(durationIso.match(/(\d+)S/)?.[1] ?? '0', 10);
  const total = minutes * 60 + seconds;
  return total > 0 ? total : null;
}

/** Portrait thumbnail, duration under 60s, or #shorts tag when metadata is sparse. */
export function isYouTubeShort(video: Video): boolean {
  if (
    classifyAsShort({
      durationIso: video.durationIso,
      thumbnailWidth: video.thumbnailWidth,
      thumbnailHeight: video.thumbnailHeight,
    })
  ) {
    return true;
  }

  const hasThumbDims =
    (video.thumbnailWidth ?? 0) > 0 && (video.thumbnailHeight ?? 0) > 0;

  if (!hasThumbDims && parseDurationSeconds(video.durationIso) == null) {
    return hasShortsHashtag(video.title, video.description);
  }

  return false;
}

export function filterVideosByShortsPreference(
  videos: Video[],
  hideShorts: boolean
): Video[] {
  if (!hideShorts) return videos;
  return videos.filter((video) => !isYouTubeShort(video));
}
