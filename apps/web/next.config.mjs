import createNextIntlPlugin from 'next-intl/plugin'
import createMDX from '@next/mdx'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const monorepoRoot = path.join(__dirname, '../..')

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@workspace/ui"],
  outputFileTracingRoot: monorepoRoot,
  outputFileTracingIncludes: {
    "/api/**/*": ["packages/database/generated/prisma/**/*"],
  },
  pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx'],
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
const withMDX = createMDX({
  extension: /\.mdx?$/,
})
export default withNextIntl(withMDX(nextConfig))
