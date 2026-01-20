'use client'

interface TooltipPayload {
  name: string
  value: number | string
  color: string
  dataKey?: string
}

interface CustomTooltipProps {
  active?: boolean
  payload?: TooltipPayload[]
  label?: string
}

/**
 * Componente de tooltip customizado para graficos Recharts
 * Formata valores automaticamente: inteiro para contagens, decimal para medias
 */
export default function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null
  }

  // Filtrar valores null/undefined para nao mostrar disciplinas nao aplicaveis
  const filteredPayload = payload.filter(
    (entry) => entry.value !== null && entry.value !== undefined
  )

  if (filteredPayload.length === 0) {
    return null
  }

  return (
    <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 text-sm">
      <p className="font-semibold text-gray-900 dark:text-white mb-1">{label}</p>
      {filteredPayload.map((entry, index) => {
        // Formatar valor: inteiro para contagens, decimal para medias/notas
        const isContagem =
          entry.name === 'Alunos' ||
          entry.dataKey === 'quantidade' ||
          entry.dataKey === 'total_alunos'
        const valorFormatado =
          typeof entry.value === 'number'
            ? isContagem
              ? Math.round(entry.value).toLocaleString('pt-BR')
              : entry.value.toFixed(2)
            : entry.value

        return (
          <p
            key={index}
            style={{ color: entry.color }}
            className="flex justify-between gap-4"
          >
            <span>{entry.name}:</span>
            <span className="font-medium">{valorFormatado}</span>
          </p>
        )
      })}
    </div>
  )
}
