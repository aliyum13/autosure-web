import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [],
  },
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'x-powered-by',
          value: 'AutoSure',
        },
      ],
    },
  ],
};

export default nextConfig;
