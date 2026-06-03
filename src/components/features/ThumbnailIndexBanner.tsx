'use client';

import { useEffect, useRef, useState } from 'react';
import { embedThumbnailBatch, fetchPendingThumbnailCount } from '@/lib/hooks';

const POLL_INTERVAL_MS = 30_000;
const COMPLETION_DISMISS_MS = 4000;

export function ThumbnailIndexBanner() {
  const [pending, setPending] = useState<number | null>(null);
  const [indexing, setIndexing] = useState(false);
  const [doneSnapshot, setDoneSnapshot] = useState<number | null>(null);
  const [errored, setErrored] = useState<string | null>(null);
  const stopRef = useRef(false);
  const loopActiveRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const tick = async () => {
      try {
        const count = await fetchPendingThumbnailCount();
        if (!cancelled) setPending(count);
      } catch {
        // silent
      }
    };

    tick();
    const interval = setInterval(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (pending == null || pending === 0) return;
    if (loopActiveRef.current) return;

    loopActiveRef.current = true;
    stopRef.current = false;
    setIndexing(true);
    setErrored(null);

    let processedTotal = 0;

    void (async () => {
      try {
        while (!stopRef.current) {
          const r = await embedThumbnailBatch();
          processedTotal += r.processed;
          setPending(r.remaining);
          if (r.remaining === 0) break;
          if (r.processed === 0) break;
          await new Promise((res) => setTimeout(res, 250));
        }
        if (!stopRef.current && processedTotal > 0) {
          setDoneSnapshot(processedTotal);
          setTimeout(() => setDoneSnapshot(null), COMPLETION_DISMISS_MS);
        }
      } catch (err) {
        setErrored(err instanceof Error ? err.message : 'Indexing failed.');
      } finally {
        setIndexing(false);
        loopActiveRef.current = false;
      }
    })();
  }, [pending]);

  if (!indexing && doneSnapshot == null && !errored) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-xs rounded-xl shadow-xl border border-white/20 bg-gray-900/95 backdrop-blur-md px-4 py-3">
      {indexing && (
        <div className="flex items-start gap-3">
          <span className="inline-block h-2.5 w-2.5 mt-1.5 rounded-full bg-blue-500 animate-pulse" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-white">Indexing thumbnails</p>
            <p className="text-xs text-gray-400">
              {pending != null && pending > 0 ? `${pending} remaining…` : 'Wrapping up…'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              stopRef.current = true;
            }}
            className="ml-2 text-[10px] uppercase text-gray-500 hover:text-white"
          >
            Stop
          </button>
        </div>
      )}
      {!indexing && doneSnapshot != null && (
        <p className="text-sm text-white">
          Indexed {doneSnapshot} new thumbnail{doneSnapshot === 1 ? '' : 's'}.
        </p>
      )}
      {!indexing && errored && (
        <div>
          <p className="text-sm text-red-300">Auto-indexing failed</p>
          <p className="text-xs text-gray-400 break-words">{errored}</p>
          <button
            type="button"
            onClick={() => setErrored(null)}
            className="text-[10px] uppercase text-gray-500 hover:text-white mt-1"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
