import type { SearchFiltersResult } from '@/components/SearchFilters';
import type { Competitor, Video } from '@/types';
import { calculateOutlierScore } from '@/services/metrics/outliers';
import { parseDurationSeconds } from '@/lib/video-short';
import {
  channelAgeInYears,
  isOpenEndedMax,
  parseChannelAgeMaxYears,
  parseChannelAgeMinYears,
  parseFilterDurationSeconds,
  parseFilterMultiplier,
  parseFilterNumber,
} from '@/lib/filter-value-parsing';

export type ChannelMeta = Pick<
  Competitor,
  'name' | 'youtubeId' | 'subscriberCount' | 'videoCount' | 'viewCount'
> & {
  publishedAt?: Date | string | null;
};

export type VideoFilterOptions = {
  /** Resolve channel stats for a video (competitor folders). Omit for saved-video collections. */
  getChannelForVideo?: (video: Video) => ChannelMeta | null | undefined;
  /** Full pool used for per-channel median / multiplier context. */
  comparisonPool?: Video[];
};

function getMedian(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function channelMedianViews(pool: Video[], channelId: string): number {
  const views = pool
    .filter((v) => v.channelId === channelId)
    .map((v) => v.viewCount);
  return getMedian(views);
}

function matchesChannelList(
  video: Video,
  channel: ChannelMeta | null | undefined,
  list: string
): boolean {
  const tokens = list
    .split(/[\s,]+/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
  if (!tokens.length) return true;

  const haystack = [
    channel?.name,
    channel?.youtubeId,
    video.channelId,
    video.title,
  ]
    .filter(Boolean)
    .map((s) => String(s).toLowerCase());

  return tokens.some((token) => haystack.some((h) => h.includes(token)));
}

function matchesKeywords(
  video: Video,
  include: string,
  exclude: string
): boolean {
  if (include.trim()) {
    const keywords = include.split(/[\s,]+/).filter(Boolean);
    if (
      keywords.length &&
      !keywords.some(
        (kw) =>
          video.title.toLowerCase().includes(kw.toLowerCase()) ||
          video.description.toLowerCase().includes(kw.toLowerCase())
      )
    ) {
      return false;
    }
  }

  if (exclude.trim()) {
    const keywords = exclude.split(/[\s,]+/).filter(Boolean);
    if (
      keywords.some(
        (kw) =>
          video.title.toLowerCase().includes(kw.toLowerCase()) ||
          video.description.toLowerCase().includes(kw.toLowerCase())
      )
    ) {
      return false;
    }
  }

  return true;
}

function passesDateRange(
  video: Video,
  filters: SearchFiltersResult
): boolean {
  const videoDate = new Date(video.publishedAt);

  if (filters.timeRange && filters.timeRange !== 'All Time' && filters.timeRange !== 'Custom') {
    const now = new Date();
    const start = new Date(now);

    switch (filters.timeRange) {
      case '30 Days':
        start.setDate(now.getDate() - 30);
        break;
      case '90 Days':
        start.setDate(now.getDate() - 90);
        break;
      case '180 Days':
        start.setDate(now.getDate() - 180);
        break;
      case '365 Days':
        start.setDate(now.getDate() - 365);
        break;
      case '3 Years':
        start.setFullYear(now.getFullYear() - 3);
        break;
      default:
        break;
    }

    start.setHours(0, 0, 0, 0);
    if (videoDate < start) return false;
    return true;
  }

  const useCustomRange =
    filters.timeRange === 'Custom' ||
    (filters.whenPosted && Boolean(filters.startDate && filters.endDate));

  if (useCustomRange && filters.startDate && filters.endDate) {
    const start = new Date(filters.startDate);
    const end = new Date(filters.endDate);
    end.setHours(23, 59, 59, 999);
    if (videoDate < start || videoDate > end) return false;
  }

  return true;
}

function inNumericRange(
  value: number,
  minRaw: string | undefined,
  maxRaw: string | undefined,
  defaultMin: string,
  defaultMax: string
): boolean {
  const min = parseFilterNumber(minRaw);
  const max = parseFilterNumber(maxRaw);

  if (minRaw && minRaw !== defaultMin && min != null && value < min) return false;
  if (maxRaw && maxRaw !== defaultMax && !isOpenEndedMax(maxRaw) && max != null && value > max) {
    return false;
  }

  return true;
}

export function applyVideoSearchFilters(
  videos: Video[],
  filters: SearchFiltersResult | null | undefined,
  options: VideoFilterOptions = {}
): Video[] {
  if (!filters) return videos;

  const pool = options.comparisonPool ?? videos;
  const adv = filters.advancedFilters;

  return videos.filter((video) => {
    const channel = options.getChannelForVideo?.(video) ?? null;

    // Views
    if (
      !inNumericRange(video.viewCount, filters.viewsMin, filters.viewsMax, '0', '1M+')
    ) {
      return false;
    }

    // Subscribers (channel-level — skipped when channel stats unavailable)
    if (channel) {
      if (
        !inNumericRange(
          channel.subscriberCount,
          filters.subscribersMin,
          filters.subscribersMax,
          '0',
          '1M+'
        )
      ) {
        return false;
      }
    }

    // Video duration
    const durationSec = parseDurationSeconds(video.durationIso);
    if (durationSec != null) {
      const minDur = parseFilterDurationSeconds(filters.videoDurationMin);
      const maxDur = parseFilterDurationSeconds(filters.videoDurationMax);
      if (
        filters.videoDurationMin &&
        filters.videoDurationMin !== '00:00:00' &&
        minDur != null &&
        durationSec < minDur
      ) {
        return false;
      }
      if (
        filters.videoDurationMax &&
        filters.videoDurationMax !== '07:00:00+' &&
        !isOpenEndedMax(filters.videoDurationMax) &&
        maxDur != null &&
        durationSec > maxDur
      ) {
        return false;
      }
    }

    // Multiplier / outlier score
    const multiplier = calculateOutlierScore(video, pool).xFactor;
    const minMult = parseFilterMultiplier(filters.multiplierMin);
    const maxMult = parseFilterMultiplier(filters.multiplierMax);
    if (
      filters.multiplierMin &&
      filters.multiplierMin !== '0.0x' &&
      minMult != null &&
      multiplier < minMult
    ) {
      return false;
    }
    if (
      filters.multiplierMax &&
      filters.multiplierMax !== '100.0x+' &&
      !isOpenEndedMax(filters.multiplierMax) &&
      maxMult != null &&
      multiplier > maxMult
    ) {
      return false;
    }

    // Date / when posted
    if (!passesDateRange(video, filters)) return false;

    // Likes & comments
    if (
      !inNumericRange(
        video.likeCount,
        adv.videoLikesMin,
        adv.videoLikesMax,
        '0',
        '1M+'
      )
    ) {
      return false;
    }
    if (
      !inNumericRange(
        video.commentCount,
        adv.videoCommentsMin,
        adv.videoCommentsMax,
        '0',
        '100K+'
      )
    ) {
      return false;
    }

    // Views : subs ratio
    if (channel && channel.subscriberCount > 0) {
      const ratio = video.viewCount / channel.subscriberCount;
      if (
        !inNumericRange(
          ratio,
          adv.viewsToSubsRatioMin,
          adv.viewsToSubsRatioMax,
          '0.0',
          '50.0+'
        )
      ) {
        return false;
      }
    }

    // Median views (per channel within pool)
    const median = channelMedianViews(pool, video.channelId);
    if (
      !inNumericRange(median, adv.medianViewsMin, adv.medianViewsMax, '0', '10M+')
    ) {
      return false;
    }

    // Channel totals (when known)
    if (channel) {
      if (
        !inNumericRange(
          channel.viewCount,
          adv.channelTotalViewsMin,
          adv.channelTotalViewsMax,
          '0',
          '1B+'
        )
      ) {
        return false;
      }
      if (
        !inNumericRange(
          channel.videoCount,
          adv.channelVideoCountMin,
          adv.channelVideoCountMax,
          '0',
          '1k+'
        )
      ) {
        return false;
      }
    }

    // Engagement rate %
    if (video.viewCount > 0) {
      const engagement = ((video.likeCount + video.commentCount) / video.viewCount) * 100;
      if (
        !inNumericRange(
          engagement,
          adv.engagementRateMin,
          adv.engagementRateMax,
          '0',
          '20+'
        )
      ) {
        return false;
      }
    }

    // Channel age (years since channel was created)
    if (channel?.publishedAt) {
      const ageYears = channelAgeInYears(channel.publishedAt);
      const minAge = parseChannelAgeMinYears(adv.channelAgeMin);
      const maxAge = parseChannelAgeMaxYears(adv.channelAgeMax);

      if (
        adv.channelAgeMin !== 'Brand new' &&
        minAge != null &&
        ageYears < minAge
      ) {
        return false;
      }
      if (
        adv.channelAgeMax !== '20 years ago+' &&
        !isOpenEndedMax(adv.channelAgeMax) &&
        maxAge != null &&
        ageYears > maxAge
      ) {
        return false;
      }
    }

    // Include / exclude channels
    if (adv.includeChannels && !matchesChannelList(video, channel, adv.includeChannels)) {
      return false;
    }
    if (adv.excludeChannels && matchesChannelList(video, channel, adv.excludeChannels)) {
      return false;
    }

    // Keywords
    if (!matchesKeywords(video, adv.includeKeywords, adv.excludeKeywords)) {
      return false;
    }

    return true;
  });
}

/** Count non-default active filters for the badge on the filter button. */
export function countActiveVideoFilters(
  filters: SearchFiltersResult | null | undefined
): number {
  if (!filters) return 0;

  let count = 0;
  const adv = filters.advancedFilters;

  if (filters.timeRange && filters.timeRange !== 'All Time') count++;
  if (filters.viewsMin !== '0') count++;
  if (filters.viewsMax !== '1M+') count++;
  if (filters.subscribersMin !== '0') count++;
  if (filters.subscribersMax !== '1M+') count++;
  if (filters.multiplierMin !== '0.0x') count++;
  if (filters.multiplierMax !== '100.0x+') count++;
  if (filters.videoDurationMin !== '00:00:00') count++;
  if (filters.videoDurationMax !== '07:00:00+') count++;
  if (filters.whenPosted) count++;

  if (adv.viewsToSubsRatioMin !== '0.0') count++;
  if (adv.viewsToSubsRatioMax !== '50.0+') count++;
  if (adv.medianViewsMin !== '0') count++;
  if (adv.medianViewsMax !== '10M+') count++;
  if (adv.channelTotalViewsMin !== '0') count++;
  if (adv.channelTotalViewsMax !== '1B+') count++;
  if (adv.channelVideoCountMin !== '0') count++;
  if (adv.channelVideoCountMax !== '1k+') count++;
  if (adv.videoLikesMin !== '0') count++;
  if (adv.videoLikesMax !== '1M+') count++;
  if (adv.videoCommentsMin !== '0') count++;
  if (adv.videoCommentsMax !== '100K+') count++;
  if (adv.engagementRateMin !== '0') count++;
  if (adv.engagementRateMax !== '20+') count++;
  if (adv.channelAgeMin !== 'Brand new') count++;
  if (adv.channelAgeMax !== '20 years ago+') count++;
  if (adv.includeChannels.trim()) count++;
  if (adv.excludeChannels.trim()) count++;
  if (adv.includeKeywords.trim()) count++;
  if (adv.excludeKeywords.trim()) count++;

  return count;
}
