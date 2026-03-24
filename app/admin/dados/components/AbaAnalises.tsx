'use client'

import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { AlertTriangle, BarChart3, FileText, Search, Target } from 'lucide-react'
import { compararSeries as compararSeriesLib } from '@/lib/disciplinas-mapping'
import { TabelaPaginada, CustomTooltip } from '@/components/dados'
import type { PaginacaoAnalises } from '@/lib/dados/types'
import type { AbaAnalisesProps } from './types'

const COLUNAS_QUESTOES = [
  { key: 'questao_codigo', label: 'Questao', align: 'center' as const },
  { key: 'questao_descricao', label: 'Descricao', align: 'left' as const },
  { key: 'disciplina', label: 'Disciplina', align: 'center' as const },
  { key: 'total_respostas', label: 'Total', align: 'center' as const },
  { key: 'total_acertos', label: 'Acertos', align: 'center' as const },
  { key: 'total_erros', label: 'Erros', align: 'center' as const },
  { key: 'taxa_acerto', label: 'Taxa Acerto (%)', align: 'center' as const, format: 'decimal' as const },
  { key: 'taxa_erro', label: 'Taxa Erro (%)', align: 'center' as const, format: 'decimal' as const },
]

const COLUNAS_ESCOLAS = [
  { key: 'escola', label: 'Escola', align: 'left' as const },
  { key: 'polo', label: 'Polo', align: 'left' as const },
  { key: 'total_alunos', label: 'Alunos', align: 'center' as const },
  { key: 'total_respostas', label: 'Total', align: 'center' as const },
  { key: 'total_acertos', label: 'Acertos', align: 'center' as const },
  { key: 'total_erros', label: 'Erros', align: 'center' as const },
  { key: 'taxa_acerto', label: 'Taxa Acerto (%)', align: 'center' as const, format: 'decimal' as const },
  { key: 'taxa_erro', label: 'Taxa Erro (%)', align: 'center' as const, format: 'decimal' as const },
]

const COLUNAS_TURMAS = [
  { key: 'turma', label: 'Turma', align: 'left' as const },
  { key: 'escola', label: 'Escola', align: 'left' as const },
  { key: 'serie', label: 'Serie', align: 'center' as const, format: 'serie' as const },
  { key: 'total_alunos', label: 'Alunos', align: 'center' as const },
  { key: 'total_respostas', label: 'Total', align: 'center' as const },
  { key: 'total_acertos', label: 'Acertos', align: 'center' as const },
  { key: 'total_erros', label: 'Erros', align: 'center' as const },
  { key: 'taxa_acerto', label: 'Taxa Acerto (%)', align: 'center' as const, format: 'decimal' as const },
  { key: 'taxa_erro', label: 'Taxa Erro (%)', align: 'center' as const, format: 'decimal' as const },
]

