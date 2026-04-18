const siteName = 'Serrbi'
const domain = process.env.NEXT_PUBLIC_PRIMARY_DOMAIN || 'serrbi.ma'
const baseUrl = `https://${domain}`

const config = {
  titleTemplate: `%s | ${siteName}`,
  defaultTitle: `${siteName} — Jobs, Services & Tasks`,
  description:
    'Serrbi is a unified marketplace for jobs, services and tasks with AI matching, Auto-Apply and a Resume ATS analyzer.',
  canonical: baseUrl,
  openGraph: {
    type: 'website',
    siteName,
    url: baseUrl,
    images: [
      { url: `${baseUrl}/og/og-default.png`, width: 1200, height: 630, alt: siteName },
    ],
  },
  twitter: {
    cardType: 'summary_large_image',
  },
  additionalLinkTags: [
    { rel: 'icon', href: '/favicon.ico' },
    { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
  ],
  additionalMetaTags: [
    { name: 'theme-color', content: '#ff040E' },
  ],
}

export default config