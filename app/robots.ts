import { MetadataRoute } from 'next'

/**
 * Robots.txt para SEO — gerado automaticamente pelo Next.js
 * Bloqueia crawlers nas areas administrativas e APIs
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/admin/',
        '/api/',
        '/professor/',
        '/polo/',
        '/tecnico/',
        '/editor/',
        '/publicador/',
        '/perfil',
      ],
    },
    sitemap: 'https://educacaossbv.com.br/sitemap.xml',
  }
}
