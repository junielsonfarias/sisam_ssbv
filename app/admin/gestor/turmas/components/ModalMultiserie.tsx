'use client'

import { X, Printer, Layers, Users, School } from 'lucide-react'
import { Turma, escapeHtml } from './types'

const SERIE_COLORS: Record<string, string> = {
  CRE: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  PRE1: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  PRE2: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  '1': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  '2': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  '3': 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  '4': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  '5': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  '6': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  '7': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  '8': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
  '9': 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
}

const SERIE_PRINT_COLORS: Record<string, string> = {
  CRE: '#fce7f3', PRE1: '#f3e8ff', PRE2: '#ede9fe',
  '1': '#dbeafe', '2': '#cffafe', '3': '#ccfbf1',
  '4': '#d1fae5', '5': '#dcfce7', '6': '#fef3c7',
  '7': '#ffedd5', '8': '#fee2e2', '9': '#ffe4e6',
}

export interface ComposicaoSerie {
  serie: string
  quantidade: number
}

interface ModalMultiserieProps {
  aberto: boolean
  turmas: Turma[]
  composicao: Record<string, ComposicaoSerie[]>
  carregandoComposicao: boolean
  formatSerie: (serie: string) => string
  onFechar: () => void
}

interface EscolaGrupo {
  escola_nome: string
  polo_nome: string | null
  turmas: Turma[]
  totalAlunos: number
}

const SERIE_ORDER: Record<string, number> = {
  CRE: 0, PRE1: 1, PRE2: 2,
  '1': 3, '2': 4, '3': 5, '4': 6, '5': 7,
  '6': 8, '7': 9, '8': 10, '9': 11,
}

function sortSeries(a: ComposicaoSerie, b: ComposicaoSerie) {
  return (SERIE_ORDER[a.serie] ?? 99) - (SERIE_ORDER[b.serie] ?? 99)
}

