/** @type {import('next').NextConfig} */
const basePath = process.env.NEXT_BASE_PATH || '';

const nextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: import.meta.dirname,
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
};

export default nextConfig;
