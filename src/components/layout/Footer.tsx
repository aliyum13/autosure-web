'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';

const footerLinks = {
  'Quick Links': [
    { label: 'Check a Car', href: '/search' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Sample Report', href: '/sample-report' },
    { label: 'About AutoSure', href: '/about' },
  ],
  Support: [
    { label: 'FAQ', href: '/faq' },
    // TODO(autosure-contact): AutoSure has no WhatsApp line or social accounts yet.
    // A phone row and a community-group row sat here, both CarHaki's.
    // Restore them once AutoSure has its own.
    { label: 'support@autosurevin.com', href: 'mailto:support@autosurevin.com' },
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Privacy Policy', href: '/privacy' },
  ],
};

// TODO(autosure-contact): AutoSure has no social accounts yet. These were
// CarHaki's handles, and pointing at them would hand AutoSure's traffic to
// another brand. Empty until AutoSure has its own — the Footer renders
// nothing for the row while it is.
const socials: { label: string; href: string }[] = [];

function SubscribeForm() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus('loading');
    try {
      const res = await fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      if (res.ok) setStatus('success');
      else setStatus('error');
    } catch {
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <p className="text-sm text-ch-primary-on-dark font-medium">
        ✅ You&apos;re subscribed! Watch your inbox.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mt-4">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        required
        aria-label="Email address"
        className="flex-1 bg-white/[0.06] border border-white/15 rounded-lg px-3 h-10 text-sm text-white placeholder-white/40 focus:border-ch-primary-on-dark min-w-0 transition-colors duration-200 ease-out"
      />
      <button
        type="submit"
        disabled={status === 'loading'}
        className="bg-ch-primary hover:bg-ch-primary-dark text-white text-sm font-semibold px-4 h-10 rounded-lg transition-colors duration-200 ease-out whitespace-nowrap disabled:opacity-60"
      >
        {status === 'loading' ? '...' : 'Subscribe'}
      </button>
    </form>
  );
}

export default function Footer() {
  return (
    <footer className="bg-ch-ink text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1.4fr]">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2">
              {/* The logo carries its own white ground, so it sits on a white tile. */}
              <Image src="/images/logo-180.png" alt="" width={36} height={36} className="rounded-md bg-white" />
              <span className="tracking-tight font-bold text-lg">
                <span className="text-white">Auto</span>
                <span className="text-ch-primary-on-dark">Sure</span>
              </span>
            </div>
            <p className="mt-4 text-sm text-white/60">
              Nigeria&apos;s vehicle intelligence platform. Know the truth about every Tokunbo car before you buy.
            </p>
            {socials.length > 0 && (
              <div className="mt-4 flex items-center gap-4">
                {socials.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-white/60 hover:text-white transition-colors duration-200 ease-out"
                  >
                    {s.label}
                  </a>
                ))}
              </div>
            )}
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-white/60">
                {category}
              </h4>
              <ul className="mt-4 space-y-3">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/80 hover:text-white transition-colors duration-200 ease-out break-all sm:break-normal"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Email capture — posts to the existing /api/subscribe. */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-white/60">
              AutoSure Insights
            </h4>
            <p className="mt-4 text-sm text-white/60">
              Tips on spotting Tokunbo scams, what to check before buying, and platform updates. No spam — ever.
            </p>
            <SubscribeForm />
          </div>
        </div>

        <div className="border-t border-white/10 mt-12 pt-6">
          <p className="text-xs text-white/60">
            © 2026 AutoSure Nigeria. All rights reserved. Powered by ClearVin.
          </p>
        </div>
      </div>
    </footer>
  );
}
