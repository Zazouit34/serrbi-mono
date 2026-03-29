module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || `https://${process.env.NEXT_PUBLIC_PRIMARY_DOMAIN || 'serrbi.ma'}`,
  generateRobotsTxt: true,
  sitemapSize: 5000,
  changefreq: 'daily',
  priority: 0.7,
  exclude: ['/api/*', '/admin/*', '/dashboard/*'],
  robotsTxtOptions: {
    policies: [
      { userAgent: '*', allow: '/' },
      { userAgent: '*', disallow: ['/api/', '/admin/', '/dashboard/'] },
    ],
    // No additionalSitemaps — one domain, one sitemap
  },
  alternateRefs: [
    { href: `https://${process.env.NEXT_PUBLIC_PRIMARY_DOMAIN || 'serrbi.ma'}`, hreflang: 'x-default' },
    { href: `https://${process.env.NEXT_PUBLIC_PRIMARY_DOMAIN || 'serrbi.ma'}`, hreflang: 'fr' },
    { href: `https://${process.env.NEXT_PUBLIC_PRIMARY_DOMAIN || 'serrbi.ma'}`, hreflang: 'en' },
    { href: `https://${process.env.NEXT_PUBLIC_PRIMARY_DOMAIN || 'serrbi.ma'}`, hreflang: 'ar' },
  ],
};