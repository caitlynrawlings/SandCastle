/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
  // Set basePath if deploying to a subpath like /sandcastle-builder
  basePath: '/SandCastle',
}

module.exports = nextConfig
