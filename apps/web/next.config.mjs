import createNextIntlPlugin from 'next-intl/plugin'

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui"],
  images: {
    domains: [
      "lh3.googleusercontent.com",
      "imgs.search.brave.com",
      "images.unsplash.com",
      "plus.unsplash.com",
      "serrbi-main-file-bucket.s3.us-east-1.amazonaws.com"
    ],
  },
}

const withNextIntl = createNextIntlPlugin()
export default withNextIntl(nextConfig)
