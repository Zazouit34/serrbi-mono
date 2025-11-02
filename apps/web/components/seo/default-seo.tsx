"use client"

import Head from 'next/head'
import { OrganizationJsonLd } from 'next-seo'
import { generateDefaultSeo, generateNextSeo } from 'next-seo/pages'
import { usePathname } from 'next/navigation'
import defaultConfig from '../../next-seo.config'

function normalize(host?: string | null) {
  const raw = (host || '').trim().toLowerCase()
  return raw.replace(/^https?:\/\//, '').split('/')[0]
}

export function SeoDefaults() {
  const pathname = usePathname()
  const host = typeof window !== 'undefined' ? window.location.hostname : ''
  const primary = normalize(process.env.NEXT_PUBLIC_PRIMARY_DOMAIN) || 'serrbi.ma'
  const secondary = normalize(process.env.NEXT_PUBLIC_SECONDARY_DOMAIN) || 'serrbi.com'
  const current = normalize(host)
  const base = current === secondary ? `https://${secondary}` : `https://${primary}`
  const canonical = `${base}${pathname || ''}`

  return (
    <>
      <Head>
        {generateDefaultSeo(defaultConfig as any)}
        {generateNextSeo({ canonical })}
        {/* Hreflang alternates for domain targeting */}
        <link rel="alternate" hrefLang="x-default" href={`https://${primary}${pathname || ''}`} />
        <link rel="alternate" hrefLang="fr" href={`https://${primary}${pathname || ''}`} />
        <link rel="alternate" hrefLang="en" href={`https://${secondary}${pathname || ''}`} />
        {/* WebSite JSON-LD with SearchAction for sitelinks search box */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              url: base,
              name: "Serrbi",
              potentialAction: {
                "@type": "SearchAction",
                target: `${base}/jobs?search={search_term_string}`,
                "query-input": "required name=search",
              },
            }),
          }}
        />
      </Head>
      <OrganizationJsonLd
        type="Organization"
        name="Serrbi"
        url={base}
        logo={`${base}/favicon.ico`}
        sameAs={[`https://${primary}`, `https://${secondary}`]}
      />
    </>
  )
}
