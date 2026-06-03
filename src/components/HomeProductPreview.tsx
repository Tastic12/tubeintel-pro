'use client';

import { useState } from 'react';
import { OutlierBadge } from '@/components/OutlierBadge';
import { formatCount } from '@/lib/format';
import { DEMO_CHANNELS, DEMO_OUTLIERS, DEMO_THUMB_SEARCH } from '@/lib/demo-preview-data';

const demoTabs = [
  { id: 'competitors', label: 'Competitors' },
  { id: 'outliers', label: 'Performing now' },
  { id: 'thumbnails', label: 'Thumbnail search' },
] as const;

type DemoTab = (typeof demoTabs)[number]['id'];

function SourcePill({ source }: { source: 'You' | 'Competitor' | 'Trending' }) {
  const cls =
    source === 'You'
      ? 'bg-[#4361ee]'
      : source === 'Trending'
        ? 'bg-indigo-600/90'
        : 'bg-zinc-700/90';
  return (
    <span className={`rounded px-1.5 py-0.5 text-[9px] font-semibold text-white ${cls}`}>
      {source === 'Trending' ? 'Trending' : source}
    </span>
  );
}

export function HomeProductPreview() {
  const [tab, setTab] = useState<DemoTab>('competitors');

  return (
    <section className="px-4 sm:px-6 lg:px-8 xl:px-10 py-16 sm:py-20 border-b border-white/10 bg-black/20">
      <div className="mx-auto max-w-5xl">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <p className="text-sm font-semibold uppercase tracking-wide text-[#4361ee]">
            See it in action
          </p>
          <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
            Built for niche tracking, not generic analytics
          </h2>
          <p className="mt-4 text-gray-400">
            Sample data only — static images, no API calls. Click the tabs to explore the real
            layout.
          </p>
        </div>

        <div
          className="rounded-xl ring-1 ring-white/10 bg-[#0a1628]/80 backdrop-blur-sm overflow-hidden shadow-2xl shadow-black/40"
          aria-label="Interactive product preview"
        >
          <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-black/30">
            <span className="h-3 w-3 rounded-full bg-red-500/80" />
            <span className="h-3 w-3 rounded-full bg-amber-500/80" />
            <span className="h-3 w-3 rounded-full bg-emerald-500/80" />
            <span className="ml-3 text-xs text-gray-500">clikstats.com/dashboard/competitors</span>
          </div>

          <div className="flex min-h-[360px]">
            <aside className="hidden sm:flex w-36 shrink-0 flex-col border-r border-white/10 bg-black/20 p-2 gap-0.5">
              <span className="px-2 py-1.5 text-[10px] font-semibold uppercase text-gray-500">
                Competitors
              </span>
              <span className="px-2 py-1.5 text-xs rounded-md bg-[#4361ee]/20 text-[#4361ee] font-medium">
                Channels
              </span>
              <span className="px-2 py-1.5 text-xs text-gray-400">Videos</span>
              <span className="mt-3 px-2 py-1.5 text-[10px] font-semibold uppercase text-gray-500">
                Insights
              </span>
              <span className="px-2 py-1.5 text-xs text-gray-400">Performing now</span>
            </aside>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 px-3 py-2 border-b border-white/10 bg-[#0a1628]/60">
                <img
                  src={DEMO_CHANNELS[0].avatar}
                  alt=""
                  className="h-7 w-7 rounded-full object-cover ring-1 ring-white/10"
                />
                <span className="text-[10px] text-gray-400 truncate">
                  Your channel · {formatCount(420000)} subs
                </span>
              </div>

              <div className="flex flex-wrap gap-1 p-2 border-b border-white/10">
                {demoTabs.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium min-h-9 transition-colors ${
                      tab === t.id
                        ? 'bg-[#4361ee]/20 text-[#4361ee] ring-1 ring-[#4361ee]/40'
                        : 'text-gray-400 hover:bg-white/5'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              <div className="p-3 sm:p-4">
                {tab === 'competitors' && <CompetitorsPreview />}
                {tab === 'outliers' && <OutliersPreview />}
                {tab === 'thumbnails' && <ThumbnailsPreview />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function CompetitorsPreview() {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {['All', 'Music', 'Unsorted'].map((cat, i) => (
          <span
            key={cat}
            className={`rounded-full px-2.5 py-1 text-[10px] font-medium ring-1 ${
              i === 1
                ? 'bg-[#4361ee] text-white ring-[#4361ee]'
                : 'bg-white/5 text-gray-400 ring-white/10'
            }`}
          >
            {cat}
          </span>
        ))}
      </div>

      <p className="text-[10px] text-gray-500">
        Top uploads per channel · side-by-side (sample folder: Music)
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {DEMO_CHANNELS.map((ch) => (
          <div key={ch.id} className="min-w-0 rounded-lg ring-1 ring-white/10 overflow-hidden">
            <div className="flex items-center gap-2 px-2 py-2 border-b border-white/10 bg-black/20">
              <img src={ch.avatar} alt="" className="h-7 w-7 rounded-full object-cover" />
              <div className="min-w-0">
                <p className="text-xs font-semibold truncate text-white">{ch.name}</p>
                <p className="text-[9px] text-gray-400">
                  {ch.subs} subs · {ch.views} views
                </p>
              </div>
            </div>
            <div className="p-1.5 space-y-1.5">
              {ch.topVideos.slice(0, 2).map((v) => (
                <div
                  key={v.title}
                  className="rounded-md overflow-hidden ring-1 ring-white/10 bg-white/5"
                >
                  <div className="aspect-video relative">
                    <img src={v.thumb} alt="" className="w-full h-full object-cover" />
                    <div className="absolute top-1 right-1">
                      <OutlierBadge score={v.outlier} size="sm" />
                    </div>
                  </div>
                  <p className="p-1.5 text-[10px] font-medium line-clamp-2 leading-tight text-white">
                    {v.title}
                  </p>
                  <p className="px-1.5 pb-1.5 text-[9px] text-gray-400">{v.views} views</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function OutliersPreview() {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2 text-[10px]">
        <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-gray-300">
          Min score: 1.5×
        </span>
        <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-gray-300">
          Source: All
        </span>
        <span className="text-gray-500 self-center">Sorted by outlier score</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {DEMO_OUTLIERS.map((v, i) => (
          <div
            key={v.id}
            className="flex gap-2 rounded-lg ring-1 ring-white/10 overflow-hidden bg-black/20"
          >
            <div className="relative w-28 sm:w-32 shrink-0 aspect-video">
              <img src={v.thumb} alt="" className="w-full h-full object-cover" />
              <span className="absolute top-1 left-1 bg-black/70 text-white text-[9px] font-bold px-1 rounded">
                #{i + 1}
              </span>
              <div className="absolute top-1 right-1">
                <OutlierBadge score={v.score} size="sm" />
              </div>
            </div>
            <div className="py-2 pr-2 min-w-0 flex flex-col justify-center">
              <p className="text-xs font-medium line-clamp-2 text-white">{v.title}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{v.channel}</p>
              <p className="text-[9px] text-gray-500 mt-1">{v.views} views · Competitor</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ThumbnailsPreview() {
  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="flex-1 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs text-white">
          {DEMO_THUMB_SEARCH.query}
        </div>
        <span className="rounded-md bg-[#4361ee] px-3 py-2 text-xs inline-flex items-center text-white font-medium">
          Search
        </span>
      </div>
      <p className="text-[10px] text-gray-500">4 matches · indexed thumbnails only (sample)</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {DEMO_THUMB_SEARCH.results.map((r) => (
          <div
            key={r.title}
            className="rounded-lg overflow-hidden ring-1 ring-white/10 bg-white/5"
          >
            <div className="aspect-video relative">
              <img src={r.thumb} alt="" className="w-full h-full object-cover" />
              <span className="absolute top-1 left-1 rounded bg-black/70 px-1 py-0.5 text-[9px] font-bold text-white">
                {r.similarity}%
              </span>
              <span className="absolute bottom-1 left-1">
                <SourcePill source={r.source} />
              </span>
            </div>
            <p className="p-1.5 text-[10px] font-medium line-clamp-2 leading-tight text-white">
              {r.title}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
