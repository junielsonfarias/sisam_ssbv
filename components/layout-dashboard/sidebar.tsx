'use client'

import Link from 'next/link'
import {
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import type { MenuItem } from './types'

interface SidebarProps {
  menuAberto: boolean
  setMenuAberto: (v: boolean) => void
  menuDesktopOculto: boolean
  setMenuDesktopOculto: (v: boolean) => void
  menuItems: MenuItem[]
  isMenuItemActive: (href: string) => boolean
  isGroupActive: (item: MenuItem) => boolean
  isGroupExpanded: (label: string, item: MenuItem) => boolean
  toggleGrupo: (label: string) => void
}

export function Sidebar({
  menuAberto,
  menuDesktopOculto,
  setMenuAberto,
  setMenuDesktopOculto,
  menuItems,
  isMenuItemActive,
  isGroupActive,
  isGroupExpanded,
  toggleGrupo,
}: SidebarProps) {
  return (
    <>
      <aside
        className={`
          fixed inset-y-0 left-0 z-40
          w-52 sm:w-56 md:w-64 bg-white dark:bg-slate-800 shadow-lg dark:shadow-slate-900/50 border-r border-gray-200 dark:border-slate-700 transform transition-all duration-300 ease-in-out
          ${menuAberto ? 'translate-x-0' : '-translate-x-full'} ${menuDesktopOculto ? 'lg:-translate-x-full' : 'lg:translate-x-0'}
          flex-shrink-0 overflow-y-auto
          pt-14 sm:pt-16 lg:pt-[72px]
          print:hidden
        `}
      >
        <nav className="mt-4 sm:mt-6 px-2 sm:px-3 pb-4">
          <ul className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon

              // Item com subitens (grupo expansível)
              if (item.children) {
                const expanded = isGroupExpanded(item.label, item)
                const groupActive = isGroupActive(item)
                return (
                  <li key={item.label}>
                    <button
                      onClick={() => toggleGrupo(item.label)}
                      className={`
                        w-full flex items-center px-2 sm:px-3 py-2 sm:py-2.5 text-sm rounded-lg transition-all duration-200
                        ${groupActive
                          ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium'
                          : 'text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 hover:text-indigo-600 dark:hover:text-indigo-400'
                        }
                      `}
                    >
                      <Icon className={`w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 flex-shrink-0 ${groupActive ? 'text-indigo-600 dark:text-indigo-400' : ''}`} />
                      <span className="truncate flex-1 text-left">{item.label}</span>
                      {expanded
                        ? <ChevronDown className="w-4 h-4 flex-shrink-0 ml-1 transition-transform" />
                        : <ChevronRight className="w-4 h-4 flex-shrink-0 ml-1 transition-transform" />
                      }
                    </button>
                    {expanded && (
                      <ul className="mt-1 ml-3 sm:ml-4 pl-2 sm:pl-3 border-l-2 border-indigo-100 dark:border-indigo-800/50 space-y-0.5">
                        {item.children.map((child) => {
                          const ChildIcon = child.icon
                          const childActive = child.href ? isMenuItemActive(child.href) : false
                          return (
                            <li key={child.href || child.label}>
                              <Link
                                href={child.href || '#'}
                                className={`
                                  flex items-center px-2 sm:px-3 py-1.5 sm:py-2 text-sm rounded-lg transition-all duration-200
                                  ${childActive
                                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30 font-medium'
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 hover:text-indigo-600 dark:hover:text-indigo-400'
                                  }
                                `}
                                onClick={() => {
                                  setMenuAberto(false)
                                  setMenuDesktopOculto(true)
                                }}
                              >
                                <ChildIcon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 mr-2 sm:mr-2.5 flex-shrink-0 ${childActive ? 'text-white' : ''}`} />
                                <span className="truncate">{child.label}</span>
                                {childActive && (
                                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                                )}
                              </Link>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </li>
                )
              }

              // Item simples (sem filhos)
              const isActive = item.href ? isMenuItemActive(item.href) : false
              return (
                <li key={item.href || item.label}>
                  <Link
                    href={item.href || '#'}
                    className={`
                      flex items-center px-2 sm:px-3 py-2 sm:py-2.5 text-sm rounded-lg transition-all duration-200
                      ${isActive
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30 font-medium'
                        : 'text-gray-700 dark:text-gray-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/50 hover:text-indigo-600 dark:hover:text-indigo-400'
                      }
                    `}
                    onClick={() => {
                      setMenuAberto(false)
                      setMenuDesktopOculto(true)
                    }}
                  >
                    <Icon className={`w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3 flex-shrink-0 ${isActive ? 'text-white' : ''}`} />
                    <span className="truncate">{item.label}</span>
                    {isActive && (
                      <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </aside>

      {/* Overlay para mobile e tablet - z-30 para ficar abaixo do sidebar (z-40) (oculto na impressão) */}
      {menuAberto && (
        <div
          className="fixed inset-0 bg-black/50 dark:bg-black/70 z-30 lg:hidden print:hidden"
          onClick={() => setMenuAberto(false)}
        />
      )}

      {/* Overlay para desktop quando menu está visível (oculto na impressão) */}
      {!menuDesktopOculto && (
        <div
          className="hidden lg:block fixed inset-0 bg-black/30 dark:bg-black/50 z-30 print:hidden"
          onClick={() => setMenuDesktopOculto(true)}
        />
      )}
    </>
  )
}
