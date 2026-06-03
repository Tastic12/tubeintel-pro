'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { FaCog, FaSync, FaExternalLinkAlt, FaFire } from 'react-icons/fa';
import {
  useDiscoverVideos,
  fetchDiscoverSettings,
  saveDiscoverSettings,
  syncDiscoverTrending,
  type DiscoverSettings,
  type DiscoveredVideo,
} from '@/lib/hooks';
import { useShortsPreference } from '@/lib/preferences';
import {
  YOUTUBE_VIDEO_CATEGORIES,
  DISCOVER_REGIONS,
  DEFAULT_DISCOVER_CATEGORY_IDS,
  categoryLabel,
} from '@/lib/youtube-discover';

const formatNumber = (num: number): string => {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  return num.toString();
};

export default function DiscoverPage() {
  const { hideShorts, mounted } = useShortsPreference();
  const [categoryFilter, setCategoryFilter] = useState<number | null>(null);
  const [settings, setSettings] = useState<DiscoverSettings>({
    region_code: 'GB',
    category_ids: [...DEFAULT_DISCOVER_CATEGORY_IDS],
  });
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const longFormOnly = mounted ? hideShorts : true;
  const { videos, stats, isLoading, isError, mutate, regionCode } = useDiscoverVideos(
    categoryFilter,
    longFormOnly
  );

  useEffect(() => {
    fetchDiscoverSettings()
      .then(setSettings)
      .catch(() => {});
  }, []);

  const visibleVideos = videos ?? [];

  const toggleCategory = (id: number) => {
    setSettings((prev) => {
      const has = prev.category_ids.includes(id);
      const next = has
        ? prev.category_ids.filter((c) => c !== id)
        : [...prev.category_ids, id];
      return { ...prev, category_ids: next.length ? next : [...DEFAULT_DISCOVER_CATEGORY_IDS] };
    });
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    setStatusMsg('');
    try {
      await saveDiscoverSettings(settings);
      setStatusMsg('Preferences saved.');
      setSettingsOpen(false);
      await mutate();
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : 'Could not save settings.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setStatusMsg('');
    try {
      const result = await syncDiscoverTrending();
      await mutate();
      setStatusMsg(result.message ?? `Fetched ${result.unique_videos} unique videos.`);
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : 'Sync failed.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="w-full max-w-[1200px] mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold dark:text-white flex items-center gap-2">
          <FaFire className="text-orange-400" />
          Discover
        </h1>
        <p className="text-gray-400 text-sm mt-1 max-w-2xl">
          Browse trending YouTube videos in your chosen region and categories — useful for niche
          research beyond your tracked competitors.
        </p>
      </div>

      <div className="space-y-6">
        <section className="flex flex-wrap items-center gap-2 rounded-xl border border-white/20 bg-white/5 backdrop-blur-sm p-4">
          <button
            type="button"
            onClick={() => setSettingsOpen((v) => !v)}
            className="flex items-center gap-2 min-h-11 px-4 py-2 text-sm rounded-full border border-white/20 text-gray-200 hover:bg-white/10 transition-colors"
          >
            <FaCog size={14} />
            {settingsOpen ? 'Hide preferences' : 'Preferences'}
          </button>
          <button
            type="button"
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 min-h-11 px-4 py-2 text-sm rounded-full bg-blue-600/80 hover:bg-blue-600 text-white disabled:opacity-50 transition-colors"
          >
            <FaSync size={14} className={syncing ? 'animate-spin' : ''} />
            {syncing ? 'Fetching trending…' : 'Refresh trending now'}
          </button>
          {statusMsg && (
            <p className="text-xs text-gray-400 w-full sm:w-auto">{statusMsg}</p>
          )}
        </section>

        {settingsOpen && (
          <section className="rounded-xl border border-white/20 bg-white/5 backdrop-blur-sm p-4 space-y-4">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Region</label>
              <select
                value={settings.region_code}
                onChange={(e) =>
                  setSettings((s) => ({ ...s, region_code: e.target.value }))
                }
                className="w-full sm:w-auto min-h-11 px-3 py-2 text-sm rounded-lg bg-gray-900/60 border border-white/20 text-white"
              >
                {DISCOVER_REGIONS.map((r) => (
                  <option key={r.code} value={r.code}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p className="text-xs text-gray-400 mb-2">Categories to fetch and browse</p>
              <div className="flex flex-wrap gap-2">
                {YOUTUBE_VIDEO_CATEGORIES.map((cat) => {
                  const active = settings.category_ids.includes(cat.id);
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleCategory(cat.id)}
                      className={`min-h-11 rounded-full px-3 py-2 text-xs font-medium border transition-colors ${
                        active
                          ? 'bg-blue-600 text-white border-blue-500'
                          : 'bg-white/5 text-gray-400 border-white/20 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={savingSettings}
              className="min-h-11 px-4 py-2 text-sm rounded-full bg-blue-600/80 hover:bg-blue-600 text-white disabled:opacity-50 transition-colors"
            >
              {savingSettings ? 'Saving…' : 'Save preferences'}
            </button>
          </section>
        )}

        <section>
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
            <button
              type="button"
              onClick={() => setCategoryFilter(null)}
              className={`shrink-0 min-h-11 rounded-full px-3 py-2 text-xs font-medium border whitespace-nowrap ${
                categoryFilter === null
                  ? 'bg-blue-600 text-white border-blue-500'
                  : 'bg-white/5 text-gray-400 border-white/20 hover:text-white'
              }`}
            >
              All categories
            </button>
            {settings.category_ids.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setCategoryFilter(id)}
                className={`shrink-0 min-h-11 rounded-full px-3 py-2 text-xs font-medium border whitespace-nowrap ${
                  categoryFilter === id
                    ? 'bg-blue-600 text-white border-blue-500'
                    : 'bg-white/5 text-gray-400 border-white/20 hover:text-white'
                }`}
              >
                {categoryLabel(id)}
              </button>
            ))}
          </div>
        </section>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
              <p className="text-gray-400">Loading trending videos…</p>
            </div>
          </div>
        ) : isError ? (
          <div className="text-center py-16 space-y-3 rounded-xl border border-dashed border-red-500/30 bg-red-500/5">
            <p className="text-red-300">Could not load trending videos.</p>
            <p className="text-xs text-gray-500 max-w-md mx-auto px-4">
              {isError instanceof Error ? isError.message : 'Try refreshing the page.'}
            </p>
          </div>
        ) : !visibleVideos.length ? (
          <div className="text-center py-16 space-y-3 rounded-xl border border-dashed border-white/20">
            <p className="text-gray-300">
              {stats && stats.rows_in_db > 0 && hideShorts && (stats.long_form_in_pool ?? 0) === 0
                ? 'All cached trending videos look like Shorts (portrait thumbnail or under 60s).'
                : stats && stats.rows_in_db > 0
                  ? 'No long-form videos match the current filter.'
                  : `No trending videos cached for ${regionCode ?? settings.region_code} yet.`}
            </p>
            <p className="text-xs text-gray-500 max-w-md mx-auto px-4">
              {stats && stats.rows_in_db > 0 && hideShorts && (stats.long_form_in_pool ?? 0) === 0 ? (
                <>
                  Turn off <strong className="text-gray-300">Hide Shorts</strong> in the profile
                  menu to browse Shorts here, or refresh trending later for more long-form picks.
                </>
              ) : stats && stats.rows_in_db > 0 ? (
                <>
                  Try <strong className="text-gray-300">All categories</strong>, or turn off{' '}
                  <strong className="text-gray-300">Hide Shorts</strong> in the profile menu.
                </>
              ) : (
                <>
                  Click <strong className="text-gray-300">Refresh trending now</strong> to pull
                  today&apos;s chart from YouTube for your saved region and categories.
                </>
              )}
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-400">
              Showing {visibleVideos.length} trending video
              {visibleVideos.length === 1 ? '' : 's'}
              {hideShorts ? ' (long-form only — portrait thumbnails hidden)' : ''}
              {hideShorts && stats && stats.shorts_in_pool > 0 && (
                <span className="text-gray-500">
                  {' '}
                  · {stats.shorts_in_pool} Short{stats.shorts_in_pool === 1 ? '' : 's'} hidden
                </span>
              )}
              {stats && (
                <span className="text-gray-500">
                  {' '}
                  · {stats.unique_videos} unique in pool
                </span>
              )}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {visibleVideos.map((v) => (
                <DiscoverVideoCard key={v.id} video={v} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function DiscoverVideoCard({ video }: { video: DiscoveredVideo }) {
  const href = `https://www.youtube.com/watch?v=${video.video_id}`;

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border border-white/20 bg-white/5 backdrop-blur-sm hover:border-blue-500/50 transition-all group">
      <a href={href} target="_blank" rel="noopener noreferrer" className="block">
        <div className="aspect-video bg-gray-900 relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" />
          <span className="absolute top-2 left-2 rounded-full bg-orange-500/90 px-2 py-0.5 text-[10px] font-semibold text-white">
            Trending
          </span>
          <span className="absolute bottom-2 left-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white max-w-[90%] truncate">
            {categoryLabel(video.category_id)}
          </span>
          <span className="absolute top-2 right-2 rounded-full bg-black/60 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <FaExternalLinkAlt size={10} className="text-white" />
          </span>
        </div>
        <div className="p-3">
          <p className="text-sm font-medium text-white line-clamp-2">{video.title}</p>
          {video.channel_name && (
            <p className="text-xs text-gray-400 mt-1 truncate">{video.channel_name}</p>
          )}
          {video.view_count != null && (
            <p className="text-[10px] text-gray-500 mt-1.5">
              {formatNumber(video.view_count)} views
            </p>
          )}
        </div>
      </a>
      <div className="px-3 pb-3 -mt-1">
        <Link
          href={`/dashboard/thumbnails?similar=${video.video_id}&title=${encodeURIComponent(video.title)}`}
          className="flex items-center justify-center min-h-9 text-xs font-medium text-gray-400 hover:text-blue-300 rounded px-2 py-2 bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
        >
          Find similar thumbnails
        </Link>
      </div>
    </div>
  );
}
