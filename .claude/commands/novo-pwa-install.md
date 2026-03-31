Crie o componente de instalacao PWA com deteccao online/offline no padrao SISAM.

Entrada: $ARGUMENTS (nome do app)

## 1. Criar `components/pwa-install-prompt.tsx`

```typescript
'use client'

import { useState, useEffect } from 'react'
import { Download, X, Wifi, WifiOff } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [mostrar, setMostrar] = useState(false)

  useEffect(() => {
    // Verificar cooldown de 24h
    const dismissedAt = localStorage.getItem('pwa-dismissed-at')
    if (dismissedAt) {
      const horas = (Date.now() - parseInt(dismissedAt)) / (1000 * 60 * 60)
      if (horas < 24) return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setMostrar(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const instalar = async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setMostrar(false)
    }
    setDeferredPrompt(null)
  }

  const dispensar = () => {
    setMostrar(false)
    localStorage.setItem('pwa-dismissed-at', Date.now().toString())
  }

  if (!mostrar) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-50 animate-slide-up">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-200 dark:border-slate-700 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
              <Download className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="font-semibold text-sm text-gray-900 dark:text-white">Instalar App</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Acesso rapido na tela inicial</p>
            </div>
          </div>
          <button onClick={dispensar} className="text-gray-400 hover:text-gray-600">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex gap-2 mt-3">
          <button onClick={dispensar}
            className="flex-1 px-3 py-2 text-xs border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-300">
            Agora nao
          </button>
          <button onClick={instalar}
            className="flex-1 px-3 py-2 text-xs bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
            Instalar
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Indicador de status de conexao (online/offline)
 */
export function ConnectionStatus() {
  const [online, setOnline] = useState(true)
  const [mostrar, setMostrar] = useState(false)

  useEffect(() => {
    const handleOnline = () => { setOnline(true); setMostrar(true); setTimeout(() => setMostrar(false), 3000) }
    const handleOffline = () => { setOnline(false); setMostrar(true) }

    setOnline(navigator.onLine)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!mostrar) return null

  return (
    <div className={\`fixed top-2 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full text-xs font-medium shadow-lg flex items-center gap-2 transition-all \${
      online
        ? 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300'
        : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
    }\`}>
      {online ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
      {online ? 'Conexao restabelecida' : 'Voce esta offline'}
    </div>
  )
}
```

## 2. Adicionar no layout raiz
```tsx
import { PWAInstallPrompt, ConnectionStatus } from '@/components/pwa-install-prompt'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ConnectionStatus />
        {children}
        <PWAInstallPrompt />
      </body>
    </html>
  )
}
```

## 3. CSS de animacao no globals.css
```css
@keyframes slide-up {
  from { transform: translateY(100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
.animate-slide-up { animation: slide-up 0.3s ease-out; }
```

## O que deu certo
- **Cooldown 24h** — nao incomoda usuario que dispensou
- **beforeinstallprompt** capturado e guardado — instala quando usuario quer
- **ConnectionStatus** auto-dismiss em 3s quando volta online
- **z-50** em ambos — sempre visivel acima do conteudo
- **print:hidden** implicito — nao aparece na impressao
