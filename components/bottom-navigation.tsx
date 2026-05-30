'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { LucideIcon } from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  badge?: number
  /**
   * Quando definido, o item dispara este callback em vez de navegar.
   * Use para abrir drawers/sheets (ex: item "Mais" com atalhos extras).
   * href continua obrigatorio para `pathname.startsWith` de active state —
   * passe '#mais' ou caminho inexistente quando for so callback.
   */
  onClick?: () => void
}

interface BottomNavigationProps {
  items: NavItem[]
  /** Cor do estado ativo. Default 'indigo' (admin). Portais com paleta
   *  propria (ex: professor=emerald) sobrescrevem. Classes Tailwind sao
   *  literais para o purge enxergar. */
  activeColor?: 'indigo' | 'emerald'
}

const ACTIVE_COLORS = {
  indigo:  { text: 'text-indigo-600 dark:text-indigo-400',   bar: 'bg-indigo-600 dark:bg-indigo-400' },
  emerald: { text: 'text-emerald-600 dark:text-emerald-400', bar: 'bg-emerald-600 dark:bg-emerald-400' },
} as const

export default function BottomNavigation({ items, activeColor = 'indigo' }: BottomNavigationProps) {
  const pathname = usePathname()
  const visibleItems = items.slice(0, 5)
  const cores = ACTIVE_COLORS[activeColor]

  return (
    <>
      {/* Spacer para conteudo nao ficar atras da nav */}
      <div className="h-16 sm:h-0 print:hidden" />

      <nav
        className="fixed bottom-0 inset-x-0 z-50 sm:hidden print:hidden
                   bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        aria-label="Navegacao principal mobile"
      >
        <div className="flex items-stretch justify-around h-16">
          {visibleItems.map((item) => {
            // Items com onClick nao tem rota propria — nunca ficam ativos por path.
            const isActive = !item.onClick && (pathname === item.href || pathname.startsWith(item.href + '/'))
            const className = `flex flex-col items-center justify-center flex-1 min-w-0 gap-0.5 px-1
                              transition-all active:scale-95 active:bg-gray-100 dark:active:bg-slate-800
                              ${isActive
                                ? cores.text
                                : 'text-gray-400 dark:text-gray-500'
                              }`
            const content = (
              <>
                <div className="relative">
                  <item.icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
                  {item.badge != null && item.badge > 0 && (
                    <span className="absolute -top-1 -right-2 min-w-[16px] h-4 flex items-center justify-center
                                     bg-red-500 text-white text-[10px] font-bold rounded-full px-1">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] leading-tight truncate max-w-full
                                  ${isActive ? 'font-bold' : 'font-medium'}`}>
                  {item.label}
                </span>
                {isActive && (
                  <div className={`absolute top-0 w-10 h-0.5 ${cores.bar} rounded-full`} />
                )}
              </>
            )

            return item.onClick ? (
              <button
                key={item.label}
                onClick={item.onClick}
                className={className}
                type="button"
              >
                {content}
              </button>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                className={className}
                aria-current={isActive ? 'page' : undefined}
              >
                {content}
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
