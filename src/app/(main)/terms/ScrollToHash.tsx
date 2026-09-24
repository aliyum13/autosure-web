'use client';

import { useEffect } from 'react';

// html has `scroll-behavior: smooth` site-wide (globals.css). That is a known
// Chromium footgun:
// navigating straight to a URL with a #hash does not reliably trigger the
// native fragment-jump when smooth scrolling is enabled — the browser can
// drop the initial scroll instead of animating it. Confirmed on this page:
// location.hash was set correctly but window.scrollY stayed 0.
//
// Scoped to this page rather than touching the global scroll-behavior, which
// is unrelated design-system behaviour. Runs once on mount, after layout.
export default function ScrollToHash() {
  useEffect(() => {
    if (!window.location.hash) return;
    const id = window.location.hash.slice(1);
    document.getElementById(id)?.scrollIntoView({ block: 'start' });
  }, []);

  return null;
}
