Crie um novo componente React reutilizavel no padrao do SISAM.

Entrada: $ARGUMENTS (nome e descricao do componente)
Exemplo: "CardEstatistica Card com icone, valor e label para dashboards"

Siga EXATAMENTE este padrao:

1. Criar em `components/[nome-kebab].tsx` (ou `components/ui/` se generico)
2. Estrutura:
   ```typescript
   'use client'

   import { LucideIcon } from 'lucide-react'

   interface NomeComponenteProps {
     /** Descricao da prop */
     prop: string
     /** Prop opcional */
     opcional?: boolean
     /** Classes CSS adicionais */
     className?: string
   }

   export default function NomeComponente({ prop, opcional, className = '' }: NomeComponenteProps) {
     return (
       <div className={`bg-white dark:bg-slate-800 rounded-xl ... ${className}`}>
         {/* conteudo */}
       </div>
     )
   }
   ```

3. Regras:
   - Props tipadas com interface (JSDoc em cada prop)
   - Sempre aceitar `className` para customizacao
   - Dark mode em TODOS os elementos: `dark:bg-slate-800`, `dark:text-white`
   - Responsivo: `text-sm sm:text-base`, `px-3 sm:px-4`
   - Cores: indigo para primario, green/amber/red para status
   - Bordas: `border border-gray-200 dark:border-slate-700`
   - Hover states: `hover:bg-gray-50 dark:hover:bg-slate-700`
   - Focus: `focus:ring-2 focus:ring-indigo-500 focus:border-transparent`

4. Se for modal, usar `<ModalBase>` de `components/ui/modal-base.tsx`
5. Se tiver loading, usar `<LoadingSpinner>` de `components/ui/loading-spinner.tsx`
6. Se tiver estado vazio, usar `<EmptyState>` de `components/dados/EmptyState.tsx`
