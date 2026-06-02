import { Video } from '@/types';

/**
 * Calculate the median of an array of numbers
 */
function getMedian(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length === 0) return 0;

  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function deriveMetricsFromXFactor(
  xFactor: number,
  medianViews: number
): {
  score: number;
  deviationPercentage: number;
  performanceLevel: 'low' | 'average' | 'high' | 'exceptional';
  xFactor: number;
  medianViews: number;
} {
  const deviationPercentage = (xFactor - 1) * 100;
  const score = Math.min(100, Math.max(0, 50 + deviationPercentage / 4));

  let performanceLevel: 'low' | 'average' | 'high' | 'exceptional' = 'average';
  if (score < 30) performanceLevel = 'low';
  else if (score > 70 && score < 90) performanceLevel = 'high';
  else if (score >= 90) performanceLevel = 'exceptional';

  return {
    score: Math.round(score),
    medianViews,
    deviationPercentage,
    performanceLevel,
    xFactor,
  };
}

/**
 * Calculate outlier score for a video compared to channel median.
 * Uses SQL-computed score when present on the video object; otherwise client-side median.
 */
export function calculateOutlierScore(video: Video, channelVideos: Video[]) {
  if (video.outlierScore != null && video.outlierScore > 0) {
    const xFactor = video.outlierScore;
    const medianViews =
      video.outlierMedianViews ??
      (xFactor > 0 ? Math.round(video.viewCount / xFactor) : video.viewCount);
    return deriveMetricsFromXFactor(xFactor, medianViews);
  }

  const otherVideos = channelVideos.filter((v) => v.id !== video.id);
  const viewCounts = otherVideos.map((v) => v.viewCount);
  const medianViews =
    viewCounts.length > 0 ? getMedian(viewCounts) : video.viewCount;

  const deviationPercentage =
    medianViews > 0
      ? ((video.viewCount - medianViews) / medianViews) * 100
      : 0;

  const xFactor = medianViews > 0 ? video.viewCount / medianViews : 1;
  return deriveMetricsFromXFactor(xFactor, medianViews);
}

/**
 * Calculate a comprehensive performance score for a video based on multiple metrics
 */
export function calculatePerformanceScore(video: Video, channelVideos: Video[]) {
  const outlierData = calculateOutlierScore(video, channelVideos);

  const engagementRate =
    video.viewCount > 0
      ? ((video.likeCount + video.commentCount) / video.viewCount) * 100
      : 0;

  const ageInDays =
    (Date.now() - new Date(video.publishedAt).getTime()) / (1000 * 60 * 60 * 24);
  const recencyFactor = Math.max(0, 1 - ageInDays / 30);

  return (
    outlierData.score * 0.5 +
    engagementRate * 0.3 +
    video.vph * 0.1 +
    recencyFactor * 10
  );
}

/**
 * Get top performing videos based on comprehensive performance score
 */
export function getTopPerformingVideos(videos: Video[], limit: number = 5): Video[] {
  if (!videos || videos.length === 0) return [];

  const videosWithScores = videos.map((video) => ({
    ...video,
    performanceScore: calculatePerformanceScore(video, videos),
  }));

  return videosWithScores
    .sort((a, b) => b.performanceScore - a.performanceScore)
    .slice(0, limit);
}
