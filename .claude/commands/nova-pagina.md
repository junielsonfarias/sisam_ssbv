Crie uma nova pagina do sistema SISAM seguindo o padrao do projeto.

Entrada: $ARGUMENTS (formato: "role/nome-pagina descricao [tipos_permitidos]")
Exemplo: "admin/meu-recurso Gerenciamento de meu recurso [administrador,tecnico]"

Siga EXATAMENTE este padrao:

1. Criar `app/[role]/[nome]/page.tsx` com:
   - `'use client'` no topo
   - Import `ProtectedRoute`, `useToast`, `LoadingSpinner`
   - Import icons de `lucide-react`
   - Estados: `carregando`, `salvando`, dados, form
   - `useEffect` para carregar dados
   - Loading state com `<LoadingSpinner centered />`
   - Envolver tudo em `<ProtectedRoute tiposPermitidos={[...]}>`

2. Layout:
   - Header com gradiente: `bg-gradient-to-r from-slate-700 to-slate-900 rounded-xl shadow-lg p-6 text-white`
   - Icone + titulo + descricao
   - Botoes de acao no header

3. Conteudo:
   - Cards: `bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6`
   - Tabela com padrao dual: desktop table (`hidden sm:block`) + mobile cards (`sm:hidden`)
   - Paginacao se necessario
   - Estados vazios com `EmptyState`

4. Formularios (se houver):
   - Inputs: `w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm`
   - Labels: `text-xs font-medium text-gray-500 dark:text-gray-400 mb-1`
   - Grid responsivo: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`
   - Dark mode em TODOS os elementos

5. Toast para feedback: `toast.success()`, `toast.error()`
6. Rodar `npx tsc --noEmit` para verificar tipos apos criar.
