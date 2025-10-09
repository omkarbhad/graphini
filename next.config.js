/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@drawnix/drawnix', '@plait-board/react-board', '@plait-board/react-text'],
  experimental: {
    esmExternals: true,
  },
}

module.exports = nextConfig

