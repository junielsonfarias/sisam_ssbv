/**
 * Capacitor Bridge — detecta plataforma e expõe features nativas.
 *
 * Uso seguro: funciona tanto no browser quanto no app nativo.
 * No browser, todas as funções são no-ops ou usam fallbacks web.
 */

import { Capacitor } from '@capacitor/core'

// ============================================================================
// Detecção de plataforma
// ============================================================================

/** Retorna true se estamos rodando dentro do app Capacitor (Android/iOS) */
export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform()
}

/** Retorna 'android', 'ios' ou 'web' */
export function getPlatform(): 'android' | 'ios' | 'web' {
  return Capacitor.getPlatform() as 'android' | 'ios' | 'web'
}

// ============================================================================
// Keep Awake — mantém tela ligada (essencial para terminal facial)
// ============================================================================

let wakeLockSentinel: WakeLockSentinel | null = null

/** Impede que a tela desligue. Usa Wake Lock API (funciona no WebView Capacitor). */
export async function manterTelaLigada(): Promise<void> {
  try {
    if ('wakeLock' in navigator) {
      wakeLockSentinel = await navigator.wakeLock.request('screen')
    }
  } catch {
    // Wake Lock não suportado ou negado pelo browser/webview
  }
}

/** Permite que a tela desligue novamente. */
export async function liberarTela(): Promise<void> {
  if (wakeLockSentinel) {
    await wakeLockSentinel.release()
    wakeLockSentinel = null
  }
}

// ============================================================================
// Haptics — vibração ao reconhecer aluno
// ============================================================================

/** Vibração curta de feedback (reconhecimento facial, sucesso) */
export async function vibrar(tipo: 'leve' | 'medio' | 'sucesso' = 'leve'): Promise<void> {
  if (isNativeApp()) {
    try {
      const { Haptics, ImpactStyle } = await import('@capacitor/haptics')
      const estilos = {
        leve: ImpactStyle.Light,
        medio: ImpactStyle.Medium,
        sucesso: ImpactStyle.Heavy,
      }
      await Haptics.impact({ style: estilos[tipo] })
      return
    } catch {
      // Plugin não disponível
    }
  }
  // Fallback web: Vibration API
  if ('vibrate' in navigator) {
    const duracao = tipo === 'leve' ? 50 : tipo === 'medio' ? 100 : 200
    navigator.vibrate(duracao)
  }
}

// ============================================================================
// Network — detectar online/offline
// ============================================================================

/** Verifica o status real de rede (mais confiável que navigator.onLine no nativo) */
export async function verificarRede(): Promise<{ conectado: boolean; tipo: string }> {
  if (isNativeApp()) {
    try {
      const { Network } = await import('@capacitor/network')
      const status = await Network.getStatus()
      return { conectado: status.connected, tipo: status.connectionType }
    } catch {
      // Fallback
    }
  }
  return { conectado: navigator.onLine, tipo: 'unknown' }
}

/** Registra listener para mudanças de rede. Retorna função para desregistrar. */
export async function ouvirMudancaRede(
  callback: (conectado: boolean) => void
): Promise<() => void> {
  if (isNativeApp()) {
    try {
      const { Network } = await import('@capacitor/network')
      const handle = await Network.addListener('networkStatusChange', (status) => {
        callback(status.connected)
      })
      return () => handle.remove()
    } catch {
      // Fallback
    }
  }
  // Fallback web
  const onOnline = () => callback(true)
  const onOffline = () => callback(false)
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
  return () => {
    window.removeEventListener('online', onOnline)
    window.removeEventListener('offline', onOffline)
  }
}

// ============================================================================
// Status Bar — configurar aparência
// ============================================================================

/** Configura a status bar para modo escuro (terminal facial) */
export async function configurarStatusBar(escuro = true): Promise<void> {
  if (!isNativeApp()) return
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    await StatusBar.setStyle({ style: escuro ? Style.Dark : Style.Light })
    if (getPlatform() === 'android') {
      await StatusBar.setBackgroundColor({ color: escuro ? '#1e293b' : '#ffffff' })
    }
  } catch {
    // Plugin não disponível
  }
}

/** Esconde a status bar (modo fullscreen para terminal) */
export async function esconderStatusBar(): Promise<void> {
  if (!isNativeApp()) return
  try {
    const { StatusBar } = await import('@capacitor/status-bar')
    await StatusBar.hide()
  } catch {
    // Plugin não disponível
  }
}

// ============================================================================
// App Lifecycle — eventos do app
// ============================================================================

/** Registra callback quando o app volta ao primeiro plano (trigger sync) */
export async function ouvirAppResume(callback: () => void): Promise<() => void> {
  if (isNativeApp()) {
    try {
      const { App } = await import('@capacitor/app')
      const handle = await App.addListener('appStateChange', ({ isActive }) => {
        if (isActive) callback()
      })
      return () => handle.remove()
    } catch {
      // Fallback
    }
  }
  // Fallback web: visibilitychange
  const handler = () => {
    if (document.visibilityState === 'visible') callback()
  }
  document.addEventListener('visibilitychange', handler)
  return () => document.removeEventListener('visibilitychange', handler)
}
