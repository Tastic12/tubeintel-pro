'use client';

import Link from 'next/link';
import { HomeProductPreview } from '@/components/HomeProductPreview';
import { useAuth } from '@/contexts/AuthContext';

const features = [
  {
    icon: '📁',
    title: 'Competitor folders',
    description:
      'Group rival channels and videos by niche — music, gaming, news — so you compare apples to apples.',
  },
  {
    icon: '⚡',
    title: 'Outlier scores',
    description:
      'See which uploads beat the baseline across your channel, competitors, and tracked videos in one feed.',
  },
  {
    icon: '🔍',
    title: 'Thumbnail search',
    description:
      'Find visually similar thumbnails across your index — your uploads, competitors, and Discover trending.',
  },
  {
    icon: '📈',
    title: 'Discover trending',
    description:
      "Pull what's hot in your categories today and fold those thumbnails into search automatically.",
  },
];

export default function HomePage() {
  const { user, isAuthenticated, logout } = useAuth();

  const appHref = '/dashboard';
  const signedIn = isAuthenticated && !!user;

  const primaryCta = signedIn ? (
    <Link
      href={appHref}
      className="inline-flex items-center justify-center px-8 py-3 text-base md:py-4 md:text-lg md:px-10 rounded-lg bg-[#4361ee] text-white font-medium hover:bg-[#3a56d4] transition-colors"
    >
      Open app
    </Link>
  ) : (
    <Link
      href="/signup"
      className="inline-flex items-center justify-center px-8 py-3 text-base md:py-4 md:text-lg md:px-10 rounded-lg bg-[#4361ee] text-white font-medium hover:bg-[#3a56d4] transition-colors"
    >
      Get started free
    </Link>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#000b18]/90 backdrop-blur-md">
        <div className="flex h-14 w-full items-center justify-between gap-4 px-4 sm:px-6 lg:px-8 xl:px-10 max-w-6xl mx-auto">
          <Link href="/" className="shrink-0 text-lg font-bold text-white">
            Clik<span className="text-[#4361ee]">Stats</span>
          </Link>

          <div className="flex items-center gap-3 sm:gap-4">
            {signedIn ? (
              <>
                <Link
                  href={appHref}
                  className="rounded-lg bg-[#4361ee] px-4 py-2 text-sm text-white font-medium hover:bg-[#3a56d4] transition-colors"
                >
                  Open app
                </Link>
                <button
                  type="button"
                  onClick={() => logout()}
                  className="text-sm text-gray-400 hover:text-white whitespace-nowrap transition-colors"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium text-gray-400 hover:text-white whitespace-nowrap transition-colors"
                >
                  Sign in
                </Link>
                <Link
                  href="/signup"
                  className="rounded-lg bg-[#4361ee] px-4 py-2 text-sm text-white font-medium hover:bg-[#3a56d4] transition-colors"
                >
                  Get started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 w-full">
        <section className="px-4 sm:px-6 lg:px-8 xl:px-10 pt-16 pb-20 sm:pt-24 sm:pb-28 border-b border-white/10">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-semibold uppercase tracking-wide text-[#4361ee]">
              Competitive intelligence for creators
            </p>
            <h1 className="mt-4 text-4xl font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
              <span className="block">Track rivals.</span>
              <span className="block text-[#4361ee]">Spot outliers.</span>
              <span className="block">Steal what works.</span>
            </h1>
            <p className="mt-6 text-base text-gray-400 sm:text-lg md:max-w-2xl md:mx-auto">
              ClikStats is built around competitor folders, outlier scores, and thumbnail search —
              not another generic channel dashboard.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              {primaryCta}
              {!signedIn && (
                <Link
                  href="#preview"
                  className="inline-flex items-center justify-center px-8 py-3 text-base font-medium text-white border border-white/20 rounded-lg hover:bg-white/5 transition-colors md:py-4 md:text-lg md:px-10"
                >
                  See demo
                </Link>
              )}
            </div>
          </div>
        </section>

        <div id="preview">
          <HomeProductPreview />
        </div>

        <section className="px-4 sm:px-6 lg:px-8 xl:px-10 py-16 sm:py-20 border-b border-white/10">
          <div className="mx-auto max-w-5xl">
            <div className="text-center max-w-2xl mx-auto">
              <p className="text-sm font-semibold uppercase tracking-wide text-[#4361ee]">
                Features
              </p>
              <h2 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
                What ClikStats actually does
              </h2>
              <p className="mt-4 text-gray-400">
                Connect your channel optionally — the product shines when you track competitors in
                folders and hunt outliers.
              </p>
            </div>

            <ul className="mt-12 grid gap-10 sm:grid-cols-2 sm:gap-x-12 sm:gap-y-12">
              {features.map((feature) => (
                <li key={feature.title} className="flex gap-4">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-xl"
                    aria-hidden
                  >
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">{feature.title}</h3>
                    <p className="mt-2 text-gray-400 leading-relaxed">{feature.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="px-4 sm:px-6 lg:px-8 xl:px-10 py-16 sm:py-20">
          <div className="mx-auto max-w-5xl flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-3xl font-bold text-white sm:text-4xl">
                Ready to track your niche?
              </h2>
              <p className="mt-3 text-lg text-[#4361ee]">
                Add competitor channels, sort into folders, and watch the outliers roll in.
              </p>
            </div>
            <div className="shrink-0">{primaryCta}</div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/10 px-4 sm:px-6 lg:px-8 xl:px-10 py-8">
        <p className="text-center text-sm text-gray-500">
          © {new Date().getFullYear()}{' '}
          <a
            href="https://clikstats.com"
            className="text-gray-500 hover:text-white transition-colors"
          >
            clikstats.com
          </a>
        </p>
      </footer>
    </div>
  );
}
