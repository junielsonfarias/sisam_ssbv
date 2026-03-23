'use client'

import { useMemo } from 'react'
import { GraduationCap, Search, Filter, X, Eye } from 'lucide-react'
import { type Disciplina } from '@/lib/disciplinas-por-serie'
import {
  ResultadoConsolidadoPainel,
  AlunoSelecionado,
  FiltrosAlunos,
  PaginacaoInfo,
  OpcaoSelect
} from '@/lib/dados/types'
import {
  isAnosIniciais,
  getNotaNumero,
  getNotaColor,
  getNotaBgColor,
  getPresencaColor,
  isDisciplinaAplicavel,
  formatarNota
} from '@/lib/dados/utils'
import {
  NivelBadge,
  PaginationControls,
  TabelaCarregando,
  EstadoBuscaInicial
} from '@/components/dados'

// Aliases para compatibilidade
type ResultadoConsolidado = ResultadoConsolidadoPainel

/**
 * Calcula o nível baseado na nota (fallback quando nivel_prod não está no banco)
 * Faixas: 0-4 = N1, 4-6 = N2, 6-8 = N3, 8-10 = N4
 */
function calcularNivelPorNota(nota: number | string | null | undefined): string | null {
  if (nota === null || nota === undefined) return null

  const notaNum = typeof nota === 'string' ? parseFloat(nota) : nota
  if (isNaN(notaNum)) return null

  if (notaNum < 4) return 'N1'
  if (notaNum < 6) return 'N2'
  if (notaNum < 8) return 'N3'
  return 'N4'
}

// getNivelColor para uso em badges de nível de aprendizagem (texto descritivo)
const getNivelColorDescritivo = (nivel: string | undefined | null): string => {
  if (!nivel) return 'bg-gray-100 text-gray-700'
  const nivelLower = nivel.toLowerCase()
  if (nivelLower.includes('avançado') || nivelLower.includes('avancado')) return 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200 border-green-300'
  if (nivelLower.includes('adequado')) return 'bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 border-blue-300'
  if (nivelLower.includes('básico') || nivelLower.includes('basico')) return 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200 border-yellow-300'
  if (nivelLower.includes('insuficiente')) return 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200 border-red-300'
  return 'bg-gray-100 text-gray-700'
}

export interface AbaAlunosProps {
  resultados: ResultadoConsolidado[]
  busca: string
  setBusca: (v: string) => void
  filtros: FiltrosAlunos
  setFiltros: (v: FiltrosAlunos) => void
  listaEscolas: OpcaoSelect[]
  listaTurmas: OpcaoSelect[]
  listaSeries: string[]
  paginacao: PaginacaoInfo & { temProxima: boolean; temAnterior: boolean }
  paginaAtual: number
  carregarAlunos: (p: number) => void
  carregarAlunosComFiltros: (filtros: FiltrosAlunos, busca: string, pagina: number) => void
  carregando: boolean
  disciplinasExibir: Disciplina[]
  getTotalQuestoesPorSerie: (resultado: ResultadoConsolidado, codigo: string) => number | undefined
  setAlunoSelecionado: (v: AlunoSelecionado | null) => void
  setModalAberto: (v: boolean) => void
  tipoUsuario: string
  getEtapaFromSerie: (serie: string | undefined | null) => string | undefined
  getSeriesByEtapa: (etapa: string | undefined, todasSeries: string[]) => string[]
}

