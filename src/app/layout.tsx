import type { Metadata } from 'next';
import { Playfair_Display, Crimson_Text } from 'next/font/google';
import './globals.css';

// Playfair Display carries headings; Crimson Text carries body copy. The
// variables are set on <html>, not <body>, because globals.css resolves
// --font-heading / --font-body at :root and they must be defined there.
const playfair = Playfair_Display({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-playfair',
});

// Crimson Text is not a variable font, so its weights are listed explicitly.
const crimson = Crimson_Text({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-crimson',
});

export const metadata: Metadata = {
  title: 'AutoSure — Be Sure About the Car You Are Buying',
  description: 'Be sure about every car you buy before paying. AutoSure provides detailed vehicle history reports.',
  keywords: 'vehicle history, tokunbo cars, car check nigeria, VIN check, AutoSure, autosurevin',
  // Built from public/images/logo.png by scripts/gen-favicons.js.
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/images/logo-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/images/logo-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/images/logo-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/images/logo-180.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  metadataBase: new URL('https://autosurevin.com'),
  openGraph: {
    title: 'AutoSure — Be Sure About the Car You Are Buying',
    description: 'Vehicle history reports for Nigerian Tokunbo buyers.',
    url: 'https://autosurevin.com',
    siteName: 'AutoSure',
    locale: 'en_NG',
    type: 'website',
    // No `images` here on purpose: app/opengraph-image.tsx generates the card
    // and Next wires it up. Listing a static file as well produced two
    // competing og:image tags.
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AutoSure — Be Sure About the Car You Are Buying',
    description: 'Vehicle history reports for Nigerian Tokunbo buyers.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${crimson.variable}`}>
      <body className="font-sans">
        {children}
      </body>
    </html>
  );
}
