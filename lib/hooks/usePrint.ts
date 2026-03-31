/**
 * Hook de impressao reutilizavel
 *
 * Fornece funcoes para abrir janela de impressao com cabecalho padrao
 * e gerar tabelas HTML a partir de dados.
 *
 * @module lib/hooks/usePrint
 */

interface PrintOptions {
  titulo: string
  subtitulo?: string
  organizacao?: string
}

interface PrintHelpers {
  janela: Window
  escrever: (html: string) => void
  fechar: () => void
}

interface ColunaTabela {
  titulo: string
  campo: string
  align?: 'left' | 'center' | 'right'
}

const CSS_PADRAO = `
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 24px; color: #1a1a1a; }
  .header { text-align: center; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 12px; }
  .header h1 { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
  .header h2 { font-size: 14px; font-weight: 400; color: #555; margin-bottom: 2px; }
  .header .org { font-size: 12px; color: #777; }
  table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
  th, td { border: 1px solid #ccc; padding: 6px 8px; }
  th { background: #f0f0f0; font-weight: 600; text-align: left; white-space: nowrap; }
  td { vertical-align: top; }
  .text-center { text-align: center; }
  .text-right { text-align: right; }
  .badge { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: 500; }
  .badge-green { background: #d1fae5; color: #065f46; }
  .badge-red { background: #fee2e2; color: #991b1b; }
  .badge-yellow { background: #fef3c7; color: #92400e; }
  .badge-blue { background: #dbeafe; color: #1e40af; }
  .badge-gray { background: #f3f4f6; color: #374151; }
  .footer { margin-top: 20px; text-align: center; font-size: 10px; color: #999; }
  @media print {
    body { padding: 12px; }
    table { page-break-inside: auto; }
    tr { page-break-inside: avoid; }
  }
`

export function usePrint() {
  /**
   * Abre janela de impressao com cabecalho padrao
   */
  function abrirJanelaImpressao(options: PrintOptions): PrintHelpers | null {
    const {
      titulo,
      subtitulo,
      organizacao = 'SEMED \u2014 S\u00e3o Sebasti\u00e3o da Boa Vista',
    } = options

    const janelaRef = window.open('', '_blank', 'width=900,height=700')
    if (!janelaRef) return null
    const janela: Window = janelaRef

    janela.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${titulo}</title>
  <style>${CSS_PADRAO}</style>
</head>
<body>
  <div class="header">
    <h1>${titulo}</h1>
    ${subtitulo ? `<h2>${subtitulo}</h2>` : ''}
    <div class="org">${organizacao}</div>
  </div>
  <div id="conteudo">`)

    function escrever(html: string) {
      janela.document.write(html)
    }

    function fechar() {
      janela.document.write(`
  </div>
  <div class="footer">Impresso em ${new Date().toLocaleString('pt-BR')}</div>
  <script>window.onload = function() { window.print(); }<\/script>
</body>
</html>`)
      janela.document.close()
    }

    return { janela, escrever, fechar }
  }

  /**
   * Gera HTML de tabela a partir de definicoes de colunas e dados
   */
  function gerarTabelaHTML(colunas: ColunaTabela[], dados: Record<string, unknown>[]): string {
    const ths = colunas
      .map(
        (col) =>
          `<th class="${col.align === 'center' ? 'text-center' : col.align === 'right' ? 'text-right' : ''}">${col.titulo}</th>`
      )
      .join('')

    const trs = dados
      .map((item) => {
        const tds = colunas
          .map((col) => {
            const valor = item[col.campo] ?? ''
            const alignClass =
              col.align === 'center'
                ? ' class="text-center"'
                : col.align === 'right'
                  ? ' class="text-right"'
                  : ''
            return `<td${alignClass}>${valor}</td>`
          })
          .join('')
        return `<tr>${tds}</tr>`
      })
      .join('')

    return `<table><thead><tr>${ths}</tr></thead><tbody>${trs}</tbody></table>`
  }

  return { abrirJanelaImpressao, gerarTabelaHTML }
}
