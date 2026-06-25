/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Pin file tracing to this app — a stray lockfile in the home dir otherwise
  // makes Next infer the wrong workspace root.
  outputFileTracingRoot: import.meta.dirname,
};

export default nextConfig;
