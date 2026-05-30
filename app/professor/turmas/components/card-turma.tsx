'use client'

import { useRouter } from 'next/navigation'
import {
  Users, CalendarCheck, ClipboardList, BookOpen, ArrowRight,
} from 'lucide-react'
import type { Turma } from './tipos'
import { corDoTurno } from './tipos'

export function CardTurma({ turma }: { turma: Turma }) {
  const router = useRouter()
  const cor = corDoTurno(turma.turno)
  const Icon = cor.icone

  return (
    <div
      className={`group bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 border-l-4 ${cor.borda} shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-150 overflow-hidden`}
    >
      <div className="p-4 pb-3">
        {/* Cabecalho */}
        <div className="flex justify-between items-start gap-2 mb-2">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-gray-900 dark:text-white truncate">{turma.turma_nome}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1.5">
              <span>{turma.serie}</span>
              <span className="text-gray-300 dark:text-gray-600">·</span>
              <Icon className="h-3 w-3" />
              <span className="capitalize">{turma.turno}</span>
            </p>
          </div>
          <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400 flex-shrink-0">
            <Users className="h-4 w-4" />
            <span className="text-sm font-medium">{turma.total_alunos}</span>
          </div>
        </div>

        {/* Badge tipo vinculo */}
        {turma.tipo_vinculo === 'polivalente' ? (
          <span className="inline-block px-2 py-0.5 text-[11px] font-medium bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 rounded-full">
            Polivalente
          </span>
        ) : turma.disciplina_nome ? (
          <span className="inline-block px-2 py-0.5 text-[11px] font-medium bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full">
            {turma.disciplina_nome}
          </span>
        ) : null}
      </div>

      {/* CTA primario */}
      <button
        onClick={() => router.push(`/professor/frequencia/${turma.turma_id}`)}
        className="w-full px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-sm font-medium inline-flex items-center justify-center gap-2 transition group/btn"
      >
        <CalendarCheck className="h-4 w-4" />
        Lançar Frequência
        <ArrowRight className="h-4 w-4 opacity-0 -ml-1 group-hover/btn:opacity-100 group-hover/btn:ml-0 transition-all" />
      </button>

      {/* Acoes secundarias — area de toque 44px */}
      <div className="grid grid-cols-3 divide-x divide-gray-200 dark:divide-slate-700 border-t border-gray-200 dark:border-slate-700">
        <button
          onClick={() => router.push(`/professor/alunos/${turma.turma_id}`)}
          className="min-h-[44px] inline-flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition"
          title="Ver alunos da turma"
        >
          <Users className="h-4 w-4" />
          Alunos
        </button>
        <button
          onClick={() => router.push(`/professor/turmas/${turma.turma_id}/diario`)}
          className="min-h-[44px] inline-flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition"
          title="Ver diário consolidado"
        >
          <ClipboardList className="h-4 w-4" />
          Diário
        </button>
        <button
          onClick={() => router.push(`/professor/notas?turma=${turma.turma_id}`)}
          className="min-h-[44px] inline-flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700/50 transition"
          title="Lançar notas"
        >
          <BookOpen className="h-4 w-4" />
          Notas
        </button>
      </div>
    </div>
  )
}
