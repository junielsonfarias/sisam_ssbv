'use client'

import { useTheme, Theme } from '@/lib/theme-provider'
import { Sun, Moon, Monitor } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

interface ThemeToggleProps {
  /** Variante de exibição */
  variant?: 'icon' | 'dropdown' | 'buttons'
  /** Tamanho do componente */
  size?: 'sm' | 'md' | 'lg'
  /** Classes CSS adicionais */
  className?: string
  /** Mostrar label de texto */
  showLabel?: boolean
}

/**
 * ThemeToggle - Componente para alternar entre temas
 *
 * Variantes:
 * - icon: Apenas ícone que alterna entre light/dark
 * - dropdown: Menu dropdown com opções light/dark/system
 * - buttons: Grupo de botões para cada opção
 */
export function ThemeToggle({
  variant = 'icon',
  size = 'md',
  className = '',
  showLabel = false
}: ThemeToggleProps) {
  const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Tamanhos dos ícones
  const iconSize = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }

  // Tamanhos dos botões
  const buttonSize = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-2.5'
  }

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Ícone atual baseado no tema
  const CurrentIcon = resolvedTheme === 'dark' ? Moon : Sun

  // Labels
  const labels: Record<Theme, string> = {
    light: 'Claro',
    dark: 'Escuro',
    system: 'Sistema'
  }

  // Ícones por tema
  const ThemeIcon = ({ themeType }: { themeType: Theme }) => {
    const icons = {
      light: Sun,
      dark: Moon,
      system: Monitor
    }
    const Icon = icons[themeType]
    return <Icon className={iconSize[size]} />
  }

  // === VARIANTE: ICON (Toggle simples) ===
  if (variant === 'icon') {
    return (
      <button
        onClick={toggleTheme}
        className={`
          ${buttonSize[size]}
          rounded-lg
          bg-theme-card dark:bg-slate-700
          border border-theme-default dark:border-slate-600
          text-theme-secondary dark:text-slate-300
          hover:bg-theme-hover dark:hover:bg-slate-600
          hover:text-theme-primary dark:hover:text-white
          transition-all duration-200
          focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2
          dark:focus:ring-offset-slate-800
          ${className}
        `}
        aria-label={`Alternar para tema ${resolvedTheme === 'dark' ? 'claro' : 'escuro'}`}
        title={`Tema atual: ${resolvedTheme === 'dark' ? 'Escuro' : 'Claro'}. Clique para alternar.`}
      >
        <CurrentIcon className={`${iconSize[size]} transition-transform duration-300`} />
        {showLabel && (
          <span className="ml-2 text-sm font-medium">
            {resolvedTheme === 'dark' ? 'Escuro' : 'Claro'}
          </span>
        )}
      </button>
    )
  }

  // === VARIANTE: DROPDOWN ===
  if (variant === 'dropdown') {
    return (
      <div ref={dropdownRef} className={`relative ${className}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`
            ${buttonSize[size]}
            flex items-center gap-2
            rounded-lg
            bg-theme-card dark:bg-slate-700
            border border-theme-default dark:border-slate-600
            text-theme-secondary dark:text-slate-300
            hover:bg-theme-hover dark:hover:bg-slate-600
            hover:text-theme-primary dark:hover:text-white
            transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2
            dark:focus:ring-offset-slate-800
          `}
          aria-label="Selecionar tema"
          aria-expanded={isOpen}
          aria-haspopup="true"
        >
          <CurrentIcon className={iconSize[size]} />
          {showLabel && (
            <span className="text-sm font-medium">{labels[theme]}</span>
          )}
        </button>

        {isOpen && (
          <div
            className="
              absolute right-0 mt-2 w-40
              rounded-lg shadow-lg
              bg-theme-card dark:bg-slate-800
              border border-theme-default dark:border-slate-700
              py-1 z-50
              animate-in fade-in slide-in-from-top-2 duration-200
            "
            role="menu"
          >
            {(['light', 'dark', 'system'] as Theme[]).map((themeOption) => (
              <button
                key={themeOption}
                onClick={() => {
                  setTheme(themeOption)
                  setIsOpen(false)
                }}
                className={`
                  w-full px-4 py-2
                  flex items-center gap-3
                  text-sm text-left
                  transition-colors duration-150
                  ${theme === themeOption
                    ? 'bg-accent-light dark:bg-indigo-900/50 text-accent-primary dark:text-indigo-300 font-medium'
                    : 'text-theme-primary dark:text-slate-200 hover:bg-theme-hover dark:hover:bg-slate-700'
                  }
                `}
                role="menuitem"
              >
                <ThemeIcon themeType={themeOption} />
                <span>{labels[themeOption]}</span>
                {theme === themeOption && (
                  <span className="ml-auto text-accent-primary dark:text-indigo-400">✓</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  // === VARIANTE: BUTTONS (Grupo de botões) ===
  if (variant === 'buttons') {
    return (
      <div
        className={`
          inline-flex rounded-lg
          bg-theme-hover dark:bg-slate-800
          p-1 gap-1
          border border-theme-default dark:border-slate-700
          ${className}
        `}
        role="group"
        aria-label="Seleção de tema"
      >
        {(['light', 'dark', 'system'] as Theme[]).map((themeOption) => (
          <button
            key={themeOption}
            onClick={() => setTheme(themeOption)}
            className={`
              ${buttonSize[size]}
              flex items-center gap-1.5
              rounded-md
              text-sm font-medium
              transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-1
              ${theme === themeOption
                ? 'bg-theme-card dark:bg-slate-600 text-accent-primary dark:text-indigo-300 shadow-sm'
                : 'text-theme-secondary dark:text-slate-400 hover:text-theme-primary dark:hover:text-slate-200'
              }
            `}
            aria-pressed={theme === themeOption}
            title={`Tema ${labels[themeOption]}`}
          >
            <ThemeIcon themeType={themeOption} />
            {showLabel && <span className="hidden sm:inline">{labels[themeOption]}</span>}
          </button>
        ))}
      </div>
    )
  }

  return null
}

/**
 * ThemeToggleSimple - Versão simplificada apenas com ícone
 * Ideal para usar no header/navbar
 */
export function ThemeToggleSimple({ className = '' }: { className?: string }) {
  return <ThemeToggle variant="icon" size="md" className={className} />
}

/**
 * ThemeSelector - Seletor completo com dropdown
 * Ideal para páginas de configurações
 */
export function ThemeSelector({ className = '' }: { className?: string }) {
  return <ThemeToggle variant="dropdown" size="md" showLabel className={className} />
}
