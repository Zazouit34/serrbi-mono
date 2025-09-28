/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui"],
  async rewrites() {
    const webUrl = process.env.NEXT_PUBLIC_WEB_URL;
    if (!webUrl) {
      console.warn('NEXT_PUBLIC_WEB_URL is not set, skipping API rewrites');
      return [];
    }
    return [
      {
        source: "/api/trpc/:path*",
        destination: `${webUrl}/api/trpc/:path*`,
      },
    ];
  },
};
export default nextConfig;


