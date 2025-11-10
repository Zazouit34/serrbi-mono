import createNextIntlPlugin from 'next-intl/plugin'

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui"],
  images: {
    domains: [
      "lh3.googleusercontent.com",
      "imgs.search.brave.com",
      "images.unsplash.com",
      "unsplash.com",
      "plus.unsplash.com",
      "serrbi-main-file-bucket.s3.amazonaws.com",
      "serrbi-main-file-bucket.s3.us-east-1.amazonaws.com",
    ],
  },
  async redirects() {
    return [
      // Legacy French job URLs -> new apply route
      {
        source: "/emploi/:slug-:id",
        destination: "/jobs/apply/:slug/:id",
        permanent: true,
      },
      {
        source: "/emploi/:slug/:id",
        destination: "/jobs/apply/:slug/:id",
        permanent: true,
      },
    ]
  },
}

const withNextIntl = createNextIntlPlugin()
export default withNextIntl(nextConfig)
