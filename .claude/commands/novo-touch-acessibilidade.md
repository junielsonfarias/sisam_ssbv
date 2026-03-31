Aplique otimizacoes de touch e acessibilidade mobile no padrao WCAG 2.2.

Entrada: $ARGUMENTS (escopo: "botoes", "formularios", "tabelas", "animacoes" ou "completo")

## 1. Touch Targets — Minimo 44x44px (WCAG 2.2 AAA)
```css
/* globals.css — regra global para elementos interativos */
button, a, [role="button"], input[type="checkbox"], input[type="radio"],
select, summary, [tabindex]:not([tabindex="-1"]) {
  min-height: 44px;
  min-width: 44px;
}

/* Excecao para inline links em texto */
p a, li a, span a {
  min-height: auto;
  min-width: auto;
}
```

### Classes Tailwind para touch targets
```
Botao padrao:    min-h-[44px] px-4 py-2.5
Botao compacto:  min-h-[44px] px-3 py-2
Icone clicavel:  min-h-[44px] min-w-[44px] flex items-center justify-center
Checkbox/Radio:  w-5 h-5 (com area de toque maior via padding)
Tab:             min-h-[44px] px-4
```

## 2. Active State — Feedback visual de toque
```typescript
// TODOS os botoes devem ter active state
<button className="... active:scale-95 transition-transform duration-100">
  Texto
</button>

// Links com area de toque
<Link className="... active:bg-gray-100 dark:active:bg-slate-800 transition-colors">
  Item
</Link>

// Cards clicaveis
<div className="... active:scale-[0.98] transition-transform cursor-pointer">
  Card
</div>
```

## 3. Respeitar Reduced Motion
```typescript
// Hook
export function usePrefersReducedMotion(): boolean {
  const [prefersReduced, setPrefersReduced] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReduced(mq.matches)
    const handler = (e: MediaQueryListEvent) => setPrefersReduced(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  return prefersReduced
}
```

### CSS global
```css
/* globals.css */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

## 4. Focus Visible — Foco apenas por teclado
```css
/* globals.css */
:focus-visible {
  outline: 2px solid #4f46e5;
  outline-offset: 2px;
  border-radius: 4px;
}

/* Remover outline de cliques do mouse */
:focus:not(:focus-visible) {
  outline: none;
}
```

## 5. Skip to Content — Pular para conteudo
```typescript
// No layout raiz, PRIMEIRO elemento:
<a href="#main-content"
   className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100]
              focus:bg-indigo-600 focus:text-white focus:px-4 focus:py-2 focus:rounded-lg">
  Pular para conteudo principal
</a>

// No main:
<main id="main-content" tabIndex={-1}>
  {children}
</main>
```

## 6. Formularios Acessiveis
```typescript
// SEMPRE label associado
<label htmlFor="email" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
  Email
</label>
<input id="email" type="email" inputMode="email" autoComplete="email"
  aria-describedby="email-erro"
  aria-invalid={!!erros.email}
  className="..." />
{erros.email && (
  <p id="email-erro" role="alert" className="text-xs text-red-500 mt-1">{erros.email}</p>
)}

// Input types corretos para teclado mobile
<input type="email" inputMode="email" />     // @ visivel
<input type="tel" inputMode="tel" />         // teclado numerico
<input type="number" inputMode="numeric" />  // numeros
<input type="url" inputMode="url" />         // .com visivel
<input type="search" inputMode="search" />   // botao buscar
```

## 7. Haptic Feedback (vibracao sutil)
```typescript
export function haptic(tipo: 'leve' | 'medio' | 'forte' = 'leve') {
  if (!('vibrate' in navigator)) return

  const padroes = {
    leve: [10],          // toque sutil
    medio: [30],         // confirmacao
    forte: [50, 30, 50], // alerta/erro
  }

  try { navigator.vibrate(padroes[tipo]) } catch {}
}

// Uso
<button onClick={() => { haptic('leve'); salvar() }}>Salvar</button>
<button onClick={() => { haptic('forte'); deletar() }}>Deletar</button>
```

## 8. Contraste de Cores (WCAG AA: 4.5:1)
```
Texto normal (< 18px): contraste minimo 4.5:1
Texto grande (>= 18px ou 14px bold): contraste minimo 3:1
Elementos interativos: contraste minimo 3:1

Cores que PASSAM no SISAM:
- gray-900 em white: 15.4:1 ✅
- gray-700 em white: 9.1:1 ✅
- indigo-600 em white: 5.3:1 ✅
- gray-400 em white: 3.5:1 ⚠️ (so texto grande)
- gray-300 em white: 2.3:1 ❌ (usar apenas bordas)

Dark mode:
- white em slate-800: 13.1:1 ✅
- gray-300 em slate-800: 7.9:1 ✅
- gray-400 em slate-800: 4.8:1 ✅
- gray-500 em slate-800: 3.1:1 ⚠️
```

## 9. Scrollbar Mobile
```css
/* globals.css — scrollbar customizada */
@supports (scrollbar-width: thin) {
  * { scrollbar-width: thin; scrollbar-color: #94a3b8 transparent; }
  .dark * { scrollbar-color: #475569 transparent; }
}

/* Esconder scrollbar no mobile (swipe nativo) */
@media (max-width: 640px) {
  .hide-scrollbar { scrollbar-width: none; -ms-overflow-style: none; }
  .hide-scrollbar::-webkit-scrollbar { display: none; }
}
```

## Checklist de Acessibilidade Mobile
- [ ] Todos botoes tem min 44x44px
- [ ] Todos botoes tem `active:scale-95` ou `active:bg-*`
- [ ] Labels associados a TODOS inputs (`htmlFor` + `id`)
- [ ] Input types corretos (`email`, `tel`, `number`)
- [ ] `aria-invalid` e `aria-describedby` em campos com erro
- [ ] `prefers-reduced-motion` respeitado
- [ ] `focus-visible` em vez de `focus`
- [ ] Skip to content link
- [ ] Contraste minimo 4.5:1 em texto normal
- [ ] Haptic feedback em acoes destrutivas
