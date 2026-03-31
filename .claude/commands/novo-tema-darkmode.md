Crie um sistema completo de tema claro/escuro com persistencia e sem flash no padrao SISAM.

Entrada: $ARGUMENTS (nome do storage key, ex: "meuapp-theme" ou "default")

## 1. Criar `lib/theme-provider.tsx`
ThemeProvider com:
- 3 opcoes: light, dark, system (segue SO)
- Persistencia no localStorage
- Listener para mudancas na preferencia do sistema
- Classe 'dark' no `<html>` (Tailwind darkMode: 'class')
- Atualizacao do meta theme-color (PWA)
- Flag `mounted` para evitar hydration mismatch
- Classe `no-transitions` temporaria para evitar flash de animacao

Hook `useTheme()`:
```typescript
const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme()
```

## 2. Script anti-flash no layout
Inserir ANTES do React renderizar (no `<head>`):
```typescript
const themeScript = `
(function() {
  try {
    var theme = localStorage.getItem('app-theme') || 'light';
    var resolved = theme;
    if (theme === 'system') {
      resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    document.documentElement.classList.add(resolved);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', resolved === 'dark' ? '#0F172A' : '#F8FAFC');
  } catch (e) { document.documentElement.classList.add('light'); }
})();
`
// No layout:
<script dangerouslySetInnerHTML={{ __html: themeScript }} />
```

## 3. Botao de alternancia
```tsx
import { Sun, Moon, Monitor } from 'lucide-react'
import { useTheme } from '@/lib/theme-provider'

function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const opcoes = [
    { value: 'light', icon: Sun, label: 'Claro' },
    { value: 'dark', icon: Moon, label: 'Escuro' },
    { value: 'system', icon: Monitor, label: 'Sistema' },
  ]
  return (
    <div className="flex bg-gray-100 dark:bg-slate-700 rounded-lg p-0.5">
      {opcoes.map(o => (
        <button key={o.value} onClick={() => setTheme(o.value as Theme)}
          className={`p-1.5 rounded-md transition-colors ${theme === o.value ? 'bg-white dark:bg-slate-600 shadow-sm' : ''}`}>
          <o.icon className="w-4 h-4" />
        </button>
      ))}
    </div>
  )
}
```

## 4. CSS vars em globals.css
```css
:root {
  --bg-primary: #ffffff;
  --bg-card: #ffffff;
  --text-primary: #111827;
  --text-secondary: #4b5563;
  --border-default: #e5e7eb;
  --accent-primary: #4f46e5;
}
.dark {
  --bg-primary: #0f172a;
  --bg-card: #1e293b;
  --text-primary: #f8fafc;
  --text-secondary: #cbd5e1;
  --border-default: #334155;
  --accent-primary: #818cf8;
}
.no-transitions * { transition: none !important; }
```

## 5. Tailwind config
```typescript
darkMode: 'class'
```

## Regras do que deu certo
- Script inline no `<head>` ANTES do React — elimina flash 100%
- Classe `no-transitions` por 100ms — evita animacoes no carregamento
- `suppressHydrationWarning` no `<html>` — evita warning do React
- Listener de `prefers-color-scheme` — atualiza em tempo real se em 'system'
- Atualizar `meta[name="theme-color"]` — PWA respeita o tema
