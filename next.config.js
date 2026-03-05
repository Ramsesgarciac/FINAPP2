/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

if (process.env.NODE_ENV === 'production') {
  try {
    const withPWA = require('next-pwa')({
      dest: 'public',
      register: true,
      skipWaiting: true,
      reloadOnOnline: false,
      runtimeCaching: [
        {
          urlPattern: /^https?.*/,
          handler: 'NetworkFirst',
          options: {
            cacheName: 'finance-app-cache',
            expiration: {
              maxEntries: 200,
              maxAgeSeconds: 30 * 24 * 60 * 60,
            },
            networkTimeoutSeconds: 10,
          },
        },
      ],
      fallbacks: {
        document: '/offline',
      },
    });
    module.exports = withPWA(nextConfig);
  } catch {
    module.exports = nextConfig;
  }
} else {
  module.exports = nextConfig;
}