export default function AbaAlunos({
  resultados,
  busca,
  setBusca,
  filtros,
  setFiltros,
  listaEscolas,
  listaTurmas,
  listaSeries,
  paginacao,
  paginaAtual,
  carregarAlunos,
  carregarAlunosComFiltros,
  carregando,
  disciplinasExibir,
  getTotalQuestoesPorSerie,
  setAlunoSelecionado,
  setModalAberto,
  tipoUsuario,
  getEtapaFromSerie,
  getSeriesByEtapa
}: AbaAlunosProps) {
  const temFiltrosAtivos = Object.values(filtros).some(v => v) || busca

  const limparFiltros = () => {
    setFiltros({})
    setBusca('')
    // NÃO recarregar automaticamente - usuário precisa clicar em Pesquisar
  }

  // Handler para mudança de série com detecção automática de etapa
  const handleSerieChange = (novaSerie: string) => {
    const novaEtapa = novaSerie ? getEtapaFromSerie(novaSerie) : undefined
    setFiltros({
      ...filtros,
      serie: novaSerie || undefined,
      etapa_ensino: novaEtapa || (novaSerie ? filtros.etapa_ensino : undefined)
    })
    // NÃO recarregar automaticamente - usuário precisa clicar em Pesquisar
  }

  // Handler para mudança de etapa que limpa série se incompatível
  const handleEtapaChange = (novaEtapa: string) => {
    const serieAtual = filtros.serie
    let novaSerie = serieAtual

    // Se a série atual não é compatível com a nova etapa, limpar série
    if (serieAtual && novaEtapa) {
      const etapaDaSerie = getEtapaFromSerie(serieAtual)
      if (etapaDaSerie !== novaEtapa) {
        novaSerie = undefined
      }
    }

    setFiltros({
      ...filtros,
      etapa_ensino: novaEtapa || undefined,
      serie: novaSerie
    })
    // NÃO recarregar automaticamente - usuário precisa clicar em Pesquisar
  }

  // Handler para mudança de escola
  const handleEscolaChange = (novaEscola: string) => {
    setFiltros({
      ...filtros,
      escola_id: novaEscola || undefined,
      turma_id: undefined // Limpa turma ao mudar escola
    })
    // NÃO recarregar automaticamente - usuário precisa clicar em Pesquisar
  }

  // Handler para mudança de turma
  const handleTurmaChange = (novaTurma: string) => {
    setFiltros({ ...filtros, turma_id: novaTurma || undefined })
    // NÃO recarregar automaticamente - usuário precisa clicar em Pesquisar
  }

  // Handler para mudança de presença
  const handlePresencaChange = (novaPresenca: string) => {
    setFiltros({ ...filtros, presenca: novaPresenca || undefined })
    // NÃO recarregar automaticamente - usuário precisa clicar em Pesquisar
  }

  // Handler para busca
  const handleBuscaChange = (novaBusca: string) => {
    setBusca(novaBusca)
  }

  // Handler para pesquisar - ÚNICA forma de carregar dados
  const handlePesquisar = () => {
    carregarAlunosComFiltros(filtros, busca, 1)
  }

  // Filtra turmas baseado na escola selecionada - memoizado para performance
  const turmasFiltradas = useMemo(() =>
    filtros.escola_id
      ? listaTurmas.filter((t) => t.escola_id === filtros.escola_id)
      : listaTurmas
  , [filtros.escola_id, listaTurmas])

  // Filtra séries baseado na etapa selecionada - memoizado para performance
  const seriesFiltradas = useMemo(() =>
    getSeriesByEtapa(filtros.etapa_ensino, listaSeries)
  , [filtros.etapa_ensino, listaSeries])

  return (
    <div className="flex flex-col flex-1 space-y-2 min-h-0">
      {/* Filtro Rápido - Sticky */}
      <div className="sticky top-0 z-20 -mx-2 sm:-mx-4 md:-mx-6 lg:-mx-8 px-2 sm:px-4 md:px-6 lg:px-8 py-1 bg-gray-50 dark:bg-slate-900">
        <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700 px-3 py-2 space-y-2">
          {/* Filtro de Etapa de Ensino */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-gray-100 dark:border-slate-700">
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase whitespace-nowrap">Etapa:</span>
            {[
              { value: '', label: 'Todas' },
              { value: 'anos_iniciais', label: 'Anos Iniciais (2º, 3º, 5º)' },
              { value: 'anos_finais', label: 'Anos Finais (6º-9º)' }
            ].map((etapa) => (
              <button
                key={etapa.value}
                onClick={() => handleEtapaChange(etapa.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                  (etapa.value === '' && !filtros.etapa_ensino) || filtros.etapa_ensino === etapa.value
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                }`}
              >
                {etapa.label}
              </button>
            ))}
          </div>
          {/* Filtro de Série */}
          <div className="flex items-center gap-2 overflow-x-auto">
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase whitespace-nowrap">Série:</span>
            <button
              onClick={() => handleSerieChange('')}
              className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                !filtros.serie
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
              }`}
            >
              Todas
            </button>
            {seriesFiltradas.map((serie) => (
              <button
                key={serie}
                onClick={() => handleSerieChange(serie)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition-colors ${
                  filtros.serie === serie
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                }`}
              >
                {serie}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filtros Avançados - Não sticky */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <div className="flex items-center">
            <Filter className="w-4 h-4 mr-2 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">Filtros Avançados</h2>
          </div>
          {temFiltrosAtivos && (
            <button onClick={limparFiltros} className="flex items-center text-sm text-indigo-600 hover:text-indigo-700">
              <X className="w-4 h-4 mr-1" />
              Limpar filtros
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3">
          {tipoUsuario !== 'escola' && (
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Escola</label>
              <select
                value={filtros.escola_id || ''}
                onChange={(e) => handleEscolaChange(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700"
              >
                <option value="">Todas</option>
                {listaEscolas.map((e) => (
                  <option key={e.id} value={e.id}>{e.nome}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Etapa de Ensino</label>
            <select
              value={filtros.etapa_ensino || ''}
              onChange={(e) => handleEtapaChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700"
            >
              <option value="">Todas</option>
              <option value="anos_iniciais">Anos Iniciais (2º, 3º, 5º)</option>
              <option value="anos_finais">Anos Finais (6º-9º)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Serie</label>
            <select
              value={filtros.serie || ''}
              onChange={(e) => handleSerieChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700"
            >
              <option value="">Todas</option>
              {seriesFiltradas.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Turma</label>
            <select
              value={filtros.turma_id || ''}
              onChange={(e) => handleTurmaChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700"
            >
              <option value="">Todas</option>
              {turmasFiltradas.map((t) => (
                <option key={t.id} value={t.id}>{t.codigo || t.nome}</option>
              ))}
            </select>
            {filtros.escola_id && turmasFiltradas.length === 0 && (
              <p className="text-xs text-amber-600 mt-1">Nenhuma turma encontrada para esta escola</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Presenca</label>
            <select
              value={filtros.presenca || ''}
              onChange={(e) => handlePresencaChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700"
            >
              <option value="">Todas</option>
              <option value="P">Presente</option>
              <option value="F">Faltante</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Busca</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Nome do aluno..."
                value={busca}
                onChange={(e) => handleBuscaChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handlePesquisar()}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700"
              />
            </div>
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={handlePesquisar}
            disabled={carregando}
            className="w-full sm:w-auto px-4 sm:px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-all duration-200 shadow-md hover:shadow-lg sm:min-w-[160px]"
          >
            {carregando ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                <span className="hidden sm:inline">Pesquisando...</span>
                <span className="sm:hidden">...</span>
              </>
            ) : (
              <>
                <Search className="w-4 h-4" />
                <span className="hidden sm:inline">Pesquisar Alunos</span>
                <span className="sm:hidden">Pesquisar</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Tabela de Alunos */}
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 flex flex-col overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-450px)] min-h-[300px]">
          {carregando ? (
            <TabelaCarregando Icone={GraduationCap} mensagem="Carregando alunos..." />
          ) : resultados.length === 0 ? (
            <EstadoBuscaInicial
              titulo="Pesquise os alunos"
              mensagem="Utilize os filtros acima para refinar sua busca e clique em Pesquisar Alunos para carregar os resultados."
              textoBotao="Pesquisar Alunos"
            />
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full min-w-[400px] sm:min-w-[600px] md:min-w-[750px] lg:min-w-[900px]">
              <thead className="bg-gradient-to-r from-indigo-50 to-indigo-100 dark:from-slate-700 dark:to-slate-600 sticky top-0 z-10">
                <tr>
                  <th className="text-center py-2 px-2 font-bold text-indigo-900 dark:text-white text-xs uppercase">#</th>
                  <th className="text-left py-2 px-2 font-bold text-indigo-900 dark:text-white text-xs uppercase min-w-[150px]">Aluno</th>
                  <th className="text-left py-2 px-2 font-bold text-indigo-900 dark:text-white text-xs uppercase">Escola</th>
                  <th className="text-left py-2 px-2 font-bold text-indigo-900 dark:text-white text-xs uppercase">Turma</th>
                  <th className="text-left py-2 px-2 font-bold text-indigo-900 dark:text-white text-xs uppercase">Serie</th>
                  <th className="text-center py-2 px-2 font-bold text-indigo-900 dark:text-white text-xs uppercase">Presenca</th>
                  {disciplinasExibir.map((d) => (
                    <th key={d.codigo} className="text-center py-2 px-1 font-bold text-indigo-900 dark:text-white text-xs uppercase w-14">{d.codigo}</th>
                  ))}
                  <th className="text-center py-2 px-2 font-bold text-indigo-900 dark:text-white text-xs uppercase">Media</th>
                  <th className="text-center py-2 px-2 font-bold text-indigo-900 dark:text-white text-xs uppercase">Acoes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
                {resultados.map((resultado, index) => (
                  <tr key={resultado.id} className="hover:bg-indigo-50 dark:hover:bg-slate-700 transition-colors">
                    <td className="text-center py-2 px-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs">
                        {(paginaAtual - 1) * 50 + index + 1}
                      </span>
                    </td>
                    <td className="py-2 px-2">
                      <button
                        onClick={() => {
                          setAlunoSelecionado({
                            id: resultado.aluno_id || resultado.id,
                            mediaAluno: resultado.media_aluno,
                            notasDisciplinas: {
                              nota_lp: resultado.nota_lp,
                              nota_ch: resultado.nota_ch,
                              nota_mat: resultado.nota_mat,
                              nota_cn: resultado.nota_cn,
                            },
                            niveisDisciplinas: {
                              nivel_lp: resultado.nivel_lp,
                              nivel_mat: resultado.nivel_mat,
                              nivel_prod: resultado.nivel_prod,
                              nivel_aluno: resultado.nivel_aluno,
                            },
                          })
                          setModalAberto(true)
                        }}
                        className="text-left hover:opacity-80"
                      >
                        <span className="font-medium text-indigo-600 hover:text-indigo-800 underline text-sm">{resultado.aluno_nome}</span>
                      </button>
                    </td>
                    <td className="py-2 px-2 text-sm text-gray-600 dark:text-gray-400 truncate max-w-[150px]">{resultado.escola_nome}</td>
                    <td className="py-2 px-2 text-sm text-gray-600 dark:text-gray-400">{resultado.turma_codigo || '-'}</td>
                    <td className="py-2 px-2 text-sm text-gray-600 dark:text-gray-400">{resultado.serie || '-'}</td>
                    <td className="py-2 px-2 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${getPresencaColor(resultado.presenca || 'P')}`}>
                        {resultado.presenca === 'P' || resultado.presenca === 'p' ? 'P' : 'F'}
                      </span>
                    </td>
                    {disciplinasExibir.map((disciplina) => {
                      const nota = getNotaNumero(resultado[disciplina.campo_nota as keyof ResultadoConsolidado] as number | string | null)
                      const acertos = disciplina.campo_acertos ? resultado[disciplina.campo_acertos as keyof ResultadoConsolidado] as number | string : null
                      const totalQuestoes = getTotalQuestoesPorSerie(resultado, disciplina.codigo)
                      const aplicavel = isDisciplinaAplicavel(disciplina.codigo, resultado.serie)
                      // Obter nível correspondente à disciplina
                      // Para PROD, usa nivel_prod do banco ou calcula baseado na nota_producao como fallback
                      const nivelDisciplina = disciplina.codigo === 'LP' ? resultado.nivel_lp :
                                             disciplina.codigo === 'MAT' ? resultado.nivel_mat :
                                             disciplina.codigo === 'PROD' ? (resultado.nivel_prod || calcularNivelPorNota(resultado.nota_producao)) : null

                      return (
                        <td key={disciplina.codigo} className="text-center py-1 px-0.5 sm:py-2 sm:px-1">
                          {!aplicavel ? (
                            <div className="inline-flex flex-col items-center p-1 sm:p-1.5 rounded-lg bg-gray-100 dark:bg-slate-700 w-full max-w-[55px] sm:max-w-[65px]">
                              <div className="text-xs sm:text-sm font-bold text-gray-400">N/A</div>
                            </div>
                          ) : disciplina.tipo === 'nivel' ? (
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold ${getNivelColorDescritivo(resultado.nivel_aprendizagem)}`}>
                              {resultado.nivel_aprendizagem?.substring(0, 3) || '-'}
                            </span>
                          ) : (
                            <div className={`inline-flex flex-col items-center p-1 sm:p-1.5 rounded-lg ${getNotaBgColor(nota)} dark:bg-slate-700 border w-full max-w-[55px] sm:max-w-[65px]`}>
                              {totalQuestoes && acertos !== null && (
                                <div className="text-[9px] sm:text-[10px] text-gray-600 dark:text-gray-400 mb-0.5 font-medium">
                                  {acertos}/{totalQuestoes}
                                </div>
                              )}
                              <div className={`text-xs sm:text-sm font-bold ${getNotaColor(nota)}`}>
                                {formatarNota(nota, resultado.presenca, resultado.media_aluno)}
                              </div>
                              {nota !== null && nota !== 0 && (resultado.presenca === 'P' || resultado.presenca === 'p') && (
                                <div className="w-full bg-gray-200 dark:bg-slate-600 rounded-full h-0.5 sm:h-1 mt-0.5">
                                  <div
                                    className={`h-0.5 sm:h-1 rounded-full ${
                                      nota >= 7 ? 'bg-green-500' : nota >= 5 ? 'bg-yellow-500' : 'bg-red-500'
                                    }`}
                                    style={{ width: `${Math.min((nota / 10) * 100, 100)}%` }}
                                  ></div>
                                </div>
                              )}
                              {/* Badge de nível dentro da célula (Anos Iniciais) */}
                              {isAnosIniciais(resultado.serie) && nivelDisciplina && (
                                <div className="mt-0.5">
                                  <NivelBadge nivel={nivelDisciplina} />
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                      )
                    })}
                    <td className="text-center py-1 px-0.5 sm:py-2 sm:px-1">
                      {(() => {
                        const mediaNum = getNotaNumero(resultado.media_aluno)
                        return (
                          <div className={`inline-flex flex-col items-center justify-center p-1 sm:p-1.5 rounded-xl ${getNotaBgColor(resultado.media_aluno)} dark:bg-slate-700 border-2 ${
                            mediaNum !== null && mediaNum >= 7 ? 'border-green-500' :
                            mediaNum !== null && mediaNum >= 5 ? 'border-yellow-500' :
                            'border-red-500'
                          } w-full max-w-[55px] sm:max-w-[65px]`}>
                            <div className={`text-xs sm:text-sm font-extrabold ${getNotaColor(resultado.media_aluno)}`}>
                              {formatarNota(resultado.media_aluno, resultado.presenca, resultado.media_aluno)}
                            </div>
                            {mediaNum !== null && mediaNum !== 0 && (resultado.presenca === 'P' || resultado.presenca === 'p') && (
                              <div className="text-[9px] sm:text-[10px] font-medium text-gray-600 dark:text-gray-400">
                                Média
                              </div>
                            )}
                            {/* Nível geral do aluno (Anos Iniciais) */}
                            {isAnosIniciais(resultado.serie) && resultado.nivel_aluno && (
                              <NivelBadge nivel={resultado.nivel_aluno} className="mt-0.5 font-extrabold" />
                            )}
                          </div>
                        )
                      })()}
                    </td>
                    <td className="text-center py-1 px-0.5 sm:py-2 sm:px-1">
                      <button
                        onClick={() => {
                          setAlunoSelecionado({
                            id: resultado.aluno_id || resultado.id,
                            mediaAluno: resultado.media_aluno,
                            notasDisciplinas: {
                              nota_lp: resultado.nota_lp,
                              nota_ch: resultado.nota_ch,
                              nota_mat: resultado.nota_mat,
                              nota_cn: resultado.nota_cn,
                            },
                            niveisDisciplinas: {
                              nivel_lp: resultado.nivel_lp,
                              nivel_mat: resultado.nivel_mat,
                              nivel_prod: resultado.nivel_prod,
                              nivel_aluno: resultado.nivel_aluno,
                            },
                          })
                          setModalAberto(true)
                        }}
                        className="p-1.5 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors"
                        title="Ver questoes"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>

        {/* Paginacao */}
        <PaginationControls
          paginaAtual={paginaAtual}
          totalPaginas={paginacao.totalPaginas}
          total={paginacao.total}
          itensPorPagina={50}
          temProxima={paginacao.temProxima}
          temAnterior={paginacao.temAnterior}
          onProxima={() => carregarAlunos(paginaAtual + 1)}
          onAnterior={() => carregarAlunos(paginaAtual - 1)}
          mostrarContagem={true}
          tamanhoIcone="sm"
          className="bg-gray-50 dark:bg-slate-700"
        />

        {/* Legenda de Critérios de Avaliação (Anos Iniciais) */}
        {filtros.serie && isAnosIniciais(filtros.serie) && (
          <div className="px-4 py-3 bg-indigo-50 dark:bg-indigo-900/20 border-t border-indigo-200 dark:border-indigo-700">
            <p className="text-xs font-semibold text-indigo-800 dark:text-indigo-200 mb-2">Critérios de Avaliação por Nível:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-[10px] sm:text-xs">
              <div className="flex items-start gap-1">
                <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full font-bold bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 text-[9px]">N1</span>
                <span className="text-gray-700 dark:text-gray-300">Crítico: LP/MAT 1-3 acertos; 5º MAT 1-5</span>
              </div>
              <div className="flex items-start gap-1">
                <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full font-bold bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300 text-[9px]">N2</span>
                <span className="text-gray-700 dark:text-gray-300">Básico: LP/MAT 4-7 acertos; 5º MAT 6-10</span>
              </div>
              <div className="flex items-start gap-1">
                <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 text-[9px]">N3</span>
                <span className="text-gray-700 dark:text-gray-300">Adequado: LP/MAT 8-11 acertos; 5º MAT 11-15</span>
              </div>
              <div className="flex items-start gap-1">
                <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-full font-bold bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300 text-[9px]">N4</span>
                <span className="text-gray-700 dark:text-gray-300">Avançado: LP/MAT 12+ acertos; 5º MAT 16+</span>
              </div>
            </div>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">* PROD: Insuficiente→N1, Básico→N2, Adequado→N3, Avançado→N4. Nível Geral = média dos níveis.</p>
          </div>
        )}
      </div>
    </div>
  )
}
