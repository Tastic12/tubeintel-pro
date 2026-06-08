import type { ChannelMeta } from '@/lib/apply-video-filters';
import type { Competitor, Video } from '@/types';

/** Build channel metadata from a saved video's stored channel snapshot. */
export function getChannelMetaFromVideo(video: Video): ChannelMeta | null {
  if (!video.channelId && !video.channelName) return null;

  return {
    name: video.channelName || '',
    youtubeId: video.channelId,
    subscriberCount: video.channelSubscriberCount ?? 0,
    videoCount: video.channelVideoCount ?? 0,
    viewCount: video.channelViewCount ?? 0,
    publishedAt: video.channelPublishedAt ?? null,
  };
}

/** Build channel metadata from a tracked competitor row. */
export function getChannelMetaFromCompetitor(competitor: Competitor): ChannelMeta {
  return {
    name: competitor.name,
    youtubeId: competitor.youtubeId,
    subscriberCount: competitor.subscriberCount,
    videoCount: competitor.videoCount,
    viewCount: competitor.viewCount,
    publishedAt: competitor.publishedAt ?? null,
  };
}
