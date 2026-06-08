'use client';

import { useState } from 'react';
import {
  FaYoutube,
  FaChartLine,
  FaUsers,
  FaPlay,
  FaBook,
  FaFire,
  FaImage,
  FaUser,
  FaPlus,
  FaSync,
  FaCog,
  FaEllipsisV,
} from 'react-icons/fa';
import {
  DEMO_DASHBOARD_VIDEOS,
  DEMO_DISCOVER_VIDEOS,
  DEMO_FOLDERS,
  DEMO_THUMB_EXPAND,
} from '@/lib/demo-preview-data';

type DemoPage = 'dashboard' | 'channels' | 'discover' | 'thumbnails';

const NAV: Array<{ id: DemoPage; label: string; icon: React.ReactNode; href: string }> = [
  { id: 'dashboard', label: 'Dashboard', icon: <FaChartLine size={14} />, href: '/dashboard' },
  { id: 'channels', label: 'Channels', icon: <FaUsers size={14} />, href: '/dashboard/competitors' },
  { id: 'discover', label: 'Discover', icon: <FaFire size={14} />, href: '/dashboard/discover' },
  { id: 'thumbnails', label: 'Thumbnails', icon: <FaImage size={14} />, href: '/dashboard/thumbnails' },
];

export function HomeProductPreview() {
  const [page, setPage] = useState<DemoPage>('dashboard');

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
            Sample data only — static preview of the real V2 dashboard. Click the sidebar to switch
            pages.
          </p>
        </div>

        <div
          className="rounded-xl overflow-hidden ring-1 ring-white/20 shadow-2xl shadow-black/40 bg-gradient-to-br from-[#000b18]/90 via-[#00264d]/40 to-[#00498d]/30"
          aria-label="Interactive product preview"
        >
          <div className="flex min-h-[400px] max-h-[520px]">
            <DemoSidebar active={page} onSelect={setPage} />
            <div className="flex-1 flex flex-col min-w-0">
              <DemoTopNav page={page} />
              <div className="flex-1 p-3 sm:p-4 overflow-y-auto">
                {page === 'dashboard' && <DashboardPreview />}
                {page === 'channels' && <ChannelsPreview />}
                {page === 'discover' && <DiscoverPreview />}
                {page === 'thumbnails' && <ThumbnailsPreview />}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function DemoSidebar({
  active,
  onSelect,
}: {
  active: DemoPage;
  onSelect: (p: DemoPage) => void;
}) {
  return (
    <aside className="hidden sm:flex w-44 shrink-0 flex-col bg-white/10 backdrop-blur-md border-r border-white/20 py-4">
      <div className="px-3 mb-4 flex items-center gap-2">
        <FaYoutube className="text-red-500 h-5 w-5 shrink-0" />
        <span className="font-bold text-sm text-white">ClikStats</span>
      </div>

      <div className="flex flex-col gap-0.5 px-2">
        {NAV.slice(0, 1).map((item) => (
          <SidebarBtn key={item.id} item={item} active={active === item.id} onSelect={onSelect} />
        ))}

        <div className="px-2 py-2 mt-1">
          <div className="flex items-center gap-1">
            <div className="border-t border-gray-700 flex-grow" />
            <span className="text-[9px] text-gray-500 font-medium">TRACKER</span>
            <div className="border-t border-gray-700 flex-grow" />
          </div>
        </div>

        {NAV.slice(1).map((item) => (
          <SidebarBtn key={item.id} item={item} active={active === item.id} onSelect={onSelect} />
        ))}

        <button
          type="button"
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs text-gray-400 mt-0.5"
          disabled
        >
          <FaBook size={14} />
          Beginner&apos;s Guide
        </button>
      </div>
    </aside>
  );
}

function SidebarBtn({
  item,
  active,
  onSelect,
}: {
  item: (typeof NAV)[number];
  active: boolean;
  onSelect: (p: DemoPage) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item.id)}
      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium transition-colors w-full text-left ${
        active
          ? 'bg-[#00264d] text-blue-200'
          : 'text-gray-400 hover:bg-gray-800/50 hover:text-white'
      }`}
    >
      {item.icon}
      {item.label}
    </button>
  );
}

function DemoTopNav({ page }: { page: DemoPage }) {
  const item = NAV.find((n) => n.id === page)!;
  return (
    <header className="h-11 shrink-0 bg-white/10 backdrop-blur-md border-b border-white/20 flex items-center justify-between px-4">
      <h2 className="text-xs sm:text-sm font-semibold text-white truncate">
        YouTube Analytics Dashboard
        <span className="text-gray-500 font-normal hidden sm:inline"> · {item.href}</span>
      </h2>
      <div className="flex items-center gap-1.5 shrink-0">
        <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">
          <FaUser className="h-3 w-3 text-white" />
        </div>
        <span className="text-xs text-white hidden sm:inline">Creator</span>
      </div>
    </header>
  );
}

function DashboardPreview() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: 'Average VPH', value: '4.2K' },
          { label: 'Highest VPH', value: '12.4K' },
          { label: 'VPH Trend', value: '+18%', accent: true },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white/10 backdrop-blur-sm p-2 rounded-lg border border-white/20"
          >
            <p className="text-[9px] text-white/80">{stat.label}</p>
            <p
              className={`text-sm font-semibold mt-0.5 ${stat.accent ? 'text-green-300' : 'text-white'}`}
            >
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-medium text-white">Recent uploads</p>
        <div className="flex gap-1">
          <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-600/80 text-white">Grid</span>
          <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/5 text-gray-400">List</span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {DEMO_DASHBOARD_VIDEOS.map((v) => (
          <div
            key={v.id}
            className="bg-white/10 backdrop-blur-sm rounded-lg overflow-hidden border border-white/10 flex flex-col"
          >
            <div className="aspect-video relative">
              <img src={v.thumb} alt="" className="w-full h-full object-cover" />
            </div>
            <div className="p-2 flex-1">
              <p className="text-[10px] font-medium text-white line-clamp-2 leading-tight">
                {v.title}
              </p>
              <div className="flex flex-wrap gap-1 mt-1.5">
                <span className="text-[8px] bg-white/10 text-gray-200 rounded-full px-1.5 py-0.5">
                  {v.views}
                </span>
                <span className="text-[8px] bg-blue-900/50 text-blue-200 rounded-full px-1.5 py-0.5 font-medium">
                  {v.vph} VPH
                </span>
                <span className="text-[8px] bg-blue-200 text-blue-800 rounded-full px-1.5 py-0.5 font-bold">
                  {v.xFactor.toFixed(1)}x
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ChannelsPreview() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">Niche Folders</h3>
        <span className="text-[9px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
          Free: 3/1 folders
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="border border-dashed border-white/20 rounded-lg p-3 flex items-center gap-2 text-indigo-400">
          <FaPlus size={12} />
          <span className="text-[10px] font-medium">Create new competitor list</span>
        </div>

        {DEMO_FOLDERS.map((folder) => (
          <div
            key={folder.id}
            className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-lg p-3 relative group"
          >
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2 min-w-0">
                <FaUsers className="text-blue-400 shrink-0" size={12} />
                <p className="text-xs font-medium text-white truncate">{folder.name}</p>
              </div>
              <FaEllipsisV className="text-white/40 shrink-0" size={10} />
            </div>
            <p className="text-[9px] text-gray-400 mt-1.5 flex items-center gap-1">
              <FaUsers size={9} />
              {folder.channelCount} channels
              {folder.pinned && <span className="text-blue-400 ml-1">· pinned</span>}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

function DiscoverPreview() {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
          <FaFire className="text-orange-400" size={12} />
          Discover
        </h3>
        <p className="text-[9px] text-gray-400 mt-0.5">Trending in GB · sample data</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <span className="flex items-center gap-1 text-[9px] px-2 py-1 rounded-full border border-white/20 text-gray-300">
          <FaCog size={8} /> Preferences
        </span>
        <span className="flex items-center gap-1 text-[9px] px-2 py-1 rounded-full bg-blue-600/80 text-white">
          <FaSync size={8} /> Refresh trending
        </span>
      </div>

      <div className="flex gap-1 overflow-x-auto pb-1">
        {['All categories', 'Gaming', 'Science & Tech', 'Music'].map((cat, i) => (
          <span
            key={cat}
            className={`shrink-0 text-[9px] px-2 py-1 rounded-full border whitespace-nowrap ${
              i === 0
                ? 'bg-blue-600 text-white border-blue-500'
                : 'bg-white/5 text-gray-400 border-white/20'
            }`}
          >
            {cat}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {DEMO_DISCOVER_VIDEOS.map((v) => (
          <div
            key={v.title}
            className="rounded-lg border border-white/20 bg-white/5 overflow-hidden"
          >
            <div className="aspect-video relative">
              <img src={v.thumb} alt="" className="w-full h-full object-cover" />
              <span className="absolute top-1 left-1 rounded-full bg-orange-500/90 px-1.5 py-0.5 text-[8px] font-semibold text-white">
                Trending
              </span>
              <span className="absolute bottom-1 left-1 rounded bg-black/70 px-1 py-0.5 text-[8px] text-white truncate max-w-[85%]">
                {v.category}
              </span>
            </div>
            <div className="p-1.5">
              <p className="text-[10px] font-medium text-white line-clamp-2 leading-tight">
                {v.title}
              </p>
              <p className="text-[8px] text-gray-400 mt-0.5">{v.views} views</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ThumbnailsPreview() {
  const { niche, style, groups } = DEMO_THUMB_EXPAND;

  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
          <FaImage className="text-blue-400" size={12} />
          Thumbnail Search
        </h3>
        <p className="text-[9px] text-gray-400 mt-0.5">
          Search YouTube by niche + style — sample results
        </p>
      </div>

      <section className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-3 space-y-2">
        <p className="text-[10px] font-semibold text-blue-200 flex items-center gap-1">
          <FaYoutube size={10} />
          Search YouTube by niche + style
        </p>
        <div className="rounded-md bg-gray-900/60 border border-white/20 px-2 py-1.5 text-[10px] text-white">
          {niche}
        </div>
        <div className="rounded-md bg-gray-900/60 border border-white/20 px-2 py-1.5 text-[10px] text-gray-300">
          {style}
        </div>
        <span className="inline-block text-[9px] px-3 py-1 rounded-full bg-blue-600 text-white font-medium">
          Search YouTube
        </span>
      </section>

      <p className="text-[9px] text-gray-500">Grouped by channel · {groups.length} channels found</p>

      {groups.map((g) => (
        <div key={g.channel} className="space-y-1.5">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-medium text-white">{g.channel}</p>
            <span className="text-[8px] px-2 py-0.5 rounded-full border border-blue-500/40 text-blue-300">
              Track channel
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {g.items.map((item) => (
              <div
                key={item.title}
                className="rounded-md border border-white/10 bg-white/5 overflow-hidden"
              >
                <div className="aspect-video">
                  <img src={item.thumb} alt="" className="w-full h-full object-cover" />
                </div>
                <p className="p-1.5 text-[9px] text-white line-clamp-2 leading-tight">
                  {item.title}
                </p>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
