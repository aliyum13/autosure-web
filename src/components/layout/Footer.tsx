'use client';

import Link from 'next/link';
import { Shield } from 'lucide-react';
import { useState } from 'react';

const footerLinks = {
  Product: [
    { label: 'Check a Car', href: '/search' },
    { label: 'Pricing', href: '/pricing' },
    { label: 'Sample Report', href: '/sample-report' },
  ],
  Support: [
    { label: 'FAQ', href: '/faq' },
    { label: 'About CarHaki', href: '/about' },
    { label: '📞 Call / WhatsApp: 0816 869 6869', href: 'https://wa.me/2348168696869' },
    { label: 'Join WhatsApp Community', href: 'https://chat.whatsapp.com/CL4YVA9Ny0gG6vWfFIAQZP?mode=gi_t' },
    { label: 'carhakisupport@gmail.com', href: 'mailto:carhakisupport@gmail.com' },
  ],
  Legal: [
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Privacy Policy', href: '/privacy' },
  ],
};

const socials = [
  { label: 'Instagram', href: 'https://instagram.com/carhakinigeria' },
  { label: 'X', href: 'https://twitter.com/carhakinigeria' },
  { label: 'YouTube', href: 'https://youtube.com/@carhakinigeria' },
  { label: 'WhatsApp', href: 'https://chat.whatsapp.com/CL4YVA9Ny0gG6vWfFIAQZP?mode=gi_t' },
];

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
      <p className="text-sm text-ch-blue font-medium">
        ✅ You&apos;re subscribed! Watch your inbox.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 mt-3">
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@email.com"
        required
        className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-ch-blue min-w-0"
      />
      <button
        type="submit"
        disabled={status === 'loading'}
        className="bg-ch-blue hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors whitespace-nowrap disabled:opacity-60"
      >
        {status === 'loading' ? '...' : 'Subscribe'}
      </button>
    </form>
  );
}

export default function Footer() {
  return (
    <footer className="bg-ch-navy text-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">

        {/* Subscribe to Insights banner */}
        <div className="bg-slate-800 rounded-2xl px-6 py-6 mb-10 flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <h3 className="text-base font-bold text-white mb-1">CarHaki Insights 💡</h3>
            <p className="text-sm text-slate-400 leading-relaxed">
              Tips on spotting Tokunbo scams, what to check before buying, and platform updates. No spam — ever.
            </p>
          </div>
          <div className="md:w-80 shrink-0">
            <SubscribeForm />
            {/* error state */}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 bg-ch-blue rounded-lg flex items-center justify-center">
                <Shield className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold">
                <span className="text-white">Car</span>
                <span className="text-ch-blue">Haki</span>
              </span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed mb-3">
              Nigeria&apos;s vehicle intelligence platform. Know the truth about every Tokunbo car before you buy.
            </p>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-ch-green rounded-full animate-pulse" />
              <span className="text-xs text-slate-400">All systems operational</span>
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">
                {category}
              </h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-slate-300 hover:text-white transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="border-t border-slate-700 mt-10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-xs text-slate-500">
            © 2026 CarHaki Nigeria. All rights reserved. Powered by USA government records.
          </p>
          <div className="flex items-center gap-4">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                {s.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