export default function AbaAnalises({
  pesquisaRealizada,
  dados,
  filtroSerie,
  filtroDisciplina,
  ordenacao,
  handleOrdenacao,
  paginasAnalises,
  setPaginasAnalises,
  itensPorPagina,
}: AbaAnalisesProps) {
  if (!pesquisaRealizada) {
    return (
      <div className="space-y-6 mt-4">
        <div className="text-center py-12">
          <Search className="w-12 h-12 mx-auto text-indigo-300 mb-3" />
          <p className="text-base font-medium text-gray-600 dark:text-gray-300">Selecione os filtros desejados</p>
          <p className="text-sm mt-1 text-gray-500 dark:text-gray-400">Use os filtros acima e clique em <strong>Pesquisar</strong> para carregar os dados</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 mt-4">
      {/* Verificar se e Anos Iniciais para mostrar analise de Producao Textual */}
      {(() => {
        const serieNum = filtroSerie?.match(/(\d+)/)?.[1]
        const isAnosIniciaisSelecionado = serieNum === '2' || serieNum === '3' || serieNum === '5'
        const temDadosQuestoes = dados.analiseAcertosErros?.taxaAcertoGeral ||
          (dados.analiseAcertosErros?.questoesComMaisErros && dados.analiseAcertosErros.questoesComMaisErros.length > 0)

        // Calcular estatisticas de Producao Textual para Anos Iniciais
        const alunosComProducao = dados.alunosDetalhados?.filter(a => {
          const notaProd = parseFloat(String(a.nota_producao ?? 0))
          const isPresente = a.presenca === 'P' || a.presenca === 'p'
          return isPresente && !isNaN(notaProd) && notaProd >= 0 &&
            (filtroSerie ? compararSeriesLib(a.serie, filtroSerie) : true)
        }) || []

        const estatisticasProducao = alunosComProducao.length > 0 ? {
          total: alunosComProducao.length,
          media: alunosComProducao.reduce((acc, a) => acc + parseFloat(String(a.nota_producao ?? 0)), 0) / alunosComProducao.length,
          minima: Math.min(...alunosComProducao.map(a => parseFloat(String(a.nota_producao ?? 0)))),
          maxima: Math.max(...alunosComProducao.map(a => parseFloat(String(a.nota_producao ?? 0)))),
          faixas: {
            baixa: alunosComProducao.filter(a => parseFloat(String(a.nota_producao ?? 0)) < 4).length,
            media: alunosComProducao.filter(a => parseFloat(String(a.nota_producao ?? 0)) >= 4 && parseFloat(String(a.nota_producao ?? 0)) < 7).length,
            alta: alunosComProducao.filter(a => parseFloat(String(a.nota_producao ?? 0)) >= 7).length
          }
        } : null

        return (
          <>
            {/* Mensagem quando nao ha dados de questoes para Anos Iniciais */}
            {isAnosIniciaisSelecionado && !temDadosQuestoes && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200">
                      Dados de Questoes Objetivas Nao Disponiveis
                    </h4>
                    <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                      Nao ha registros de respostas de questoes objetivas para esta serie.
                      Verifique se os dados foram importados corretamente na tabela de resultados de provas.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Analise de Producao Textual para Anos Iniciais */}
            {isAnosIniciaisSelecionado && estatisticasProducao && (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 sm:p-6 mb-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-rose-600" />
                  Analise de Producao Textual
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                  <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{estatisticasProducao.total}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Alunos Avaliados</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-green-600 dark:text-green-400">{estatisticasProducao.media.toFixed(2)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Media Geral</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-red-600 dark:text-red-400">{estatisticasProducao.minima.toFixed(2)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Nota Minima</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-slate-700 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{estatisticasProducao.maxima.toFixed(2)}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Nota Maxima</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-red-600 dark:text-red-400">{estatisticasProducao.faixas.baixa}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Abaixo de 4</p>
                    <p className="text-[10px] text-gray-500">({((estatisticasProducao.faixas.baixa / estatisticasProducao.total) * 100).toFixed(1)}%)</p>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-amber-600 dark:text-amber-400">{estatisticasProducao.faixas.media}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Entre 4 e 7</p>
                    <p className="text-[10px] text-gray-500">({((estatisticasProducao.faixas.media / estatisticasProducao.total) * 100).toFixed(1)}%)</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-green-600 dark:text-green-400">{estatisticasProducao.faixas.alta}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Acima de 7</p>
                    <p className="text-[10px] text-gray-500">({((estatisticasProducao.faixas.alta / estatisticasProducao.total) * 100).toFixed(1)}%)</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )
      })()}

      {/* Cards de Resumo - Taxa de Acerto Geral */}
      {dados.analiseAcertosErros?.taxaAcertoGeral && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-400">Taxa de Acerto</h3>
              <Target className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-green-600 dark:text-green-400">
              {dados.analiseAcertosErros?.taxaAcertoGeral.taxa_acerto_geral.toFixed(2)}%
            </p>
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">
              {dados.analiseAcertosErros?.taxaAcertoGeral.total_acertos.toLocaleString('pt-BR')} de {dados.analiseAcertosErros?.taxaAcertoGeral.total_respostas.toLocaleString('pt-BR')} respostas
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-400">Taxa de Erro</h3>
              <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-red-600" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-red-600 dark:text-red-400">
              {dados.analiseAcertosErros?.taxaAcertoGeral.taxa_erro_geral.toFixed(2)}%
            </p>
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">
              {dados.analiseAcertosErros?.taxaAcertoGeral.total_erros.toLocaleString('pt-BR')} erros
            </p>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 sm:p-6 sm:col-span-2 lg:col-span-1">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs sm:text-sm font-semibold text-gray-600 dark:text-gray-400">Total de Respostas</h3>
              <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-600" />
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-indigo-600 dark:text-indigo-400">
              {dados.analiseAcertosErros?.taxaAcertoGeral.total_respostas.toLocaleString('pt-BR')}
            </p>
            <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-1">Respostas analisadas</p>
          </div>
        </div>
      )}

      {/* Taxa de Acerto por Disciplina */}
      {dados.analiseAcertosErros?.taxaAcertoPorDisciplina && dados.analiseAcertosErros?.taxaAcertoPorDisciplina.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">Taxa de Acerto por Disciplina</h3>
          <div className="h-[250px] sm:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dados.analiseAcertosErros?.taxaAcertoPorDisciplina}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="disciplina" tick={{ fill: '#6B7280', fontSize: 10 }} />
                <YAxis domain={[0, 100]} tick={{ fill: '#6B7280', fontSize: 10 }} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="taxa_acerto" name="Taxa de Acerto (%)" fill="#10B981" radius={[2, 2, 0, 0]} />
                <Bar dataKey="taxa_erro" name="Taxa de Erro (%)" fill="#EF4444" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Aviso quando "Todas" as series esta selecionado */}
      {!filtroSerie && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Search className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Visao Geral - Todas as Series
              </h4>
              <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                Para visualizar a analise detalhada de <strong>Questoes com mais erros</strong> e <strong>Questoes com mais acertos</strong>,
                selecione uma serie especifica no filtro acima.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Questoes com Mais Erros */}
      {filtroSerie && dados.analiseAcertosErros?.questoesComMaisErros && dados.analiseAcertosErros?.questoesComMaisErros.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 sm:p-6 overflow-hidden">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">Questoes com Mais Erros</h3>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <TabelaPaginada
              dados={dados.analiseAcertosErros?.questoesComMaisErros.slice((paginasAnalises.questoesErros - 1) * itensPorPagina, paginasAnalises.questoesErros * itensPorPagina)}
              colunas={COLUNAS_QUESTOES}
              ordenacao={ordenacao}
              onOrdenar={handleOrdenacao}
              paginaAtual={paginasAnalises.questoesErros}
              totalPaginas={Math.ceil(dados.analiseAcertosErros?.questoesComMaisErros.length / itensPorPagina)}
              onPaginar={(p: number) => setPaginasAnalises((prev: PaginacaoAnalises) => ({ ...prev, questoesErros: p }))}
              totalRegistros={dados.analiseAcertosErros?.questoesComMaisErros.length}
              itensPorPagina={itensPorPagina}
            />
          </div>
        </div>
      )}

      {/* Escolas com Mais Erros */}
      {dados.analiseAcertosErros?.escolasComMaisErros && dados.analiseAcertosErros?.escolasComMaisErros.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 sm:p-6 overflow-hidden">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">Escolas com Mais Erros</h3>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <TabelaPaginada
              dados={dados.analiseAcertosErros?.escolasComMaisErros.slice((paginasAnalises.escolasErros - 1) * itensPorPagina, paginasAnalises.escolasErros * itensPorPagina)}
              colunas={COLUNAS_ESCOLAS}
              ordenacao={ordenacao}
              onOrdenar={handleOrdenacao}
              paginaAtual={paginasAnalises.escolasErros}
              totalPaginas={Math.ceil(dados.analiseAcertosErros?.escolasComMaisErros.length / itensPorPagina)}
              onPaginar={(p: number) => setPaginasAnalises((prev: PaginacaoAnalises) => ({ ...prev, escolasErros: p }))}
              totalRegistros={dados.analiseAcertosErros?.escolasComMaisErros.length}
              itensPorPagina={itensPorPagina}
            />
          </div>
        </div>
      )}

      {/* Turmas com Mais Erros */}
      {dados.analiseAcertosErros?.turmasComMaisErros && dados.analiseAcertosErros?.turmasComMaisErros.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 sm:p-6 overflow-hidden">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">Turmas com Mais Erros</h3>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <TabelaPaginada
              dados={dados.analiseAcertosErros?.turmasComMaisErros.slice((paginasAnalises.turmasErros - 1) * itensPorPagina, paginasAnalises.turmasErros * itensPorPagina)}
              colunas={COLUNAS_TURMAS}
              ordenacao={ordenacao}
              onOrdenar={handleOrdenacao}
              paginaAtual={paginasAnalises.turmasErros}
              totalPaginas={Math.ceil(dados.analiseAcertosErros?.turmasComMaisErros.length / itensPorPagina)}
              onPaginar={(p: number) => setPaginasAnalises((prev: PaginacaoAnalises) => ({ ...prev, turmasErros: p }))}
              totalRegistros={dados.analiseAcertosErros?.turmasComMaisErros.length}
              itensPorPagina={itensPorPagina}
            />
          </div>
        </div>
      )}

      {/* Questoes com Mais Acertos */}
      {filtroSerie && dados.analiseAcertosErros?.questoesComMaisAcertos && dados.analiseAcertosErros?.questoesComMaisAcertos.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 sm:p-6 overflow-hidden">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">Questoes com Mais Acertos</h3>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <TabelaPaginada
              dados={dados.analiseAcertosErros?.questoesComMaisAcertos.slice((paginasAnalises.questoesAcertos - 1) * itensPorPagina, paginasAnalises.questoesAcertos * itensPorPagina)}
              colunas={COLUNAS_QUESTOES}
              ordenacao={ordenacao}
              onOrdenar={handleOrdenacao}
              paginaAtual={paginasAnalises.questoesAcertos}
              totalPaginas={Math.ceil(dados.analiseAcertosErros?.questoesComMaisAcertos.length / itensPorPagina)}
              onPaginar={(p: number) => setPaginasAnalises((prev: PaginacaoAnalises) => ({ ...prev, questoesAcertos: p }))}
              totalRegistros={dados.analiseAcertosErros?.questoesComMaisAcertos.length}
              itensPorPagina={itensPorPagina}
            />
          </div>
        </div>
      )}

      {/* Escolas com Mais Acertos */}
      {dados.analiseAcertosErros?.escolasComMaisAcertos && dados.analiseAcertosErros?.escolasComMaisAcertos.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 sm:p-6 overflow-hidden">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">Escolas com Mais Acertos</h3>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <TabelaPaginada
              dados={dados.analiseAcertosErros?.escolasComMaisAcertos.slice((paginasAnalises.escolasAcertos - 1) * itensPorPagina, paginasAnalises.escolasAcertos * itensPorPagina)}
              colunas={COLUNAS_ESCOLAS}
              ordenacao={ordenacao}
              onOrdenar={handleOrdenacao}
              paginaAtual={paginasAnalises.escolasAcertos}
              totalPaginas={Math.ceil(dados.analiseAcertosErros?.escolasComMaisAcertos.length / itensPorPagina)}
              onPaginar={(p: number) => setPaginasAnalises((prev: PaginacaoAnalises) => ({ ...prev, escolasAcertos: p }))}
              totalRegistros={dados.analiseAcertosErros?.escolasComMaisAcertos.length}
              itensPorPagina={itensPorPagina}
            />
          </div>
        </div>
      )}

      {/* Turmas com Mais Acertos */}
      {dados.analiseAcertosErros?.turmasComMaisAcertos && dados.analiseAcertosErros?.turmasComMaisAcertos.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4 sm:p-6 overflow-hidden">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white mb-4">Turmas com Mais Acertos</h3>
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <TabelaPaginada
              dados={dados.analiseAcertosErros?.turmasComMaisAcertos.slice((paginasAnalises.turmasAcertos - 1) * itensPorPagina, paginasAnalises.turmasAcertos * itensPorPagina)}
              colunas={COLUNAS_TURMAS}
              ordenacao={ordenacao}
              onOrdenar={handleOrdenacao}
              paginaAtual={paginasAnalises.turmasAcertos}
              totalPaginas={Math.ceil(dados.analiseAcertosErros?.turmasComMaisAcertos.length / itensPorPagina)}
              onPaginar={(p: number) => setPaginasAnalises((prev: PaginacaoAnalises) => ({ ...prev, turmasAcertos: p }))}
              totalRegistros={dados.analiseAcertosErros?.turmasComMaisAcertos.length}
              itensPorPagina={itensPorPagina}
            />
          </div>
        </div>
      )}
    </div>
  )
}
