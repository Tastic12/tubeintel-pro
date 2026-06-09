'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  FaImage,
  FaSearch,
  FaUpload,
  FaUserPlus,
  FaYoutube,
  FaExternalLinkAlt,
  FaChevronDown,
  FaChevronUp,
} from 'react-icons/fa';
import {
  searchThumbnails,
  searchThumbnailsByImage,
  searchSimilarToVideo,
  expandThumbnailSearchOnYouTube,
  useCompetitorListsPage,
  type ThumbnailSearchResult,
} from '@/lib/hooks';
import { useShortsPreference } from '@/lib/preferences';
import { filterVideosByShortsPreference } from '@/lib/video-short';
import { competitorListsApi } from '@/services/api/competitorLists';
import ProPageGate from '@/components/features/ProPageGate';
import { Video } from '@/types';

const STYLE_EXAMPLES = [
  'red arrow pointing at money',
  'shocked face close-up',
  'before and after transformation',
  'glowing neon text',
];

const NICHE_EXAMPLES = [
  'budget gaming PC review',
  'true crime documentary UK',
  'home gym transformation',
  'iPhone tips and tricks',
];

/** Index search: tracked competitors, collections, and Discover — not your own uploads. */
function filterIndexResults(results: ThumbnailSearchResult[]) {
  return results.filter((r) => r.source !== 'own' && r.source !== 'unknown');
}

function toVideoStub(r: ThumbnailSearchResult): Video {
  return {
    id: r.youtube_video_id,
    youtubeId: r.youtube_video_id,
    channelId: r.channel_id || '',
    title: r.title || '',
    description: '',
    thumbnailUrl: r.thumbnail_url,
    publishedAt: r.published_at ? new Date(r.published_at) : new Date(),
    viewCount: r.view_count ?? 0,
    likeCount: 0,
    commentCount: 0,
    vph: 0,
    durationIso: null,
  };
}

function shortFilter(results: ThumbnailSearchResult[], hideShorts: boolean) {
  if (!hideShorts) return results;
  return results.filter((r) => {
    if (r.is_short === true) return false;
    if (r.is_short === false) return true;
    return filterVideosByShortsPreference([toVideoStub(r)], true).length > 0;
  });
}

export default function ThumbnailsPage() {
  return (
    <ProPageGate
      featureName="Thumbnails"
      description="Search and analyze thumbnails across your tracked channels. Upgrade to Pro to unlock Thumbnails."
    >
      <Suspense
        fallback={
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-400">Loading thumbnail search…</p>
          </div>
        }
      >
        <ThumbnailsPageInner />
      </Suspense>
    </ProPageGate>
  );
}

