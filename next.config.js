/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
        sharp: false,
        fs: false,
        path: false,
        crypto: false,
        'iconv-lite': false,
      }
      
      // Excluir pdfkit e suas dependências do bundle do cliente
      if (!config.externals) {
        config.externals = []
      }
      
      // Garantir que externals seja um array
      if (!Array.isArray(config.externals)) {
        config.externals = [config.externals]
      }
      
      config.externals.push({
        'pdfkit': 'commonjs pdfkit',
        'restructure': 'commonjs restructure',
        'fontkit': 'commonjs fontkit',
        'iconv-lite': 'commonjs iconv-lite',
      })
    }
    
    return config
  },
}

module.exports = nextConfig

