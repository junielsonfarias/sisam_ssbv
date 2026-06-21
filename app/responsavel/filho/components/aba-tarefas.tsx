'use client'

import { ClipboardList, Clock } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { EmptyState } from './shared'
import { fmtData } from './helpers'

interface AbaTarefasProps {
  carregandoTarefas: boolean
  tarefas: any[]
}

export function AbaTarefas({ carregandoTarefas, tarefas }: AbaTarefasProps) {
  if (carregandoTarefas) {
    return <div className="py-10"><LoadingSpinner centered /></div>
  }
  const hoje = new Date().toISOString().slice(0, 10)
  const norm = tarefas.map((t: any) => ({ ...t, _de: String(t.data_entrega || '').slice(0, 10) }))
  const pendentes = norm.filter(t => t._de >= hoje).sort((a, b) => a._de.localeCompare(b._de))
  const anteriores = norm.filter(t => t._de < hoje).sort((a, b) => b._de.localeCompare(a._de))
  const Card = (t: any, pend: boolean) => {
    const dias = Math.round((new Date(t._de + 'T12:00:00').getTime() - new Date(hoje + 'T12:00:00').getTime()) / 86400000)
    const prazo = !pend ? 'Encerrada' : dias === 0 ? 'Entrega hoje' : dias === 1 ? 'Entrega amanhã' : `Faltam ${dias} dias`
    return (
      <div key={t.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{t.titulo}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              {t.disciplina || 'Geral'}{t.professor_nome ? ` · Prof. ${t.professor_nome.split(' ')[0]}` : ''}
            </p>
          </div>
          {t.tipo && <span className="shrink-0 text-[10px] font-semibold px-2 py-1 rounded-full bg-sky-50 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300 capitalize">{t.tipo}</span>}
        </div>
        {t.descricao && <p className="text-xs text-gray-600 dark:text-gray-300 mt-2 leading-relaxed">{t.descricao}</p>}
        <div className="flex items-center gap-1.5 mt-2.5 text-[11px] font-medium">
          <Clock className={`w-3.5 h-3.5 ${pend ? (dias <= 1 ? 'text-amber-500' : 'text-sky-500') : 'text-gray-400'}`} />
          <span className={pend ? (dias <= 1 ? 'text-amber-600 dark:text-amber-400' : 'text-gray-600 dark:text-gray-300') : 'text-gray-400 dark:text-gray-500'}>
            {fmtData(t._de)} · {prazo}
          </span>
        </div>
      </div>
    )
  }
  return (
    <>
      <div className="bg-sky-50 dark:bg-sky-900/15 rounded-2xl border border-sky-100 dark:border-sky-800 p-3.5 flex items-start gap-2.5">
        <ClipboardList className="w-5 h-5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5" />
        <p className="text-xs text-sky-700 dark:text-sky-300 leading-relaxed">
          Tarefas e atividades lançadas pela escola para a turma do(a) aluno(a) — <strong>últimos 60 dias</strong>.
        </p>
      </div>
      {norm.length === 0 ? (
        <EmptyState Icon={ClipboardList} texto="Nenhuma tarefa lançada para a turma." />
      ) : (
        <>
          {pendentes.length > 0 && (
            <>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-1 pt-1">A entregar · {pendentes.length}</p>
              {pendentes.map(t => Card(t, true))}
            </>
          )}
          {anteriores.length > 0 && (
            <>
              <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider px-1 pt-2">Encerradas · {anteriores.length}</p>
              {anteriores.map(t => Card(t, false))}
            </>
          )}
        </>
      )}
    </>
  )
}
