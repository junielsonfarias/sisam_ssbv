import { FileText } from 'lucide-react'
import { useSeries } from '@/lib/use-series'
import { Secao } from './shared'

import type { DadosAluno } from './types'

export function AbaSisam({ dados }: { dados: DadosAluno }) {
  const { formatSerie } = useSeries()
  const sisam = dados.sisam || []

  if (sisam.length === 0) return (
    <div className="bg-white dark:bg-slate-800 rounded-xl shadow-md p-12 text-center">
      <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
      <p className="text-gray-500">Nenhum resultado de avaliação encontrado</p>
    </div>
  )

  const getNivelCor = (nivel: string | null) => {
    if (!nivel) return { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-500', label: '-' }
    const n = nivel.toUpperCase()
    if (n === 'N1' || n === 'INSUFICIENTE') return { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', label: nivel }
    if (n === 'N2' || n === 'BASICO') return { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400', label: nivel }
    if (n === 'N3' || n === 'ADEQUADO') return { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', label: nivel }
    if (n === 'N4' || n === 'AVANCADO') return { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', label: nivel }
    return { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600', label: nivel }
  }

  return (
    <div className="space-y-6">
      {sisam.map((r: any, i: number) => {
        // Montar disciplinas
        interface DisciplinaInfo {
          disciplina: string; abrev: string; media: number | null; nivel: string | null
          acertos: number | null; total: number; percentual: number
        }
        const disciplinas: DisciplinaInfo[] = []

        if (r.avalia_lp && r.qtd_questoes_lp) {
          disciplinas.push({
            disciplina: 'Língua Portuguesa', abrev: 'LP',
            media: r.nota_lp != null ? parseFloat(r.nota_lp) : null,
            nivel: r.nivel_lp || null,
            acertos: r.total_acertos_lp != null ? parseInt(r.total_acertos_lp) : null,
            total: r.qtd_questoes_lp,
            percentual: r.total_acertos_lp != null ? (parseInt(r.total_acertos_lp) / r.qtd_questoes_lp) * 100 : 0
          })
        }
        if (r.avalia_mat && r.qtd_questoes_mat) {
          disciplinas.push({
            disciplina: 'Matemática', abrev: 'MAT',
            media: r.nota_mat != null ? parseFloat(r.nota_mat) : null,
            nivel: r.nivel_mat || null,
            acertos: r.total_acertos_mat != null ? parseInt(r.total_acertos_mat) : null,
            total: r.qtd_questoes_mat,
            percentual: r.total_acertos_mat != null ? (parseInt(r.total_acertos_mat) / r.qtd_questoes_mat) * 100 : 0
          })
        }
        if (r.avalia_ch && r.qtd_questoes_ch) {
          disciplinas.push({
            disciplina: 'Ciências Humanas', abrev: 'CH',
            media: r.nota_ch != null ? parseFloat(r.nota_ch) : null,
            nivel: null,
            acertos: r.total_acertos_ch != null ? parseInt(r.total_acertos_ch) : null,
            total: r.qtd_questoes_ch,
            percentual: r.total_acertos_ch != null ? (parseInt(r.total_acertos_ch) / r.qtd_questoes_ch) * 100 : 0
          })
        }
        if (r.avalia_cn && r.qtd_questoes_cn) {
          disciplinas.push({
            disciplina: 'Ciências da Natureza', abrev: 'CN',
            media: r.nota_cn != null ? parseFloat(r.nota_cn) : null,
            nivel: null,
            acertos: r.total_acertos_cn != null ? parseInt(r.total_acertos_cn) : null,
            total: r.qtd_questoes_cn,
            percentual: r.total_acertos_cn != null ? (parseInt(r.total_acertos_cn) / r.qtd_questoes_cn) * 100 : 0
          })
        }
        if (r.tem_producao_textual && r.qtd_itens_producao) {
          disciplinas.push({
            disciplina: 'Produção Textual', abrev: 'PROD',
            media: r.nota_producao != null ? parseFloat(r.nota_producao) : null,
            nivel: r.nivel_prod || null,
            acertos: null,
            total: r.qtd_itens_producao,
            percentual: r.nota_producao != null ? (parseFloat(r.nota_producao) / r.qtd_itens_producao) * 100 : 0
          })
        }

        const mediaAluno = r.media_aluno != null ? parseFloat(r.media_aluno) : null
        const nivelAluno = getNivelCor(r.nivel_aluno)
        const serieNum = r.serie ? r.serie.replace(/[^0-9]/g, '') : ''
        const isAnosFinais = ['6','7','8','9'].includes(serieNum) || r.tipo_avaliacao === 'anos_finais'

        return (
          <Secao key={i} titulo={`Avaliação ${formatSerie(r.serie) || ''} — ${r.ano_letivo || ''}`} icon={FileText}>
            {/* Cards por disciplina */}
            {disciplinas.length > 0 ? (
              <div className={`grid gap-4 ${disciplinas.length >= 4 ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
                {disciplinas.map(d => {
                  const nivelInfo = getNivelCor(d.nivel)
                  return (
                    <div key={d.abrev} className="border border-gray-200 dark:border-slate-700 rounded-xl p-4 hover:shadow-md transition">
                      {/* Header da disciplina */}
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">{d.disciplina}</h4>
                        {d.nivel && (
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${nivelInfo.bg} ${nivelInfo.text}`}>
                            {nivelInfo.label}
                          </span>
                        )}
                      </div>

                      {/* Barra de progresso */}
                      <div className="bg-gray-200 dark:bg-slate-600 rounded-full h-3 overflow-hidden mb-3">
                        <div
                          className={`h-full rounded-full transition-all ${d.percentual >= 70 ? 'bg-emerald-500' : d.percentual >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${Math.min(d.percentual, 100)}%` }}
                        />
                      </div>

                      {/* Métricas */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg px-3 py-2 text-center">
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-medium">Média</p>
                          <p className={`text-lg font-bold ${d.media !== null && d.media >= 5 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                            {d.media !== null ? d.media.toFixed(2) : '-'}
                          </p>
                        </div>
                        <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg px-3 py-2 text-center">
                          <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-medium">
                            {d.abrev === 'PROD' ? 'Pontuação' : 'Acertos'}
                          </p>
                          <p className="text-lg font-bold text-gray-800 dark:text-gray-200">
                            {d.acertos !== null ? d.acertos : (d.media !== null ? d.media.toFixed(0) : '-')}
                            <span className="text-xs text-gray-400 font-normal">/{d.total}</span>
                          </p>
                        </div>
                      </div>

                      {/* Percentual */}
                      <div className="mt-2 text-center">
                        <span className={`text-sm font-bold ${d.percentual >= 70 ? 'text-emerald-600' : d.percentual >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {d.percentual.toFixed(0)}% de aproveitamento
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">Sem dados de disciplinas</p>
            )}

            {/* Resumo geral */}
            <div className="mt-5 pt-4 border-t border-gray-200 dark:border-slate-700">
              <div className={`grid gap-4 ${isAnosFinais ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'}`}>
                {/* Média Geral */}
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-900/10 rounded-xl px-4 py-3 text-center">
                  <p className="text-[10px] text-indigo-500 dark:text-indigo-400 uppercase font-semibold">Média Geral</p>
                  <p className={`text-2xl font-bold ${mediaAluno !== null && mediaAluno >= 5 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {mediaAluno !== null ? mediaAluno.toFixed(1) : '-'}
                  </p>
                </div>

                {/* Nível do Aluno — só para anos iniciais */}
                {!isAnosFinais && (
                  <div className={`rounded-xl px-4 py-3 text-center ${nivelAluno.bg}`}>
                    <p className="text-[10px] uppercase font-semibold opacity-70">Nível Geral</p>
                    <p className={`text-2xl font-bold ${nivelAluno.text}`}>
                      {r.nivel_aluno || '-'}
                    </p>
                  </div>
                )}

                {/* Presença */}
                <div className={`rounded-xl px-4 py-3 text-center ${
                  r.presenca === 'P' || r.presenca === 'p'
                    ? 'bg-emerald-50 dark:bg-emerald-900/20'
                    : 'bg-red-50 dark:bg-red-900/20'
                }`}>
                  <p className="text-[10px] uppercase font-semibold opacity-70">Presença</p>
                  <p className={`text-lg font-bold ${r.presenca === 'P' || r.presenca === 'p' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {r.presenca === 'P' || r.presenca === 'p' ? 'Presente' : r.presenca === 'F' || r.presenca === 'f' ? 'Faltou' : '-'}
                  </p>
                </div>

                {/* Questões */}
                <div className="bg-gray-50 dark:bg-slate-700/30 rounded-xl px-4 py-3 text-center">
                  <p className="text-[10px] text-gray-500 uppercase font-semibold">Questões</p>
                  <p className="text-lg font-bold text-gray-800 dark:text-gray-200">
                    {r.total_questoes_respondidas || '-'}
                    <span className="text-xs text-gray-400 font-normal">/{r.total_questoes_esperadas || '-'}</span>
                  </p>
                </div>
              </div>
            </div>
          </Secao>
        )
      })}
    </div>
  )
}
