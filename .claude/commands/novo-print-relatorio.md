Crie um sistema de impressao e relatorios PDF no padrao SISAM.

Entrada: $ARGUMENTS (tipo: "print-css", "janela-impressao", "pdf-servidor" ou "completo")

## 1. Hook usePrint — Impressao via janela popup

### Criar `lib/hooks/usePrint.ts`
```typescript
interface PrintOptions {
  titulo: string
  subtitulo?: string
  organizacao?: string
}

const CSS_PADRAO = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', sans-serif; padding: 24px; color: #1a1a1a; }
  .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 12px; }
  .header h1 { font-size: 18px; font-weight: 700; }
  .header h2 { font-size: 14px; color: #555; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border: 1px solid #ccc; padding: 6px 8px; }
  th { background: #f0f0f0; font-weight: 600; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 11px; }
  .badge-green { background: #d1fae5; color: #065f46; }
  .badge-red { background: #fee2e2; color: #991b1b; }
  .footer { margin-top: 20px; text-align: center; font-size: 10px; color: #999; }
  @media print { body { padding: 12px; } tr { page-break-inside: avoid; } }
`

export function usePrint() {
  function abrirJanelaImpressao(options: PrintOptions) {
    const janela = window.open('', '_blank', 'width=900,height=700')
    if (!janela) return null

    janela.document.write(\`<!DOCTYPE html><html><head>
      <meta charset="UTF-8"><title>\${options.titulo}</title>
      <style>\${CSS_PADRAO}</style></head><body>
      <div class="header">
        <h1>\${options.titulo}</h1>
        \${options.subtitulo ? \`<h2>\${options.subtitulo}</h2>\` : ''}
        <div class="org">\${options.organizacao || ''}</div>
      </div><div id="conteudo">\`)

    return {
      janela,
      escrever: (html: string) => janela.document.write(html),
      fechar: () => {
        janela.document.write(\`</div>
          <div class="footer">Impresso em \${new Date().toLocaleString('pt-BR')}</div>
          <script>window.onload = function() { window.print(); }<\/script>
        </body></html>\`)
        janela.document.close()
      }
    }
  }

  function gerarTabelaHTML(colunas: { titulo: string; campo: string; align?: string }[], dados: Record<string, unknown>[]) {
    const ths = colunas.map(c => \`<th>\${c.titulo}</th>\`).join('')
    const trs = dados.map(item =>
      '<tr>' + colunas.map(c => \`<td>\${item[c.campo] ?? ''}</td>\`).join('') + '</tr>'
    ).join('')
    return \`<table><thead><tr>\${ths}</tr></thead><tbody>\${trs}</tbody></table>\`
  }

  return { abrirJanelaImpressao, gerarTabelaHTML }
}
```

## 2. Print CSS — Estilos de impressao no globals.css
```css
@media print {
  @page { size: A4; margin: 15mm; }

  /* Esconder elementos interativos */
  .print\\:hidden, button, nav, aside, [role="navigation"], .no-print { display: none !important; }

  /* Forcar cores solidas */
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }

  /* Tabelas */
  table { page-break-inside: auto; font-size: 9pt; }
  tr { page-break-inside: avoid; }
  thead { display: table-header-group; }

  /* Cards sem sombra */
  .shadow, .shadow-sm, .shadow-md, .shadow-lg { box-shadow: none !important; }

  /* Fundo branco */
  body, main { background: white !important; color: black !important; }

  /* Header de impressao */
  .print\\:block { display: block !important; }
  .print\\:bg-blue-700 { background-color: #1d4ed8 !important; color: white !important; }
}
```

## 3. Botao de imprimir padrao
```tsx
<button onClick={() => window.print()}
  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 print:hidden">
  <Printer className="w-4 h-4" /> Imprimir
</button>
```

## 4. Header de impressao (oculto na tela, visivel na impressao)
```tsx
<div className="hidden print:block py-4 border-b-2 border-gray-300 mb-4">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-4">
      <img src="/logo.png" alt="Logo" className="h-16 w-auto" />
    </div>
    <div className="text-right">
      <h1 className="text-lg font-bold">Titulo do Relatorio</h1>
      <p className="text-sm text-gray-500">Subtitulo</p>
    </div>
  </div>
</div>
```

## O que deu MUITO certo no SISAM
- `print:hidden` em TODOS os elementos interativos (botoes, nav, tabs)
- `print:block` para headers especificos de impressao
- `-webkit-print-color-adjust: exact` — garante cores nos badges
- `page-break-inside: avoid` nas linhas de tabela
- `thead { display: table-header-group }` — repete header em cada pagina
- Impressao via `window.print()` direto (simples e funciona em todos browsers)
- Hook `usePrint` para relatorios mais complexos (abre janela nova)
