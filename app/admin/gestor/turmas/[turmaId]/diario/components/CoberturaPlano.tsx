'use client'

import { useState } from 'react'
import { BookCheck, CheckCircle2, ChevronDown, ChevronUp, ClipboardList, Target } from 'lucide-react'
import type { CoberturaPlanoPayload, PlanoCobertura } from './types'

interface Props {
  cobertura: CoberturaPlanoPayload
}

function corCobertura(pct: number | null): { bg: string; text: string; border: string } {
  if (pct == null) return {
    bg: 'bg-gray-50 dark:bg-slate-900/30', text: 'text-gray-600 dark:text-gray-300', border: 'border-gray-200 dark:border-slate-700',
  }
  if (pct >= 90) return {
    bg: 'bg-emerald-50 dark:bg-emerald-900/20', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800',
  }
  if (pct >= 60) return {
    bg: 'bg-amber-50 dark:bg-amber-900/20', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800',
  }
  return {
    bg: 'bg-red-50 dark:bg-red-900/20', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-800',
  }
}

function formatarData(iso: string): string {
  const [, mes, dia] = iso.split('-')
  return `${dia}/${mes}`
}

function PlanoCard({ plano }: { plano: PlanoCobertura }) {
  const [expandido, setExpandido] = useState(false)
  const cor = corCobertura(plano.resumo.percentual)
  const periodoTxt = `${formatarData(plano.data_inicio)}${plano.data_fim ? ` – ${formatarData(plano.data_fim)}` : ''}`

  return (
    <div className={`rounded-lg border ${cor.border} ${cor.bg} overflow-hidden`}>
      <button
        onClick={() => setExpandido((v) => !v)}
        className="w-full px-3 py-2.5 flex items-center justify-between text-left cursor-pointer hover:opacity-90"
      >
        <div className="min-w-0">
          <div className={`text-xs font-semibold ${cor.text} truncate`}>
            {plano.disciplina_nome || 'Plano de aula'}
            <span className="opacity-70 font-normal"> · {periodoTxt}</span>
          </div>
          <div className="text-[11px] text-gray-600 dark:text-gray-400 mt-0.5">
            {plano.resumo.cobertas}/{plano.resumo.total_habilidades} habilidades trabalhadas
            {plano.resumo.pendentes > 0 && (
              <span className={`ml-2 font-semibold ${cor.text}`}>• {plano.resumo.pendentes} pendente{plano.resumo.pendentes > 1 ? 's' : ''}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className={`text-sm font-bold ${cor.text}`}>
            {plano.resumo.percentual == null ? '—' : `${plano.resumo.percentual}%`}
          </div>
          {expandido ? <ChevronUp className={`w-4 h-4 ${cor.text}`} /> : <ChevronDown className={`w-4 h-4 ${cor.text}`} />}
        </div>
      </button>

      {expandido && (
        <div className="px-3 pb-3 pt-1 border-t border-current/10 space-y-2">
          {plano.objetivo_resumo && (
            <p className="text-[11px] text-gray-600 dark:text-gray-400 italic flex items-start gap-1">
              <Target className="w-3 h-3 mt-0.5 shrink-0" /> {plano.objetivo_resumo}
            </p>
          )}
          <div className="flex flex-wrap gap-1.5">
            {plano.habilidades.map((h) => (
              <span
                key={h.codigo}
                title={`${h.descricao || h.codigo}${h.coberta_em ? ` — trabalhada em ${formatarData(h.coberta_em)}` : ' — ainda não trabalhada'}`}
                className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded border ${
                  h.coberta
                    ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                    : 'bg-white dark:bg-slate-900/60 text-gray-500 dark:text-gray-400 border-dashed border-gray-300 dark:border-slate-600'
                }`}
              >
                {h.coberta && <CheckCircle2 className="w-2.5 h-2.5" />}
                {h.codigo}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default function CoberturaPlano({ cobertura }: Props) {
  const cor = corCobertura(cobertura.resumo.percentual)

  return (
    <section className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-200 dark:border-slate-700">
        <h2 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <BookCheck className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
          Cobertura de conteúdo
          <span className="text-[11px] font-normal text-gray-500 dark:text-gray-400">
            (habilidades BNCC planejadas vs trabalhadas no diário)
          </span>
        </h2>
      </div>

      {cobertura.planos.length === 0 ? (
        <div className="p-5 flex items-start gap-2 text-sm text-gray-500 dark:text-gray-400">
          <ClipboardList className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            Nenhum plano de aula com habilidades BNCC vinculadas
            {cobertura.escopo.periodo ? ' neste período' : ' nesta turma'}.
            Vincule habilidades aos planos para acompanhar a cobertura de conteúdo.
          </span>
        </div>
      ) : (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-gray-200 dark:bg-slate-700">
            <div className="bg-white dark:bg-slate-800 px-4 py-4">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Cobertura</div>
              <div className={`text-2xl font-bold ${cor.text}`}>
                {cobertura.resumo.percentual == null ? '—' : `${cobertura.resumo.percentual}%`}
              </div>
            </div>
            <div className="bg-white dark:bg-slate-800 px-4 py-4">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Planejadas</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{cobertura.resumo.total_habilidades}</div>
            </div>
            <div className="bg-white dark:bg-slate-800 px-4 py-4">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> Trabalhadas
              </div>
              <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">{cobertura.resumo.cobertas}</div>
            </div>
            <div className="bg-white dark:bg-slate-800 px-4 py-4">
              <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1">Pendentes</div>
              <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">{cobertura.resumo.pendentes}</div>
            </div>
          </div>

          {/* Planos */}
          <div className="p-4 border-t border-gray-200 dark:border-slate-700 grid grid-cols-1 lg:grid-cols-2 gap-2">
            {cobertura.planos.map((p) => <PlanoCard key={p.plano_id} plano={p} />)}
          </div>
        </>
      )}

      <div className="px-5 py-2 text-[10px] text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-slate-900/30 border-t border-gray-200 dark:border-slate-700">
        Habilidade trabalhada = há registro no diário, vinculado à mesma habilidade BNCC, dentro da vigência do plano.
      </div>
    </section>
  )
}
