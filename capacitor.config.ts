import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'br.com.educacaossbv.sisam',
  appName: 'SISAM',
  webDir: 'out',
  server: {
    // Abre direto no login — professor vai para /professor, operador para /terminal
    // Nunca carrega o site institucional
    url: 'https://educacaossbv.com.br/login',
    // Dev: descomentar abaixo e comentar acima
    // url: 'http://localhost:3000/login',
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
  },
  android: {
    allowMixedContent: false,
    captureInput: true,
    webContentsDebuggingEnabled: false,
  },
  ios: {
    contentInset: 'automatic',
    allowsLinkPreview: false,
  },
}

export default config
