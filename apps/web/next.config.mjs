/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui"],
  images: {
    domains: ["lh3.googleusercontent.com"],
  },
}

export default nextConfig
