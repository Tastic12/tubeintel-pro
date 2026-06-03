/** Default YouTube CDN thumbnail when only a video id is known. */
export function youtubeDefaultThumbUrl(videoId: string): string {
  return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}
