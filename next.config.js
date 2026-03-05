/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
};

// Solo carga next-pwa si está instalado y estamos en producción
if (process.env.NODE_ENV === 'production') {
  try {
    const withPWA = require('next-pwa')({
      dest: 'public',
      register: true,
      skipWaiting: true,
    });
    module.exports = withPWA(nextConfig);
  } catch {
    module.exports = nextConfig;
  }
} else {
  module.exports = nextConfig;
}
