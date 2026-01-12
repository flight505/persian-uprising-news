const withPWA = require('@ducanh2912/next-pwa').default({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: false, // Temporarily enabled for testing push notifications
  swSrc: 'public/sw-custom.js',
  publicExcludes: ['!marker-icon*.png', '!marker-shadow*.png'], // Exclude Leaflet markers from precache
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/api\..*/i,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        expiration: {
          maxEntries: 50,
          maxAgeSeconds: 300 // 5 minutes
        }
      }
    },
    {
      urlPattern: /^https:\/\/.*\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
      handler: 'CacheFirst',
      options: {
        cacheName: 'image-cache',
        expiration: {
          maxEntries: 200,
          maxAgeSeconds: 2592000 // 30 days
        }
      }
    }
  ]
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Disabled for Leaflet compatibility
  images: {
    domains: ['imagedelivery.net'], // Cloudflare Images
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 60 * 60 * 24 * 30, // 30 days
  },
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=300, stale-while-revalidate=600'
          }
        ]
      },
      {
        source: '/_next/image',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=2592000, immutable'
          }
        ]
      }
    ];
  },
  // Code splitting optimization
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Split large libraries into separate chunks
      config.optimization.splitChunks = {
        chunks: 'all',
        cacheGroups: {
          leaflet: {
            test: /[\\/]node_modules[\\/](react-leaflet|leaflet)[\\/]/,
            name: 'leaflet',
            priority: 20,
          },
          algolia: {
            test: /[\\/]node_modules[\\/](algoliasearch|fuse\.js)[\\/]/,
            name: 'search',
            priority: 15,
          },
          firebase: {
            test: /[\\/]node_modules[\\/](firebase-admin)[\\/]/,
            name: 'firebase',
            priority: 10,
          },
        },
      };
    }
    return config;
  },
};

module.exports = withPWA(nextConfig);
