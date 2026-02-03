'use client'

import { useCallback } from 'react'
import { Download } from 'lucide-react'
import { toPng } from 'html-to-image'

interface ChartDownloadButtonProps {
  chartId: string
  fileName: string
  title?: string
}

/**
 * Botão para download de gráficos/cards como PNG
 * Usa html-to-image para capturar o card completo (não apenas o SVG)
 */
export function ChartDownloadButton({ chartId, fileName, title }: ChartDownloadButtonProps) {
  const downloadChart = useCallback(async () => {
    // Buscar o card pai do container do gráfico
    const chartContainer = document.getElementById(chartId)
    if (!chartContainer) {
      console.error('Container do gráfico não encontrado:', chartId)
      return
    }

    // Buscar o card completo (elemento pai com classe bg-white)
    const cardElement = chartContainer.closest('.bg-white, .dark\\:bg-slate-800') as HTMLElement
    const elementToCapture = cardElement || chartContainer

    try {
      // Capturar o elemento como PNG usando html-to-image
      const dataUrl = await toPng(elementToCapture, {
        quality: 1.0,
        pixelRatio: 2, // Alta resolução (2x)
        backgroundColor: '#ffffff',
        style: {
          // Garantir que o elemento seja capturado corretamente
          transform: 'scale(1)',
          transformOrigin: 'top left',
        },
        filter: (node) => {
          // Remover botões de download da imagem capturada
          if (node instanceof HTMLElement) {
            if (node.tagName === 'BUTTON' && node.textContent?.includes('Download')) {
              return false
            }
            if (node.tagName === 'BUTTON' && node.textContent?.includes('CSV')) {
              return false
            }
          }
          return true
        }
      })

      // Criar link e fazer download
      const link = document.createElement('a')
      link.download = `${fileName}.png`
      link.href = dataUrl
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    } catch (error) {
      console.error('Erro ao exportar gráfico:', error)

      // Fallback: tentar capturar apenas o SVG
      try {
        await downloadSvgFallback(chartContainer, fileName)
      } catch (fallbackError) {
        console.error('Fallback também falhou:', fallbackError)
        alert('Erro ao baixar o gráfico. Tente novamente.')
      }
    }
  }, [chartId, fileName])

  return (
    <button
      onClick={downloadChart}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-md shadow-sm transition-colors"
      title={title || `Baixar ${fileName}`}
    >
      <Download className="w-4 h-4" />
      <span className="hidden sm:inline">Download</span>
    </button>
  )
}

/**
 * Fallback: Download do SVG quando html-to-image falhar
 */
async function downloadSvgFallback(container: HTMLElement, fileName: string) {
  const svg = container.querySelector('svg')
  if (!svg) {
    throw new Error('SVG não encontrado')
  }

  // Clonar o SVG
  const clonedSvg = svg.cloneNode(true) as SVGElement
  const bbox = svg.getBoundingClientRect()
  clonedSvg.setAttribute('width', String(bbox.width))
  clonedSvg.setAttribute('height', String(bbox.height))

  // Adicionar fundo branco
  const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
  rect.setAttribute('width', '100%')
  rect.setAttribute('height', '100%')
  rect.setAttribute('fill', 'white')
  clonedSvg.insertBefore(rect, clonedSvg.firstChild)

  // Serializar
  const serializer = new XMLSerializer()
  const svgString = '<?xml version="1.0" encoding="UTF-8"?>' + serializer.serializeToString(clonedSvg)

  // Download como SVG
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${fileName}.svg`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/**
 * Componente wrapper para adicionar ID ao container do gráfico
 */
interface ChartContainerProps {
  id: string
  children: React.ReactNode
  className?: string
}

export function ChartContainer({ id, children, className = '' }: ChartContainerProps) {
  return (
    <div id={id} className={className}>
      {children}
    </div>
  )
}

/**
 * Hook para download de tabelas como CSV
 */
export function useTableDownload() {
  const downloadTableAsCSV = useCallback((data: any[], fileName: string, columns: { key: string; label: string }[]) => {
    // Criar cabeçalho
    const header = columns.map(col => col.label).join(',')

    // Criar linhas
    const rows = data.map(row =>
      columns.map(col => {
        const value = row[col.key]
        // Escapar valores com vírgula ou aspas
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`
        }
        return value ?? ''
      }).join(',')
    )

    // Combinar tudo
    const csv = [header, ...rows].join('\n')

    // Criar blob com BOM para UTF-8
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = url
    link.download = `${fileName}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }, [])

  return { downloadTableAsCSV }
}

/**
 * Botão para download de tabela como CSV
 */
interface TableDownloadButtonProps {
  data: any[]
  fileName: string
  columns: { key: string; label: string }[]
  title?: string
}

export function TableDownloadButton({ data, fileName, columns, title }: TableDownloadButtonProps) {
  const { downloadTableAsCSV } = useTableDownload()

  return (
    <button
      onClick={() => downloadTableAsCSV(data, fileName, columns)}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-600 rounded-md shadow-sm transition-colors"
      title={title || `Baixar ${fileName} como CSV`}
    >
      <Download className="w-4 h-4" />
      <span className="hidden sm:inline">CSV</span>
    </button>
  )
}
