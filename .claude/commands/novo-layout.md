Crie um layout completo com sidebar, header e dark mode no padrao SISAM.

Entrada: $ARGUMENTS (tipo: "admin", "dashboard", "publico" e modulos do menu)
Exemplo: "admin Dashboard,Usuarios,Escolas,Configuracoes"

## Estrutura do Layout

### 1. Sidebar (`components/sidebar.tsx`)
```typescript
'use client'
interface MenuItem {
  label: string
  href: string
  icon: LucideIcon
  subItems?: MenuItem[]
  badge?: number
}
```
- Colapsavel em mobile (hamburger menu)
- Indicador de pagina ativa
- Grupos de menu com titulos
- Dark mode: `bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-700`
- Logo no topo, usuario no rodape
- Largura: `w-64` desktop, `w-full` mobile (overlay)

### 2. Header (`components/header.tsx`)
- Titulo da pagina atual
- Breadcrumbs
- Botao de tema (light/dark/system)
- Avatar do usuario com dropdown (perfil, sair)
- Notificacoes badge
- Responsivo: hamburger em mobile
- `fixed top-0` com `z-50`

### 3. Layout wrapper (`app/[role]/layout.tsx`)
```typescript
'use client'
import Sidebar from '@/components/sidebar'
import Header from '@/components/header'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [sidebarAberta, setSidebarAberta] = useState(false)

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      <Sidebar aberta={sidebarAberta} onFechar={() => setSidebarAberta(false)} />
      <div className="lg:pl-64">
        <Header onMenuClick={() => setSidebarAberta(true)} />
        <main className="p-4 sm:p-6 lg:p-8 pt-20">
          {children}
        </main>
      </div>
    </div>
  )
}
```

### 4. Padrao de responsividade
- Mobile: sidebar escondida, header com hamburger
- Tablet (lg:): sidebar visivel, conteudo com `pl-64`
- Container: `max-w-7xl mx-auto` (ou `max-w-none` para telas cheias)

### 5. Rodape global (`components/rodape.tsx`)
- Copyright + creditos
- Links uteis
- Redes sociais
- Fixo no bottom com flex
