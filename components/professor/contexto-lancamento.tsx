'use client'

import { School, GraduationCap, BookMarked, CalendarDays, Clock } from 'lucide-react'

interface Props {
  /** Nome da escola */
  escola?: string | null
  /** Nome da turma (ex: "3º Ano - A") */
  turma?: string | null
  /** Serie (ex: "3", "3º Ano") */
  serie?: string | null
  /** Turno (matutino/vespertino/noturno/integral) */
  turno?: string | null
  /** Disciplina selecionada */
  disciplina?: string | null
  /** Periodo (bimestre/trimestre/etc) */
  periodo?: string | null
  /** Data ou intervalo (ex: "29/05/2026") */
  data?: string | null
  /** Cor de destaque para o cabecalho (ex: 'emerald' | 'violet' | 'blue') */
  cor?: 'emerald' | 'violet' | 'blue' | 'amber' | 'indigo'
  /** Texto curto do tipo de operacao (ex: "Lançamento de Frequência") */
  titulo?: string
}

const CORES: Record<NonNullable<Props['cor']>, { borda: string; chip: string }> = {
  emerald: {
    borda: 'border-emerald-200 dark:border-emerald-800',
    chip: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300',
  },
  violet: {
    borda: 'border-violet-200 dark:border-violet-800',
    chip: 'bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300',
  },
  blue: {
    borda: 'border-blue-200 dark:border-blue-800',
    chip: 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300',
  },
  amber: {
    borda: 'border-amber-200 dark:border-amber-800',
    chip: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300',
  },
  indigo: {
    borda: 'border-indigo-200 dark:border-indigo-800',
    chip: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300',
  },
}

/**
 * Cartao de contexto exibido no topo das telas de lancamento
 * (frequencia, diario, notas) mostrando escola, turma, serie,
 * disciplina, periodo e data. Mantem o professor sempre ciente
 * de qual conjunto de dados ele esta editando.
 */
export default function ContextoLancamento({
  escola, turma, serie, turno, disciplina, periodo, data, cor = 'emerald', titulo,
}: Props) {
  const c = CORES[cor]
  const itens: Array<{ icon: typeof School; label: string; valor: string }> = []

  if (escola) itens.push({ icon: School, label: 'Escola', valor: escola })
  if (turma) {
    const detalhes = [serie, turno].filter(Boolean).join(' · ')
    itens.push({
      icon: GraduationCap,
      label: 'Turma',
      valor: detalhes ? `${turma} · ${detalhes}` : turma,
    })
  } else if (serie || turno) {
    itens.push({
      icon: GraduationCap,
      label: 'Série / Turno',
      valor: [serie, turno].filter(Boolean).join(' · '),
    })
  }
  if (disciplina) itens.push({ icon: BookMarked, label: 'Disciplina', valor: disciplina })
  if (periodo) itens.push({ icon: Clock, label: 'Período', valor: periodo })
  if (data) itens.push({ icon: CalendarDays, label: 'Data', valor: data })

  if (itens.length === 0) return null

  return (
    <section
      aria-label="Contexto do lançamento"
      className={`rounded-xl border ${c.borda} bg-white dark:bg-gray-800 shadow-sm overflow-hidden`}
    >
      {titulo && (
        <div className={`px-3 sm:px-4 py-2 ${c.chip} border-b ${c.borda} text-xs sm:text-sm font-semibold uppercase tracking-wide`}>
          {titulo}
        </div>
      )}
      <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2 p-3 sm:p-4">
        {itens.map((item, i) => {
          const Icon = item.icon
          return (
            <div key={i} className="flex items-start gap-2 min-w-0">
              <Icon className="h-4 w-4 mt-0.5 flex-shrink-0 text-gray-500 dark:text-gray-400" />
              <div className="min-w-0 flex-1">
                <dt className="text-[10px] uppercase tracking-wide text-gray-500 dark:text-gray-400 leading-tight">
                  {item.label}
                </dt>
                <dd className="text-sm font-medium text-gray-900 dark:text-white break-words leading-snug">
                  {item.valor}
                </dd>
              </div>
            </div>
          )
        })}
      </dl>
    </section>
  )
}
