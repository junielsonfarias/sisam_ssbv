Crie um design system completo com Tailwind CSS + dark mode no padrao SISAM.

Entrada: $ARGUMENTS (nome da marca e cor primaria, ex: "SEMED blue" ou "MinhaApp indigo")

## 1. Criar `app/globals.css` com CSS vars para temas
```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --bg-primary: #ffffff;
  --bg-card: #ffffff;
  --bg-hover: #f9fafb;
  --bg-input: #f9fafb;
  --bg-sidebar: #f8fafc;
  --text-primary: #111827;
  --text-secondary: #4b5563;
  --text-muted: #9ca3af;
  --border-default: #e5e7eb;
  --border-focus: #6366f1;
  --accent-primary: #4f46e5;
  --accent-hover: #4338ca;
  --status-success: #16a34a;
  --status-warning: #d97706;
  --status-error: #dc2626;
  --status-info: #2563eb;
}

.dark {
  --bg-primary: #0f172a;
  --bg-card: #1e293b;
  --bg-hover: #334155;
  --bg-input: #334155;
  --bg-sidebar: #0f172a;
  --text-primary: #f8fafc;
  --text-secondary: #cbd5e1;
  --text-muted: #64748b;
  --border-default: #334155;
  --border-focus: #818cf8;
  --accent-primary: #818cf8;
  --accent-hover: #6366f1;
}
```

## 2. Configurar `tailwind.config.ts`
```typescript
import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./pages/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './app/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'var(--bg-primary)',
        foreground: 'var(--text-primary)',
        'bg-primary': 'var(--bg-primary)',
        'bg-card': 'var(--bg-card)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'accent-primary': 'var(--accent-primary)',
        'status-success': 'var(--status-success)',
        'status-warning': 'var(--status-warning)',
        'status-error': 'var(--status-error)',
      },
    },
  },
}
```

## 3. Criar componentes base

### LoadingSpinner (`components/ui/loading-spinner.tsx`)
Tamanhos: sm (16px), md (32px), lg (48px). Props: size, text, centered.

### Toast (`components/toast.tsx`)
Context provider com 4 tipos: success, error, warning, info.
Auto-dismiss em 5s. Posicionado top-right.

### ModalBase (`components/ui/modal-base.tsx`)
Focus trap, Escape fecha, overlay click fecha. Larguras: sm/md/lg/xl.
ModalFooter com Cancelar/Salvar padronizados.

### EmptyState (`components/ui/empty-state.tsx`)
Tipos: carregando, vazio, nao-pesquisado, erro. Versao compacta para tabelas.

### Badge (`components/ui/badge.tsx`)
Variantes: success (green), warning (amber), error (red), info (blue), neutral (gray).

## 4. Paleta de cores padrao

| Uso | Light | Dark |
|-----|-------|------|
| Primario/acoes | indigo-600 | indigo-400 |
| Sucesso | green-600 | green-400 |
| Alerta | amber-600 | amber-400 |
| Erro | red-600 | red-400 |
| Info | blue-600 | blue-400 |
| Fundo pagina | white | slate-900 |
| Fundo card | white | slate-800 |
| Borda | gray-200 | slate-700 |
| Texto titulo | gray-900 | white |
| Texto corpo | gray-700 | gray-300 |
| Texto muted | gray-400 | gray-500 |

## 5. Classes reutilizaveis padrao

```
Input:     w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent
Label:     text-xs font-medium text-gray-500 dark:text-gray-400 mb-1
Card:      bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6
Btn-prim:  bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium
Btn-sec:   border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700
Header:    bg-gradient-to-r from-slate-700 to-slate-900 rounded-xl shadow-lg p-6 text-white
```

## 6. Criar ThemeProvider (`lib/theme-provider.tsx`)
Toggle light/dark/system. Salvar preferencia no localStorage.
Script inline no layout para evitar flash.
