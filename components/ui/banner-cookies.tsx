'use client'

/**
 * Banner LGPD de cookies.
 *
 * Mostrado na primeira visita até o usuário tomar uma decisão.
 * As preferências ficam em localStorage (não há cookie de terceiros
 * sendo carregado antes do consentimento).
 *
 * Categorias:
 *  - "necessarios" (sempre ativos): autenticação, segurança, preferência de tema
 *  - "analytics" (opt-in): métricas de uso (Vercel Analytics, GA4 — não há ainda)
 *  - "marketing" (opt-in): rastreadores externos (não há ainda)
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Cookie, X, Check } from 'lucide-react'

const STORAGE_KEY = 'sisam-lgpd-consent-v1'

interface Preferencias {
  necessarios: true // sempre true
  analytics: boolean
  marketing: boolean
  decididoEm: string
}

function getPreferencias(): Preferencias | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (typeof parsed !== 'object' || !parsed.decididoEm) return null
    return parsed
  } catch {
    return null
  }
}

function setPreferencias(prefs: Omit<Preferencias, 'decididoEm' | 'necessarios'>) {
  const completo: Preferencias = {
    necessarios: true,
    analytics: prefs.analytics,
    marketing: prefs.marketing,
    decididoEm: new Date().toISOString(),
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(completo))
}

export function BannerCookies() {
  const [mostrar, setMostrar] = useState(false)
  const [personalizar, setPersonalizar] = useState(false)
  const [analytics, setAnalytics] = useState(false)
  const [marketing, setMarketing] = useState(false)

  useEffect(() => {
    // Pequeno delay para não aparecer no SSR
    const t = setTimeout(() => {
      const prefs = getPreferencias()
      if (!prefs) setMostrar(true)
      else {
        setAnalytics(prefs.analytics)
        setMarketing(prefs.marketing)
      }
    }, 500)
    return () => clearTimeout(t)
  }, [])

  const aceitarTodos = () => {
    setPreferencias({ analytics: true, marketing: true })
    setMostrar(false)
  }

  const apenasNecessarios = () => {
    setPreferencias({ analytics: false, marketing: false })
    setMostrar(false)
  }

  const salvarPersonalizado = () => {
    setPreferencias({ analytics, marketing })
    setMostrar(false)
  }

  if (!mostrar) return null

  return (
    <div
      role="dialog"
      aria-label="Consentimento de cookies"
      className="fixed bottom-0 left-0 right-0 z-50 p-3 sm:p-4 bg-white dark:bg-slate-800 border-t-2 border-indigo-500 shadow-2xl"
    >
      <div className="max-w-6xl mx-auto">
        {!personalizar ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Cookie className="w-8 h-8 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
            <div className="flex-1 text-sm text-gray-700 dark:text-gray-200">
              <p className="font-medium mb-1">Cookies e privacidade</p>
              <p className="text-xs leading-relaxed">
                Usamos cookies para manter você logado, proteger sua conta e melhorar a experiência.
                Você pode aceitar todos, apenas os necessários ou personalizar.{' '}
                <Link href="/politica-de-privacidade" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                  Saiba mais
                </Link>
                .
              </p>
            </div>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <button
                onClick={apenasNecessarios}
                className="px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg whitespace-nowrap"
              >
                Apenas necessários
              </button>
              <button
                onClick={() => setPersonalizar(true)}
                className="px-3 py-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg whitespace-nowrap"
              >
                Personalizar
              </button>
              <button
                onClick={aceitarTodos}
                className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg whitespace-nowrap"
              >
                Aceitar todos
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex justify-between items-start">
              <h2 className="font-semibold text-gray-900 dark:text-white">Preferências de cookies</h2>
              <button onClick={() => setPersonalizar(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <Categoria
              titulo="Necessários"
              descricao="Essenciais para o funcionamento do sistema: autenticação, segurança, preferência de tema."
              fixo
              ativo
            />
            <Categoria
              titulo="Analytics"
              descricao="Coletam estatísticas anônimas de uso para melhorar o sistema."
              ativo={analytics}
              onChange={setAnalytics}
            />
            <Categoria
              titulo="Marketing"
              descricao="Rastreadores externos. Atualmente não utilizamos cookies de marketing."
              ativo={marketing}
              onChange={setMarketing}
            />
            <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-slate-700">
              <button
                onClick={apenasNecessarios}
                className="flex-1 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700 rounded-lg"
              >
                Apenas necessários
              </button>
              <button
                onClick={salvarPersonalizado}
                className="flex-1 px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg inline-flex items-center justify-center gap-1"
              >
                <Check className="w-3 h-3" />
                Salvar preferências
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Categoria({
  titulo,
  descricao,
  ativo,
  fixo = false,
  onChange,
}: {
  titulo: string
  descricao: string
  ativo: boolean
  fixo?: boolean
  onChange?: (v: boolean) => void
}) {
  return (
    <label className={`flex items-start gap-3 p-3 rounded-lg ${fixo ? 'bg-gray-50 dark:bg-slate-900' : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-700'}`}>
      <input
        type="checkbox"
        checked={ativo}
        disabled={fixo}
        onChange={(e) => onChange?.(e.target.checked)}
        className="mt-0.5"
      />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm text-gray-900 dark:text-white">{titulo}</span>
          {fixo && (
            <span className="text-xs px-2 py-0.5 bg-gray-200 dark:bg-slate-700 text-gray-600 dark:text-gray-300 rounded-full">
              Sempre ativo
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{descricao}</p>
      </div>
    </label>
  )
}

/** Util para outros componentes consultarem se um tipo de cookie foi consentido. */
export function getCookieConsent(categoria: 'analytics' | 'marketing'): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return false
    const parsed = JSON.parse(raw)
    return !!parsed[categoria]
  } catch {
    return false
  }
}
