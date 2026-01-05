'use client'

import { createContext, useContext, useEffect, useState, useCallback } from 'react'

// Tipos de tema disponíveis
export type Theme = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

// Interface do contexto
interface ThemeContextType {
  theme: Theme                    // Tema selecionado pelo usuário
  resolvedTheme: ResolvedTheme   // Tema efetivo (light ou dark)
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

// Contexto com valores padrão
const ThemeContext = createContext<ThemeContextType>({
  theme: 'system',
  resolvedTheme: 'light',
  setTheme: () => {},
  toggleTheme: () => {}
})

// Chave para localStorage
const THEME_STORAGE_KEY = 'sisam-theme'

// Props do Provider
interface ThemeProviderProps {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

/**
 * ThemeProvider - Gerencia o tema claro/escuro da aplicação
 *
 * Funcionalidades:
 * - Detecta preferência do sistema operacional
 * - Permite override manual pelo usuário
 * - Persiste escolha no localStorage
 * - Aplica classe 'dark' no elemento <html>
 * - Evita flash de tema incorreto no carregamento
 */
export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = THEME_STORAGE_KEY
}: ThemeProviderProps) {
  // Estado do tema selecionado
  const [theme, setThemeState] = useState<Theme>(defaultTheme)

  // Estado do tema resolvido (sempre light ou dark)
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>('light')

  // Flag para indicar que o componente foi montado (evita hydration mismatch)
  const [mounted, setMounted] = useState(false)

  // Função para obter preferência do sistema
  const getSystemTheme = useCallback((): ResolvedTheme => {
    if (typeof window === 'undefined') return 'light'
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }, [])

  // Função para aplicar o tema no DOM
  const applyTheme = useCallback((resolvedTheme: ResolvedTheme) => {
    const root = document.documentElement

    // Remove classe antiga e adiciona nova
    root.classList.remove('light', 'dark')
    root.classList.add(resolvedTheme)

    // Atualiza meta theme-color para PWA
    const metaThemeColor = document.querySelector('meta[name="theme-color"]')
    if (metaThemeColor) {
      metaThemeColor.setAttribute(
        'content',
        resolvedTheme === 'dark' ? '#0F172A' : '#F8FAFC'
      )
    }

    // Atualiza o estado
    setResolvedTheme(resolvedTheme)
  }, [])

  // Função para resolver o tema
  const resolveTheme = useCallback((theme: Theme): ResolvedTheme => {
    if (theme === 'system') {
      return getSystemTheme()
    }
    return theme
  }, [getSystemTheme])

  // Função para definir o tema (exposta via contexto)
  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme)

    // Salva no localStorage
    try {
      localStorage.setItem(storageKey, newTheme)
    } catch (e) {
      console.warn('[ThemeProvider] Erro ao salvar tema no localStorage:', e)
    }

    // Aplica o tema
    const resolved = resolveTheme(newTheme)
    applyTheme(resolved)
  }, [storageKey, resolveTheme, applyTheme])

  // Função para alternar entre light e dark
  const toggleTheme = useCallback(() => {
    const newTheme: Theme = resolvedTheme === 'light' ? 'dark' : 'light'
    setTheme(newTheme)
  }, [resolvedTheme, setTheme])

  // Efeito de inicialização (roda apenas no cliente)
  useEffect(() => {
    // Adiciona classe para evitar transições no carregamento inicial
    document.documentElement.classList.add('no-transitions')

    // Carrega tema do localStorage ou usa padrão
    let savedTheme: Theme = defaultTheme
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        savedTheme = stored
      }
    } catch (e) {
      console.warn('[ThemeProvider] Erro ao ler tema do localStorage:', e)
    }

    // Define o tema
    setThemeState(savedTheme)
    const resolved = resolveTheme(savedTheme)
    applyTheme(resolved)

    // Marca como montado
    setMounted(true)

    // Remove classe de no-transitions após um breve delay
    const timer = setTimeout(() => {
      document.documentElement.classList.remove('no-transitions')
    }, 100)

    return () => clearTimeout(timer)
  }, [defaultTheme, storageKey, resolveTheme, applyTheme])

  // Listener para mudanças na preferência do sistema
  useEffect(() => {
    if (!mounted) return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const handleChange = (e: MediaQueryListEvent) => {
      // Só atualiza se o tema estiver em 'system'
      if (theme === 'system') {
        const newResolved: ResolvedTheme = e.matches ? 'dark' : 'light'
        applyTheme(newResolved)
      }
    }

    // Adiciona listener
    mediaQuery.addEventListener('change', handleChange)

    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [mounted, theme, applyTheme])

  // Valor do contexto
  const contextValue: ThemeContextType = {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme
  }

  // Renderiza children diretamente (SSR-safe)
  // O tema é aplicado via useEffect no cliente
  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  )
}

/**
 * Hook para acessar o contexto de tema
 */
export function useTheme() {
  const context = useContext(ThemeContext)

  if (context === undefined) {
    throw new Error('useTheme deve ser usado dentro de um ThemeProvider')
  }

  return context
}

/**
 * Script para evitar flash de tema incorreto
 * Deve ser inserido no <head> do documento
 */
export const themeInitScript = `
(function() {
  try {
    var theme = localStorage.getItem('${THEME_STORAGE_KEY}') || 'system';
    var resolved = theme;
    if (theme === 'system') {
      resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.classList.add(resolved);
  } catch (e) {}
})();
`
