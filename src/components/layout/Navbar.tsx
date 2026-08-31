'use client';

import { useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Cookies from 'js-cookie';
import { Menu, X, Check, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navLinks = [
  { href: '/sample-report', label: 'Sample Report' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/faq', label: 'FAQ' },
  { href: '/about', label: 'About' },
  // TODO(checkam-contact): this pointed at CarHaki's WhatsApp group. Point it
  // at CheckAm's own support channel once one exists.
  { href: 'mailto:checkamafrica@gmail.com', label: 'Support', external: true },
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
    <nav className="sticky top-0 z-50 bg-ch-paper rule-b">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-ch-primary rounded-full flex items-center justify-center transition-transform group-hover:scale-105">
              <Check className="w-5 h-5 text-white" strokeWidth={3} />
            </div>
            <span className="font-display tracking-tight font-bold text-lg">
              <span className="text-ch-text">Check</span>
              <span className="text-ch-primary-dark">Am</span>
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
                  className={cn('text-sm font-medium transition-colors',
                    pathname === link.href ? 'text-ch-primary-dark' : 'text-ch-text-secondary hover:text-ch-primary-dark')}>
                  {link.label}
                </Link>
              )
            ))}
          </div>

          {/* Desktop account + CTA */}
          <div className="hidden md:flex items-center gap-5">
            <Link href={accountHref}
              className={cn('text-sm font-medium transition-colors inline-flex items-center gap-1.5',
                pathname === accountHref ? 'text-ch-primary-dark' : 'text-ch-text-secondary hover:text-ch-primary-dark')}>
              {authed && <User className="w-4 h-4" />}
              {accountLabel}
            </Link>
            <Link href="/">
              <Button size="sm" className="bg-ch-primary-dark hover:bg-ch-ink text-white rounded-none">Check a Car</Button>
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button className="md:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)}>
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
            <Link href="/" onClick={() => setMobileOpen(false)}>
              <Button className="w-full bg-ch-primary-dark hover:bg-ch-ink text-white">Check a Car</Button>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
