'use client';

import { useCallback, useEffect, useState } from 'react';

const HIDE_SHORTS_KEY = 'clikstats:hide-shorts';
/** On by default — Shorts are hidden until the user turns Hide Shorts off. */
const DEFAULT_HIDE_SHORTS = true;

type Listener = (hide: boolean) => void;
const listeners = new Set<Listener>();

function readHideShorts(): boolean {
  if (typeof window === 'undefined') return DEFAULT_HIDE_SHORTS;
  try {
    const raw = window.localStorage.getItem(HIDE_SHORTS_KEY);
    if (raw === null) return DEFAULT_HIDE_SHORTS;
    return raw === '1';
  } catch {
    return DEFAULT_HIDE_SHORTS;
  }
}

function writeHideShorts(hide: boolean) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(HIDE_SHORTS_KEY, hide ? '1' : '0');
  } catch {
    // private mode / storage disabled
  }
  listeners.forEach((listener) => listener(hide));
}

export function useShortsPreference() {
  const [hideShorts, setHide] = useState<boolean>(DEFAULT_HIDE_SHORTS);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setHide(readHideShorts());

    const listener: Listener = (hide) => setHide(hide);
    listeners.add(listener);

    const onStorage = (event: StorageEvent) => {
      if (event.key === HIDE_SHORTS_KEY && event.newValue !== null) {
        setHide(event.newValue === '1');
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      listeners.delete(listener);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const setHideShorts = useCallback((next: boolean) => {
    writeHideShorts(next);
  }, []);

  return { hideShorts, setHideShorts, mounted };
}
