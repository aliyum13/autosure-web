import type { Metadata } from 'next';
import { Fraunces, Archivo } from 'next/font/google';
import './globals.css';

// Fraunces carries the masthead voice; Archivo is the news grotesque doing
// body, UI and tabular data. See DESIGN.md — no third face.
const fraunces = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-fraunces',
  axes: ['SOFT', 'WONK', 'opsz'],
});

const archivo = Archivo({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-archivo',
});

export const metadata: Metadata = {
  title: 'CheckAm — Check Am Before You Buy',
  description: 'Vehicle history reports for Nigerian Tokunbo buyers. Accident records, title brands, mileage and safety recalls — check am before you pay anybody.',
  keywords: 'vehicle history, tokunbo cars, car check nigeria, VIN check, CheckAm',
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/logo-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcut: '/logo-icon.png',
  },
  metadataBase: new URL('https://checkamvin.com'),
  openGraph: {
    title: 'CheckAm — Check Am Before You Buy',
    description: 'Vehicle history reports for Nigerian Tokunbo buyers.',
    url: 'https://checkamvin.com',
    siteName: 'CheckAm',
    locale: 'en_NG',
    type: 'website',
    // No `images` here on purpose: app/opengraph-image.tsx generates the card
    // and Next wires it up. Listing a static file as well produced two
    // competing og:image tags.
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CheckAm — Check Am Before You Buy',
    description: 'Vehicle history reports for Nigerian Tokunbo buyers.',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${fraunces.variable} ${archivo.variable} font-sans`}>
        {children}
      </body>
    </html>
  );
}
