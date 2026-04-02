/**
 * Modo Kiosk — controle via JavaScript para o terminal facial.
 *
 * No Android (Capacitor): fullscreen imersivo + tela ligada já configurado
 * no MainActivity.java. Este módulo complementa com controles web.
 *
 * No browser (PWA): usa Web APIs de fullscreen e wake lock.
 */

import { isNativeApp } from '@/lib/capacitor'

/** Entra em modo fullscreen (funciona tanto no browser quanto no Capacitor) */
export async function entrarFullscreen(): Promise<boolean> {
  try {
    const el = document.documentElement
    if (el.requestFullscreen) {
      await el.requestFullscreen()
      return true
    }
    // Webkit (Safari)
    if ((el as any).webkitRequestFullscreen) {
      (el as any).webkitRequestFullscreen()
      return true
    }
    return false
  } catch {
    return false
  }
}

/** Sai do modo fullscreen */
export async function sairFullscreen(): Promise<void> {
  try {
    if (document.fullscreenElement) {
      await document.exitFullscreen()
    }
  } catch { /* */ }
}

/** Verifica se está em fullscreen */
export function isFullscreen(): boolean {
  return !!document.fullscreenElement
}

/** Bloqueia orientação em retrato (portrait) — ideal para terminal fixo */
export async function travarOrientacao(): Promise<boolean> {
  try {
    if (screen.orientation && 'lock' in screen.orientation) {
      await (screen.orientation as any).lock('portrait')
      return true
    }
    return false
  } catch {
    return false
  }
}

/**
 * Ativa modo kiosk completo para o terminal facial:
 * - Fullscreen
 * - Tela ligada (Wake Lock)
 * - Orientação travada
 * - Previne botão voltar (Capacitor: configurado no Java)
 */
export async function ativarModoKiosk(): Promise<{
  fullscreen: boolean
  wakeLock: boolean
  orientacao: boolean
}> {
  const { manterTelaLigada } = await import('@/lib/capacitor')

  const fullscreen = await entrarFullscreen()
  let wakeLock = false
  try {
    await manterTelaLigada()
    wakeLock = true
  } catch { /* */ }
  const orientacao = await travarOrientacao()

  return { fullscreen, wakeLock, orientacao }
}

/**
 * Desativa modo kiosk
 */
export async function desativarModoKiosk(): Promise<void> {
  const { liberarTela } = await import('@/lib/capacitor')

  await sairFullscreen()
  await liberarTela()

  try {
    if (screen.orientation && 'unlock' in screen.orientation) {
      (screen.orientation as any).unlock()
    }
  } catch { /* */ }
}

/**
 * Retorna status atual do modo kiosk
 */
export function statusKiosk(): {
  nativo: boolean
  fullscreen: boolean
  plataforma: string
} {
  return {
    nativo: isNativeApp(),
    fullscreen: isFullscreen(),
    plataforma: isNativeApp() ? 'android' : 'web',
  }
}
