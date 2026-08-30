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
          value: 'CheckAm',
        },
      ],
    },
  ],
};

export default nextConfig;
