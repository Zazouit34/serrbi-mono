import {cookies} from 'next/headers'
import {getRequestConfig} from 'next-intl/server'

export default getRequestConfig(async () => {
  const store = await cookies()
  const cookieLocale = store.get('locale')?.value
  const locale = cookieLocale === 'fr' || cookieLocale === 'ar' || cookieLocale === 'en' ? cookieLocale : 'fr'

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default
  }
})


