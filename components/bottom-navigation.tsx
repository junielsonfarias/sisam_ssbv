'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { LucideIcon } from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  badge?: number
}

interface BottomNavigationProps {
  items: NavItem[]
}

export default function BottomNavigation({ items }: BottomNavigationProps) {
  const pathname = usePathname()
  const visibleItems = items.slice(0, 5)

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
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center flex-1 min-w-0 gap-0.5 px-1
                           transition-all active:scale-95 active:bg-gray-100 dark:active:bg-slate-800
                           ${isActive
                             ? 'text-indigo-600 dark:text-indigo-400'
                             : 'text-gray-400 dark:text-gray-500'
                           }`}
                aria-current={isActive ? 'page' : undefined}
              >
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
                  <div className="absolute top-0 w-10 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
                )}
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
