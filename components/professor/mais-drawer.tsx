'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, type LucideIcon } from 'lucide-react'

export interface MaisDrawerItem {
  label: string
  href: string
  icon: LucideIcon
  descricao?: string
}

interface Props {
  aberto: boolean
  onFechar: () => void
  items: MaisDrawerItem[]
}

export default function MaisDrawer({ aberto, onFechar, items }: Props) {
  const router = useRouter()

  // ESC para fechar (mesmo padrao dos modais — acessibilidade WCAG 2.1.2)
  useEffect(() => {
    if (!aberto) return
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar() }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [aberto, onFechar])

  if (!aberto) return null

  return (
    <div className="fixed inset-0 z-[60] sm:hidden print:hidden" role="dialog" aria-modal="true" aria-label="Mais opcoes">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
        onClick={onFechar}
        aria-hidden="true"
      />

      {/* Bottom sheet — slide up */}
      <div
        className="absolute bottom-0 inset-x-0 bg-white dark:bg-slate-900 rounded-t-2xl
                   border-t border-gray-200 dark:border-slate-700 shadow-2xl
                   animate-in slide-in-from-bottom duration-200"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        {/* Drag handle visual */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1.5 bg-gray-300 dark:bg-slate-600 rounded-full" />
        </div>

        <div className="flex items-center justify-between px-4 py-2">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Mais opções</h2>
          <button
            onClick={onFechar}
            className="p-2 -mr-2 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-800 transition"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-2 pb-4">
          <div className="grid grid-cols-3 gap-1">
            {items.map(item => {
              const Icon = item.icon
              return (
                <button
                  key={item.href}
                  onClick={() => {
                    onFechar()
                    router.push(item.href)
                  }}
                  className="flex flex-col items-center justify-center gap-1.5 py-4 px-2 rounded-xl
                             text-gray-700 dark:text-gray-200
                             hover:bg-emerald-50 dark:hover:bg-emerald-900/20
                             active:scale-95 transition-all min-h-[88px]"
                >
                  <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-medium text-center leading-tight">{item.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
