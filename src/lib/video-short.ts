import { Video } from '@/types';

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

/** True when video is a YouTube Short (< 60s) or tagged as #shorts. */
export function isYouTubeShort(video: Video): boolean {
  const seconds = parseDurationSeconds(video.durationIso);
  if (seconds != null) {
    return seconds > 0 && seconds < 60;
  }

  const title = video.title.toLowerCase();
  const description = (video.description ?? '').toLowerCase();
  return (
    title.includes('#shorts') ||
    title.includes('#short') ||
    description.includes('#shorts') ||
    description.includes('#short')
  );
}

export function filterVideosByShortsPreference(
  videos: Video[],
  hideShorts: boolean
): Video[] {
  if (!hideShorts) return videos;
  return videos.filter((video) => !isYouTubeShort(video));
}