export function ModalMultiserie({ aberto, turmas, composicao, carregandoComposicao, formatSerie, onFechar }: ModalMultiserieProps) {
  if (!aberto) return null

  const turmasMulti = turmas.filter(t => t.multiserie || t.multietapa)

  const gruposMap = new Map<string, EscolaGrupo>()
  for (const t of turmasMulti) {
    const key = t.escola_nome
    if (!gruposMap.has(key)) {
      gruposMap.set(key, { escola_nome: t.escola_nome, polo_nome: t.polo_nome, turmas: [], totalAlunos: 0 })
    }
    const g = gruposMap.get(key)!
    g.turmas.push(t)
    g.totalAlunos += t.total_alunos
  }
  const grupos = [...gruposMap.values()].sort((a, b) => a.escola_nome.localeCompare(b.escola_nome))

  const totalTurmas = turmasMulti.length
  const totalAlunos = turmasMulti.reduce((s, t) => s + t.total_alunos, 0)
  const totalMultiserie = turmasMulti.filter(t => t.multiserie).length
  const totalMultietapa = turmasMulti.filter(t => t.multietapa).length

  function pad2(n: number) { return n.toString().padStart(2, '0') }

  function renderComposicao(turmaId: string) {
    const series = composicao[turmaId]
    if (!series || series.length === 0) return null
    const sorted = [...series].sort(sortSeries)
    return (
      <div className="flex flex-wrap gap-1.5 mt-1.5">
        {sorted.map(s => (
          <span
            key={s.serie}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${SERIE_COLORS[s.serie] || 'bg-gray-100 text-gray-600 dark:bg-slate-700 dark:text-gray-300'}`}
          >
            {formatSerie(s.serie)}: <strong className="text-[11px]">{pad2(s.quantidade)}</strong>
          </span>
        ))}
      </div>
    )
  }

  function renderComposicaoPrint(turmaId: string) {
    const series = composicao[turmaId]
    if (!series || series.length === 0) return ''
    const sorted = [...series].sort(sortSeries)
    return sorted.map(s => {
      const bg = SERIE_PRINT_COLORS[s.serie] || '#f3f4f6'
      return `<span style="display:inline-block;background:${bg};padding:2px 8px;border-radius:3px;font-size:10px;font-weight:500;margin:1px 2px;">${escapeHtml(formatSerie(s.serie))}: <strong>${pad2(s.quantidade)}</strong></span>`
    }).join(' ')
  }

  const handleImprimir = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Turmas Multisseriadas e Multietapa</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
          h1 { font-size: 18px; margin-bottom: 4px; }
          h2 { font-size: 14px; margin: 18px 0 6px; color: #4338ca; border-bottom: 2px solid #e0e7ff; padding-bottom: 4px; }
          .resumo { display: flex; gap: 24px; margin-bottom: 16px; font-size: 13px; }
          .resumo span { font-weight: 600; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 12px; }
          th, td { border: 1px solid #ccc; padding: 5px 8px; text-align: left; vertical-align: top; }
          th { background: #f3f4f6; font-weight: 600; }
          tr:nth-child(even) { background: #f9fafb; }
          .badge { padding: 1px 8px; border-radius: 4px; font-size: 10px; font-weight: 600; display: inline-block; }
          .multi { background: #fef3c7; color: #92400e; }
          .etapa { background: #dbeafe; color: #1e40af; }
          .escola-total { font-size: 12px; color: #666; margin-bottom: 8px; }
          .composicao { margin-top: 4px; line-height: 1.8; }
          .grand-total { margin-top: 16px; font-size: 14px; font-weight: 700; border-top: 2px solid #333; padding-top: 8px; }
          @media print { body { margin: 10mm; } }
        </style>
      </head>
      <body>
        <h1>Turmas Multisseriadas e Multietapa</h1>
        <div class="resumo">
          <div>Total de Turmas: <span>${totalTurmas}</span></div>
          <div>Multisseriadas: <span>${totalMultiserie}</span></div>
          <div>Multietapa: <span>${totalMultietapa}</span></div>
          <div>Total de Alunos: <span>${totalAlunos}</span></div>
          <div>Escolas: <span>${grupos.length}</span></div>
        </div>
        ${grupos.map(g => `
          <h2>${escapeHtml(g.escola_nome)}${g.polo_nome ? ' - ' + escapeHtml(g.polo_nome) : ''}</h2>
          <div class="escola-total">${g.turmas.length} turma(s) | ${g.totalAlunos} aluno(s)</div>
          <table>
            <thead>
              <tr>
                <th style="width:80px">Codigo</th>
                <th style="width:140px">Nome</th>
                <th style="width:60px;text-align:center">Tipo</th>
                <th>Composicao por Serie</th>
                <th style="width:55px;text-align:center">Total</th>
              </tr>
            </thead>
            <tbody>
              ${g.turmas.map(t => `
                <tr>
                  <td>${escapeHtml(t.codigo)}</td>
                  <td>${t.nome ? escapeHtml(t.nome) : '-'}</td>
                  <td style="text-align:center"><span class="badge ${t.multiserie ? 'multi' : 'etapa'}">${t.multiserie ? 'Multi' : 'Etapa'}</span></td>
                  <td><div class="composicao">${renderComposicaoPrint(t.id)}</div></td>
                  <td style="text-align:center;font-weight:700">${t.total_alunos}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        `).join('')}
        <div class="grand-total">Total Geral: ${totalTurmas} turmas | ${totalAlunos} alunos em ${grupos.length} escolas</div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `)
    printWindow.document.close()
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-3 sm:p-4" onClick={onFechar}>
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-r from-amber-500 to-orange-500 dark:from-amber-600 dark:to-orange-600">
          <button
            onClick={onFechar}
            className="absolute top-3 right-3 p-1.5 text-white/70 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="px-5 pt-5 pb-4">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-lg bg-white/20 flex items-center justify-center">
                <Layers className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white leading-tight">
                  Turmas Multisseriadas e Multietapa
                </h2>
                <p className="text-sm text-white/70">Detalhamento por escola</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 backdrop-blur-sm text-xs font-medium text-white">
                <Layers className="w-3.5 h-3.5" />
                {totalTurmas} turma{totalTurmas !== 1 ? 's' : ''}
              </div>
              {totalMultiserie > 0 && (
                <div className="px-3 py-1.5 rounded-lg bg-yellow-300/25 backdrop-blur-sm text-xs font-semibold text-yellow-100">
                  {totalMultiserie} Multisseriada{totalMultiserie !== 1 ? 's' : ''}
                </div>
              )}
              {totalMultietapa > 0 && (
                <div className="px-3 py-1.5 rounded-lg bg-blue-300/25 backdrop-blur-sm text-xs font-semibold text-blue-100">
                  {totalMultietapa} Multietapa
                </div>
              )}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 backdrop-blur-sm text-xs font-medium text-white">
                <Users className="w-3.5 h-3.5" />
                {totalAlunos} aluno{totalAlunos !== 1 ? 's' : ''}
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/15 backdrop-blur-sm text-xs font-medium text-white">
                <School className="w-3.5 h-3.5" />
                {grupos.length} escola{grupos.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {grupos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-slate-700 flex items-center justify-center">
                <Layers className="w-8 h-8 text-gray-300 dark:text-slate-500" />
              </div>
              <p className="text-sm font-medium text-gray-400 dark:text-gray-500">Nenhuma turma multisseriada ou multietapa</p>
            </div>
          ) : (
            grupos.map(grupo => (
              <div key={grupo.escola_nome} className="border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
                {/* Escola header */}
                <div className="bg-gray-50 dark:bg-slate-700/50 px-4 py-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">
                      {grupo.escola_nome}
                    </h3>
                    {grupo.polo_nome && (
                      <p className="text-xs text-gray-500 dark:text-gray-400">{grupo.polo_nome}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 bg-gray-200 dark:bg-slate-600 px-2 py-0.5 rounded">
                      {grupo.turmas.length} turma{grupo.turmas.length !== 1 ? 's' : ''}
                    </span>
                    <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded">
                      {grupo.totalAlunos} aluno{grupo.totalAlunos !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                {/* Turmas da escola */}
                <div className="divide-y divide-gray-100 dark:divide-slate-700/40">
                  {grupo.turmas.map((t, idx) => (
                    <div key={t.id} className={`px-4 py-3 ${idx % 2 === 0 ? 'bg-white dark:bg-slate-800' : 'bg-gray-50/50 dark:bg-slate-800/60'}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-mono font-bold text-gray-700 dark:text-gray-200 w-20">{t.codigo}</span>
                          <span className="text-sm text-gray-600 dark:text-gray-300">{t.nome || '-'}</span>
                          {t.multiserie ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-amber-100 text-amber-700 ring-1 ring-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-500/30">
                              Multisseriada
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide bg-blue-100 text-blue-700 ring-1 ring-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:ring-blue-500/30">
                              Multietapa
                            </span>
                          )}
                        </div>
                        <span className="inline-flex items-center justify-center w-9 h-9 rounded-full text-sm font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                          {t.total_alunos}
                        </span>
                      </div>
                      {/* Composição por série */}
                      {carregandoComposicao ? (
                        <div className="mt-1.5 text-[10px] text-gray-400 animate-pulse">Carregando...</div>
                      ) : (
                        renderComposicao(t.id)
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {grupos.length > 0 && (
          <div className="px-5 py-3.5 border-t border-gray-200 dark:border-slate-700 bg-gray-50/80 dark:bg-slate-800/80 flex items-center justify-between">
            <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              {totalTurmas} turmas | {totalAlunos} alunos | {grupos.length} escolas
            </div>
            <button
              onClick={handleImprimir}
              className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir Relatorio
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
