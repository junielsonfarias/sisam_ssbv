Crie uma navegacao bottom tab bar para mobile no padrao moderno (substitui hamburger).

Entrada: $ARGUMENTS (itens do menu, ex: "Dashboard,Alunos,Turmas,Perfil")

## Por que Bottom Nav?
- Zona do polegar: 75% das interacoes mobile sao na parte inferior
- Google Classroom, ClassDojo, Moodle — todos usam bottom nav
- Hamburger menu tem 3x menos engajamento que bottom nav
- WCAG 2.2: touch targets de 48px na area de alcance natural

## Implementacao

### Criar `components/bottom-navigation.tsx`
```typescript
'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { LucideIcon, LayoutDashboard, Users, BookOpen, Settings, User } from 'lucide-react'

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

  // Maximo 5 itens (padrao iOS/Android)
  const visibleItems = items.slice(0, 5)

  return (
    <>
      {/* Spacer para conteudo nao ficar atras da nav */}
      <div className="h-16 sm:h-0 print:hidden" />

      {/* Bottom Nav — visivel APENAS em mobile */}
      <nav className="fixed bottom-0 inset-x-0 z-50 sm:hidden print:hidden
                       bg-white dark:bg-slate-900 border-t border-gray-200 dark:border-slate-700
                       safe-area-inset-bottom">
        <div className="flex items-stretch justify-around h-16">
          {visibleItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center flex-1 min-w-0 gap-0.5 px-1
                           transition-colors active:scale-95 active:bg-gray-100 dark:active:bg-slate-800
                           ${isActive
                             ? 'text-indigo-600 dark:text-indigo-400'
                             : 'text-gray-500 dark:text-gray-400'
                           }`}
              >
                <div className="relative">
                  <item.icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : ''}`} />
                  {item.badge && item.badge > 0 && (
                    <span className="absolute -top-1 -right-2 min-w-[16px] h-4 flex items-center justify-center
                                     bg-red-500 text-white text-[10px] font-bold rounded-full px-1">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </div>
                <span className={`text-[10px] leading-tight truncate max-w-full
                                  ${isActive ? 'font-semibold' : 'font-medium'}`}>
                  {item.label}
                </span>

                {/* Indicador de ativo */}
                {isActive && (
                  <div className="absolute top-0 w-12 h-0.5 bg-indigo-600 dark:bg-indigo-400 rounded-full" />
                )}
              </Link>
            )
          })}
        </div>
      </nav>
    </>
  )
}
```

### CSS para safe area (iPhone com notch)
```css
/* globals.css */
.safe-area-inset-bottom {
  padding-bottom: env(safe-area-inset-bottom, 0);
}
```

### Uso no layout
```typescript
// app/admin/layout.tsx
import BottomNavigation from '@/components/bottom-navigation'
import { LayoutDashboard, Users, BookOpen, GraduationCap, User } from 'lucide-react'

const MENU_MOBILE = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Alunos', href: '/admin/alunos', icon: Users },
  { label: 'Turmas', href: '/admin/turmas', icon: BookOpen },
  { label: 'SISAM', href: '/admin/dados', icon: GraduationCap },
  { label: 'Perfil', href: '/perfil', icon: User },
]

export default function AdminLayout({ children }) {
  return (
    <div className="min-h-screen">
      <Sidebar className="hidden sm:block" />  {/* Desktop only */}
      <main className="sm:ml-64 pb-16 sm:pb-0"> {/* padding-bottom no mobile */}
        {children}
      </main>
      <BottomNavigation items={MENU_MOBILE} />  {/* Mobile only */}
    </div>
  )
}
```

## Padroes importantes
- **Max 5 itens** — mais que isso confunde
- **48px altura minima** dos botoes (touch target WCAG)
- **active:scale-95** — feedback visual de toque
- **Badge para notificacoes** — numero ou ponto vermelho
- **safe-area-inset-bottom** — suporte iPhone com notch
- **print:hidden** — nao aparece na impressao
- **sm:hidden** — some em tablets/desktop (sidebar assume)
- Indicador de ativo no topo (barra colorida)
- Icones com `stroke-[2.5]` quando ativo (mais grosso)
- Texto truncado com `truncate` para labels longas
