/**
 * JSON-LD Structured Data para SEO
 * Dados estruturados da organizacao educacional (schema.org)
 */
export function OrganizationJsonLd() {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: 'SEMED - Secretaria Municipal de Educacao',
    alternateName: 'SEMED Sao Sebastiao da Boa Vista',
    url: 'https://educacaossbv.com.br',
    logo: 'https://educacaossbv.com.br/logo-semed.png',
    description:
      'Secretaria Municipal de Educacao de Sao Sebastiao da Boa Vista, Para. Sistema Integrado de Acompanhamento Municipal.',
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Sao Sebastiao da Boa Vista',
      addressRegion: 'PA',
      addressCountry: 'BR',
    },
    parentOrganization: {
      '@type': 'GovernmentOrganization',
      name: 'Prefeitura Municipal de Sao Sebastiao da Boa Vista',
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
