/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer, webpack }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
        sharp: false,
        fs: false,
        path: false,
        crypto: false,
      }
      
      // Excluir pdfkit e suas dependências do bundle do cliente
      config.externals = config.externals || []
      config.externals.push({
        'pdfkit': 'commonjs pdfkit',
        'restructure': 'commonjs restructure',
        'fontkit': 'commonjs fontkit',
      })
    }
    
    // Garantir que o webpack runtime está configurado corretamente
    config.resolve.alias = {
      ...config.resolve.alias,
    }
    
    return config
  },
}

module.exports = nextConfig

