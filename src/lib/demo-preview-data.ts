/** Static demo assets for the marketing homepage preview — no API calls. */

export const DEMO_IMAGES = {
  thumbs: {
    camera: '/demo/demo-thumb-camera.jpg',
    beat: '/demo/demo-thumb-beat.jpg',
    drive: '/demo/demo-thumb-drive.jpg',
    money: '/demo/demo-thumb-money.jpg',
    gaming: '/demo/demo-thumb-gaming.jpg',
  },
  avatars: {
    beatLab: '/demo/demo-avatar-beatlab.jpg',
    gearReview: '/demo/demo-avatar-gear.jpg',
    dailyDrive: '/demo/demo-avatar-drive.jpg',
  },
} as const;

export type DemoChannel = {
  id: string;
  name: string;
  subs: string;
  views: string;
  avatar: string;
  topVideos: Array<{
    title: string;
    views: string;
    thumb: string;
    outlier: number;
  }>;
};

export const DEMO_CHANNELS: DemoChannel[] = [
  {
    id: 'beatlab',
    name: 'BeatLab',
    subs: '1.2M',
    views: '84M',
    avatar: DEMO_IMAGES.avatars.beatLab,
    topVideos: [
      {
        title: 'This beat took 20 minutes',
        views: '1.8M',
        thumb: DEMO_IMAGES.thumbs.beat,
        outlier: 4.8,
      },
      {
        title: 'FL Studio tricks nobody uses',
        views: '920K',
        thumb: DEMO_IMAGES.thumbs.beat,
        outlier: 3.2,
      },
    ],
  },
  {
    id: 'gear',
    name: 'GearReview HQ',
    subs: '890K',
    views: '112M',
    avatar: DEMO_IMAGES.avatars.gearReview,
    topVideos: [
      {
        title: 'I tried every camera under $500',
        views: '2.4M',
        thumb: DEMO_IMAGES.thumbs.camera,
        outlier: 6.2,
      },
      {
        title: 'Best mic for beginners in 2026',
        views: '640K',
        thumb: DEMO_IMAGES.thumbs.camera,
        outlier: 2.9,
      },
    ],
  },
  {
    id: 'drive',
    name: 'Daily Drive',
    subs: '2.4M',
    views: '310M',
    avatar: DEMO_IMAGES.avatars.dailyDrive,
    topVideos: [
      {
        title: 'POV: morning commute chaos',
        views: '3.1M',
        thumb: DEMO_IMAGES.thumbs.drive,
        outlier: 5.8,
      },
      {
        title: 'Is this the worst junction in the UK?',
        views: '1.2M',
        thumb: DEMO_IMAGES.thumbs.drive,
        outlier: 3.4,
      },
    ],
  },
];

export const DEMO_OUTLIERS = DEMO_CHANNELS.flatMap((ch) =>
  ch.topVideos.map((v, i) => ({
    id: `${ch.id}-${i}`,
    title: v.title,
    channel: ch.name,
    views: v.views,
    thumb: v.thumb,
    score: v.outlier,
    source: 'competitor_channel' as const,
  }))
)
  .sort((a, b) => b.score - a.score)
  .slice(0, 4);

export const DEMO_FOLDERS = [
  { id: 'music', name: 'Music Producers', channelCount: 4, pinned: true },
  { id: 'tech', name: 'Tech Reviews', channelCount: 6, pinned: false },
  { id: 'gaming', name: 'Gaming & Esports', channelCount: 3, pinned: false },
] as const;

export const DEMO_DASHBOARD_VIDEOS = DEMO_CHANNELS.flatMap((ch) =>
  ch.topVideos.map((v) => ({
    id: `${ch.id}-${v.title}`,
    title: v.title,
    views: v.views,
    thumb: v.thumb,
    vph: v.outlier >= 5 ? '12.4K' : v.outlier >= 3 ? '4.2K' : '1.8K',
    xFactor: v.outlier,
    channel: ch.name,
  }))
).slice(0, 4);

export const DEMO_DISCOVER_VIDEOS = [
  { title: 'How I 10x my RPM', views: '2.1M', thumb: DEMO_IMAGES.thumbs.money, category: 'Education' },
  { title: 'Camera tier list 2026', views: '890K', thumb: DEMO_IMAGES.thumbs.camera, category: 'Science & Tech' },
  { title: 'Ranked grind tips', views: '1.4M', thumb: DEMO_IMAGES.thumbs.gaming, category: 'Gaming' },
  { title: 'POV: morning commute chaos', views: '3.1M', thumb: DEMO_IMAGES.thumbs.drive, category: 'Autos' },
] as const;

export const DEMO_THUMB_EXPAND = {
  niche: 'budget gaming PC review',
  style: 'red arrow, shocked face',
  groups: [
    {
      channel: 'GearReview HQ',
      items: [
        { thumb: DEMO_IMAGES.thumbs.camera, title: 'I tried every camera under $500', views: '2.4M' },
        { thumb: DEMO_IMAGES.thumbs.camera, title: 'Best mic for beginners in 2026', views: '640K' },
      ],
    },
    {
      channel: 'BeatLab',
      items: [
        { thumb: DEMO_IMAGES.thumbs.beat, title: 'This beat took 20 minutes', views: '1.8M' },
      ],
    },
  ],
} as const;

export const DEMO_THUMB_SEARCH = {
  query: 'shocked face red arrow money',
  results: [
    { thumb: DEMO_IMAGES.thumbs.money, similarity: 92, source: 'You' as const, title: 'How I 10x my RPM' },
    { thumb: DEMO_IMAGES.thumbs.camera, similarity: 87, source: 'Competitor' as const, title: 'Camera tier list' },
    { thumb: DEMO_IMAGES.thumbs.gaming, similarity: 84, source: 'Trending' as const, title: 'Ranked grind tips' },
    { thumb: DEMO_IMAGES.thumbs.money, similarity: 79, source: 'Competitor' as const, title: 'Ad revenue exposed' },
  ],
};
