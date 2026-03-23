/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  // Set to your GitHub repo name — required for GitHub Pages subpath hosting
  basePath: '/SandCastle',
}

module.exports = nextConfig
