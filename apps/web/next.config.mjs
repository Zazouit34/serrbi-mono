/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui"],
  images: {
    domains: ["lh3.googleusercontent.com","imgs.search.brave.com","images.unsplash.com","plus.unsplash.com"],
  },
}

export default nextConfig