function ThumbnailsPageInner() {
  const searchParams = useSearchParams();
  const { hideShorts, mounted } = useShortsPreference();
  const { competitorLists } = useCompetitorListsPage();

  const referenceVideoId = searchParams.get('similar') || '';
  const referenceTitle = searchParams.get('title') || '';

  const [nicheQuery, setNicheQuery] = useState('');
  const [styleQuery, setStyleQuery] = useState('');
  const [indexQuery, setIndexQuery] = useState('');
  const [showIndexSearch, setShowIndexSearch] = useState(false);
  const [results, setResults] = useState<ThumbnailSearchResult[]>([]);
  const [searchError, setSearchError] = useState('');
  const [statusMsg, setStatusMsg] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchMode, setSearchMode] = useState<'expand' | 'index'>('expand');
  const [groupByChannel, setGroupByChannel] = useState(true);
  const [trackTarget, setTrackTarget] = useState<{
    channelId: string;
    channelName: string;
  } | null>(null);
  const [trackListId, setTrackListId] = useState('');
  const [tracking, setTracking] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (referenceTitle) {
      setStatusMsg(`Style reference: ${referenceTitle}`);
    }
  }, [referenceTitle]);

  const visibleResults = useMemo(
    () => shortFilter(results, mounted ? hideShorts : true),
    [results, hideShorts, mounted]
  );

  const grouped = useMemo(() => {
    if (!groupByChannel || searchMode !== 'expand') return null;
    const map = new Map<string, { name: string; items: ThumbnailSearchResult[] }>();
    for (const r of visibleResults) {
      const cid = r.channel_id || 'unknown';
      const entry = map.get(cid) || { name: r.channel_name || 'Unknown channel', items: [] };
      entry.items.push(r);
      map.set(cid, entry);
    }
    return Array.from(map.values()).sort((a, b) => b.items.length - a.items.length);
  }, [visibleResults, groupByChannel, searchMode]);

  async function handleExpandSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!nicheQuery.trim()) return;
    setSearchMode('expand');
    setSearching(true);
    setSearchError('');
    setStatusMsg('');
    try {
      const { results: expanded, message } = await expandThumbnailSearchOnYouTube({
        nicheQuery: nicheQuery.trim(),
        styleQuery: styleQuery.trim() || undefined,
        referenceVideoId: referenceVideoId || undefined,
        maxResults: 25,
      });
      setResults(expanded);
      setStatusMsg(message || '');
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function handleIndexTextSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!indexQuery.trim()) return;
    setSearchMode('index');
    setSearching(true);
    setSearchError('');
    try {
      const raw = await searchThumbnails(indexQuery.trim(), 32);
      setResults(filterIndexResults(raw));
      setStatusMsg('Matches from tracked channels & Discover trending');
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function handleIndexSimilar(videoId: string) {
    setSearchMode('index');
    setSearching(true);
    setSearchError('');
    try {
      const raw = await searchSimilarToVideo(videoId, 32);
      setResults(filterIndexResults(raw));
      setStatusMsg('Similar among tracked channels & Discover');
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Search failed');
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function handleImageUpload(file: File) {
    setSearchMode('index');
    setSearching(true);
    setSearchError('');
    try {
      const raw = await searchThumbnailsByImage(file, 32);
      setResults(filterIndexResults(raw));
      setStatusMsg('Similar among tracked channels & Discover');
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Image search failed');
      setResults([]);
    } finally {
      setSearching(false);
    }
  }

  async function handleTrackChannel() {
    if (!trackTarget || !trackListId) return;
    setTracking(true);
    try {
      await competitorListsApi.addCompetitorToList(trackListId, {
        youtubeId: trackTarget.channelId,
        name: trackTarget.channelName,
      });
      setStatusMsg(`Added ${trackTarget.channelName} to your list.`);
      setTrackTarget(null);
    } catch (err) {
      setStatusMsg(err instanceof Error ? err.message : 'Could not track channel');
    } finally {
      setTracking(false);
    }
  }

  return (
    <div className="w-full max-w-[1200px] mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <FaImage className="text-blue-400" />
          Thumbnail Search
        </h1>
        <p className="text-gray-400 text-sm mt-1 max-w-2xl">
          Search YouTube within a niche and rank results by thumbnail style — find channels using
          similar visuals, then track them. Indexing runs automatically in the background.
        </p>
      </div>

      <section className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-blue-200 flex items-center gap-2">
          <FaYoutube />
          Search YouTube by niche + style
        </h2>
        {referenceVideoId && (
          <p className="text-xs text-gray-400">
            Using video <span className="text-gray-300">{referenceVideoId}</span> as a visual
            reference{referenceTitle ? `: ${referenceTitle}` : ''}.
          </p>
        )}
        <form onSubmit={handleExpandSearch} className="space-y-3">
          <input
            value={nicheQuery}
            onChange={(e) => setNicheQuery(e.target.value)}
            placeholder="Niche or topic — e.g. budget gaming PC review"
            className="w-full min-h-11 px-3 rounded-lg bg-gray-900/60 border border-white/20 text-white text-sm"
          />
          <input
            value={styleQuery}
            onChange={(e) => setStyleQuery(e.target.value)}
            placeholder="Thumbnail style (optional) — e.g. red arrow, shocked face"
            className="w-full min-h-11 px-3 rounded-lg bg-gray-900/60 border border-white/20 text-white text-sm"
          />
          <div className="flex flex-wrap gap-2">
            {NICHE_EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setNicheQuery(ex)}
                className="text-[10px] px-2 py-1 rounded-full border border-white/10 text-gray-500 hover:text-gray-300"
              >
                {ex}
              </button>
            ))}
          </div>
          <button
            type="submit"
            disabled={searching || !nicheQuery.trim()}
            className="min-h-11 px-5 rounded-full bg-blue-600 hover:bg-blue-500 text-white text-sm disabled:opacity-50"
          >
            {searching ? 'Searching YouTube…' : 'Search YouTube'}
          </button>
          <p className="text-[10px] text-gray-500">Uses ~100 YouTube API units per search.</p>
        </form>
      </section>

      <section className="rounded-xl border border-white/10 bg-white/[0.02]">
        <button
          type="button"
          onClick={() => setShowIndexSearch((v) => !v)}
          className="w-full flex items-center justify-between p-4 text-left text-sm text-gray-400 hover:text-gray-200"
        >
          <span>Also search tracked channels &amp; Discover trending</span>
          {showIndexSearch ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
        </button>
        {showIndexSearch && (
          <div className="px-4 pb-4 space-y-3 border-t border-white/10 pt-4">
            <p className="text-xs text-gray-500">
              Search thumbnails from channels you track and Discover trending — not your own
              uploads.
            </p>
            <form onSubmit={handleIndexTextSearch} className="flex flex-wrap gap-2">
              <input
                value={indexQuery}
                onChange={(e) => setIndexQuery(e.target.value)}
                placeholder="Describe a thumbnail style…"
                className="flex-1 min-w-[200px] min-h-11 px-3 rounded-lg bg-gray-900/60 border border-white/20 text-white text-sm"
              />
              <button
                type="submit"
                disabled={searching}
                className="flex items-center gap-2 min-h-11 px-4 rounded-full border border-white/20 text-gray-200 text-sm hover:bg-white/10 disabled:opacity-50"
              >
                <FaSearch size={14} />
                Search tracked
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={searching}
                className="flex items-center gap-2 min-h-11 px-4 rounded-full border border-white/20 text-gray-200 text-sm hover:bg-white/10"
              >
                <FaUpload size={14} />
                Upload image
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleImageUpload(f);
                }}
              />
            </form>
            <div className="flex flex-wrap gap-2">
              {STYLE_EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setIndexQuery(ex)}
                  className="text-[10px] px-2 py-1 rounded-full border border-white/10 text-gray-500 hover:text-gray-300"
                >
                  {ex}
                </button>
              ))}
            </div>
            {referenceVideoId && (
              <button
                type="button"
                onClick={() => handleIndexSimilar(referenceVideoId)}
                disabled={searching}
                className="text-xs text-blue-300 hover:underline disabled:opacity-50"
              >
                Find similar in tracked &amp; Discover only
              </button>
            )}
          </div>
        )}
      </section>

      {(statusMsg || searchMode === 'expand') && visibleResults.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
          {statusMsg && <span>{statusMsg}</span>}
          {searchMode === 'expand' && (
            <label className="flex items-center gap-2 ml-auto cursor-pointer">
              <input
                type="checkbox"
                checked={groupByChannel}
                onChange={(e) => setGroupByChannel(e.target.checked)}
              />
              Group by channel
            </label>
          )}
        </div>
      )}

      {searchError && (
        <p className="text-sm text-red-300 rounded-lg border border-red-500/30 bg-red-500/5 p-3">
          {searchError}
        </p>
      )}

      {searching ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
        </div>
      ) : !visibleResults.length ? (
        <p className="text-center text-gray-500 py-12">
          Enter a niche above to search YouTube for channels with similar thumbnail styles.
        </p>
      ) : groupByChannel && grouped ? (
        <div className="space-y-6">
          {grouped.map((group) => (
            <div key={group.name + (group.items[0]?.channel_id ?? '')}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-white">{group.name}</h3>
                {group.items[0]?.channel_id && group.items[0].channel_id !== 'unknown' && (
                  <button
                    type="button"
                    onClick={() =>
                      setTrackTarget({
                        channelId: group.items[0].channel_id!,
                        channelName: group.name,
                      })
                    }
                    className="flex items-center gap-1 text-xs text-blue-300 hover:text-blue-200"
                  >
                    <FaUserPlus size={12} />
                    Track channel
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {group.items.map((r) => (
                  <ThumbnailCard
                    key={r.youtube_video_id}
                    result={r}
                    onSimilar={() => handleIndexSimilar(r.youtube_video_id)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {visibleResults.map((r) => (
            <ThumbnailCard
              key={r.youtube_video_id}
              result={r}
              onSimilar={() => handleIndexSimilar(r.youtube_video_id)}
              onTrack={
                r.channel_id && searchMode === 'expand'
                  ? () =>
                      setTrackTarget({
                        channelId: r.channel_id!,
                        channelName: r.channel_name || 'Channel',
                      })
                  : undefined
              }
            />
          ))}
        </div>
      )}

      {trackTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-xl border border-white/20 bg-gray-900 p-5 space-y-4">
            <h3 className="text-white font-medium">Track {trackTarget.channelName}</h3>
            <select
              value={trackListId}
              onChange={(e) => setTrackListId(e.target.value)}
              className="w-full min-h-11 px-3 rounded-lg bg-gray-800 border border-white/20 text-white text-sm"
            >
              <option value="">Select a channel list…</option>
              {competitorLists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setTrackTarget(null)}
                className="px-4 py-2 text-sm text-gray-400"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!trackListId || tracking}
                onClick={handleTrackChannel}
                className="px-4 py-2 rounded-full bg-blue-600 text-white text-sm disabled:opacity-50"
              >
                {tracking ? 'Adding…' : 'Add to list'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ThumbnailCard({
  result,
  onSimilar,
  onTrack,
}: {
  result: ThumbnailSearchResult;
  onSimilar: () => void;
  onTrack?: () => void;
}) {
  const href = `https://www.youtube.com/watch?v=${result.youtube_video_id}`;
  const pct = Math.round(result.similarity * 100);

  return (
    <div className="rounded-xl border border-white/20 bg-white/5 overflow-hidden group">
      <a href={href} target="_blank" rel="noopener noreferrer" className="block relative aspect-video">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={result.thumbnail_url} alt="" className="w-full h-full object-cover" />
        <span className="absolute top-1 left-1 text-[10px] bg-black/70 text-white px-1.5 py-0.5 rounded">
          {pct}% match
        </span>
        <span className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <FaExternalLinkAlt size={10} className="text-white" />
        </span>
      </a>
      <div className="p-2 space-y-1">
        <p className="text-xs text-white line-clamp-2">{result.title || result.youtube_video_id}</p>
        {result.channel_name && (
          <p className="text-[10px] text-gray-500 truncate">{result.channel_name}</p>
        )}
        <div className="flex gap-2 pt-1">
          <button type="button" onClick={onSimilar} className="text-[10px] text-blue-300 hover:underline">
            Similar
          </button>
          {onTrack && (
            <button type="button" onClick={onTrack} className="text-[10px] text-blue-300 hover:underline">
              Track
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
