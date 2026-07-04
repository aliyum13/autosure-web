'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navLinks = [
  { href: '/sample-report', label: 'Sample Report' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/faq', label: 'FAQ' },
  { href: '/about', label: 'About' },
  { href: 'https://chat.whatsapp.com/CL4YVA9Ny0gG6vWfFIAQZP?mode=gi_t', label: 'Support', external: true },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-50 glass border-b border-ch-border/60 shadow-soft">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-ch-blue rounded-lg flex items-center justify-center transition-transform group-hover:scale-105 shadow-blue-glow">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg">
              <span className="text-ch-text">Car</span>
              <span className="text-ch-blue">Haki</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              link.external ? (
                <a key={link.href} href={link.href} target="_blank" rel="noopener noreferrer"
                  className="text-sm font-medium transition-colors text-ch-text-secondary hover:text-ch-blue">
                  {link.label}
                </a>
              ) : (
                <Link key={link.href} href={link.href}
                  className={cn('text-sm font-medium transition-colors',
                    pathname === link.href ? 'text-ch-blue' : 'text-ch-text-secondary hover:text-ch-blue')}>
                  {link.label}
                </Link>
              )
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center">
            <Link href="/">
              <Button size="sm" className="bg-ch-blue hover:bg-ch-blue-dark text-white shadow-blue-glow hover-lift">Check a Car</Button>
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
                className="block text-sm font-medium text-ch-text-secondary hover:text-ch-blue py-2"
                onClick={() => setMobileOpen(false)}>
                {link.label}
              </a>
            ) : (
              <Link key={link.href} href={link.href}
                className="block text-sm font-medium text-ch-text-secondary hover:text-ch-blue py-2"
                onClick={() => setMobileOpen(false)}>
                {link.label}
              </Link>
            )
          ))}
          <div className="pt-2">
            <Link href="/" onClick={() => setMobileOpen(false)}>
              <Button className="w-full bg-ch-blue hover:bg-ch-blue-dark text-white">Check a Car</Button>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
