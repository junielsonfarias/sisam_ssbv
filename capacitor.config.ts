import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'br.com.educacaossbv.sisam',
  appName: 'SISAM',
  webDir: 'out',
  server: {
    // Produção: carrega do servidor remoto (PWA cacheia para offline)
    url: 'https://educacaossbv.com.br',
    // Dev: descomentar a linha abaixo e comentar a de cima
    // url: 'http://localhost:3000',
    // cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#1e293b',
      showSpinner: true,
      spinnerColor: '#4f46e5',
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#1e293b',
    },
    Keyboard: {
      resize: 'body',
      style: 'DARK',
    },
    App: {
      // Deep links para abrir telas específicas
    },
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  ios: {
    contentInset: 'automatic',
    allowsLinkPreview: false,
  },
}

export default config
