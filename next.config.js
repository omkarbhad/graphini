const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@drawnix/drawnix', '@plait-board/react-board', '@plait-board/react-text'],
  experimental: {
    esmExternals: true,
    // Performance optimizations
    optimizePackageImports: ['lucide-react', '@radix-ui/react-icons'],
  },
  sassOptions: {
    api: 'modern-compiler',
    quietDeps: true,
  },
  // Performance optimizations
  compiler: {
    // Remove console.log in production
    removeConsole: process.env.NODE_ENV === 'production',
  },
  // Optimize images
  images: {
    formats: ['image/webp', 'image/avif'],
  },
  // Webpack optimizations
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  },
}

module.exports = withBundleAnalyzer(nextConfig)