'use client';

import { useState, useSyncExternalStore } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Cookies from 'js-cookie';
import { Menu, X, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navLinks = [
  { href: '/sample-report', label: 'Sample Report' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/faq', label: 'FAQ' },
  { href: '/about', label: 'About' },
  // TODO(autosure-contact): this pointed at CarHaki's WhatsApp group. Point it
  // at AutoSure's own support channel once one exists.
  { href: 'mailto:support@autosurevin.com', label: 'Support', external: true },
];

// `checkam_authed` is the non-httpOnly UI-hint cookie set alongside the real
// httpOnly session (see lib/session.ts). It only decides which link to render —
// /dashboard is independently gated server-side by verifySession(), so a spoofed
// cookie just produces a link that bounces the visitor to /login.
//
// Read through useSyncExternalStore rather than useEffect + useState because
// document.cookie is external mutable state: the server snapshot pins SSR to the
// logged-out markup (no hydration mismatch), and the snapshot is re-read on
// every render — including the re-render usePathname() triggers on navigation,
// which is what makes login and logout reflect without a hard reload.
// Module-level so the references stay stable across renders.
const subscribeToAuthCookie = () => () => {};
const getAuthedSnapshot = () => Cookies.get('checkam_authed') === '1';
const getAuthedServerSnapshot = () => false;

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const authed = useSyncExternalStore(subscribeToAuthCookie, getAuthedSnapshot, getAuthedServerSnapshot);

  const accountHref = authed ? '/dashboard' : '/login';
  const accountLabel = authed ? 'My Account' : 'Sign In';

  return (
    <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-ch-border">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 rounded-lg">
            <Image src="/images/logo-180.png" alt="" width={36} height={36} priority className="rounded-md" />
            <span className="tracking-tight font-bold text-lg">
              <span className="text-ch-ink">Auto</span>
              <span className="text-ch-primary">Sure</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              link.external ? (
                <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer"
                  className="text-sm font-medium transition-colors text-ch-text-secondary hover:text-ch-primary">
                  {link.label}
                </a>
              ) : (
                <Link key={link.href} href={link.href}
                  className={cn('text-sm font-medium transition-colors duration-200 ease-out',
                    pathname === link.href ? 'text-ch-primary' : 'text-ch-text-secondary hover:text-ch-primary')}>
                  {link.label}
                </Link>
              )
            ))}
          </div>

          {/* Desktop account + CTA */}
          <div className="hidden md:flex items-center gap-5">
            <Link href={accountHref}
              className={cn('text-sm font-medium transition-colors inline-flex items-center gap-1.5',
                pathname === accountHref ? 'text-ch-primary' : 'text-ch-text-secondary hover:text-ch-primary')}>
              {authed && <User className="w-4 h-4" />}
              {accountLabel}
            </Link>
            <Button asChild className="h-9 px-4 rounded-lg bg-ch-primary hover:bg-ch-primary-dark text-white font-semibold transition-colors duration-200 ease-out">
              <Link href="/">Check a Car</Link>
            </Button>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-ch-border px-4 py-4 space-y-3">
          {navLinks.map((link) => (
            link.external ? (
              <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer"
                className="block text-sm font-medium text-ch-text-secondary hover:text-ch-primary py-2"
                onClick={() => setMobileOpen(false)}>
                {link.label}
              </a>
            ) : (
              <Link key={link.href} href={link.href}
                className="block text-sm font-medium text-ch-text-secondary hover:text-ch-primary py-2"
                onClick={() => setMobileOpen(false)}>
                {link.label}
              </Link>
            )
          ))}
          <Link href={accountHref}
            className="flex items-center gap-1.5 text-sm font-medium text-ch-text-secondary hover:text-ch-primary py-2"
            onClick={() => setMobileOpen(false)}>
            {authed && <User className="w-4 h-4" />}
            {accountLabel}
          </Link>
          <div className="pt-2">
            <Button asChild className="w-full h-11 rounded-lg bg-ch-primary hover:bg-ch-primary-dark text-white font-semibold">
              <Link href="/" onClick={() => setMobileOpen(false)}>Check a Car</Link>
            </Button>
          </div>
        </div>
      )}
    </nav>
  );
}
