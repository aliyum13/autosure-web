import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'CarHaki — Know the Truth About Every Tokunbo Car',
  description: 'Vehicle history reports for Nigerian Tokunbo buyers. Check accident records, title brands, mileage, and safety recalls before you buy.',
  keywords: 'vehicle history, tokunbo cars, car check nigeria, VIN check, CarHaki',
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
  metadataBase: new URL('https://carhaki.com'),
  openGraph: {
    title: 'CarHaki — Know the Truth About Every Tokunbo Car',
    description: 'Vehicle history reports for Nigerian Tokunbo buyers.',
    url: 'https://carhaki.com',
    siteName: 'CarHaki',
    locale: 'en_NG',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'CarHaki — Know the Truth About Every Tokunbo Car',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CarHaki — Know the Truth About Every Tokunbo Car',
    description: 'Vehicle history reports for Nigerian Tokunbo buyers.',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans`}>
        {children}
      </body>
    </html>
  );
}
