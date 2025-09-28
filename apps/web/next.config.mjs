/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui"],
  images: {
    domains: ["lh3.googleusercontent.com","imgs.search.brave.com","images.unsplash.com","plus.unsplash.com"],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Add polyfill for Node 18 compatibility
      config.resolve.fallback = {
        ...config.resolve.fallback,
      };
    }
    return config;
  },
}

export default nextConfig
