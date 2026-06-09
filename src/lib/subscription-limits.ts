export const FREE_TIER_FOLDER_LIMIT = 1;
export const FREE_TIER_CHANNEL_LIMIT = 5;
export const FREE_TIER_VIDEOS_PER_COLLECTION = 5;

export type SubscriptionPlan = 'free' | 'pro';

export function hasProAccess(plan: SubscriptionPlan, isSubscribed: boolean): boolean {
  return isSubscribed || plan === 'pro';
}

export function canCreateFolder(
  folderCount: number,
  plan: SubscriptionPlan,
  isSubscribed: boolean
): boolean {
  if (hasProAccess(plan, isSubscribed)) return true;
  return folderCount < FREE_TIER_FOLDER_LIMIT;
}

export function canAddChannel(
  channelCount: number,
  plan: SubscriptionPlan,
  isSubscribed: boolean
): boolean {
  if (hasProAccess(plan, isSubscribed)) return true;
  return channelCount < FREE_TIER_CHANNEL_LIMIT;
}

export function canAddVideo(
  videoCount: number,
  plan: SubscriptionPlan,
  isSubscribed: boolean
): boolean {
  if (hasProAccess(plan, isSubscribed)) return true;
  return videoCount < FREE_TIER_VIDEOS_PER_COLLECTION;
}
