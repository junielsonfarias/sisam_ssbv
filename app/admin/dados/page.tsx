'use client'

import ProtectedRoute from '@/components/protected-route'
import ModalQuestoesAluno from '@/components/modal-questoes-aluno'
import { useEffect, useMemo, useCallback } from 'react'
import {
  Users, School, GraduationCap, MapPin, TrendingUp, TrendingDown,
  Filter, X, ChevronDown, ChevronUp, RefreshCw, Download,
  BookOpen, Calculator, Award, UserCheck, UserX, BarChart3,
  Table, PieChartIcon, Activity, Layers, Eye, EyeOff, AlertTriangle, Target, WifiOff, Search, Zap, FileText, ArrowUpDown
} from 'lucide-react'
import { isAnosIniciais as isAnosIniciaisLib } from '@/lib/disciplinas-mapping'
import { PAGINACAO_ANALISES_INICIAL } from '@/lib/dados/constants'

// Imports dos componentes e utilitarios refatorados
import {
  MetricCard,
  DisciplinaCard,
  NivelBadge,
  TabelaPaginada,
  TabelaCarregando,
  CustomTooltip,
  StatusIndicators,
  AbaNavegacao,
  SeriesChips,
  FiltroSelect,
  type AbaConfig
} from '@/components/dados'
import { AbaVisaoGeral, AbaEscolas, AbaTurmas, AbaAlunos, AbaAnalises } from './components'

// Hooks extraídos
import { useFilterState } from './hooks/useFilterState'
import { useDadosLoading } from './hooks/useDadosLoading'
import { useAnaliseCalculation } from './hooks/useAnaliseCalculation'
import { useDadosFiltering } from './hooks/useDadosFiltering'
import { useSortingPagination } from './hooks/useSortingPagination'


export default function DadosPage() {
  const { filters, setters, helpers } = useFilterState()
  const {
    filtroPoloId, filtroEscolaId, filtroSerie, filtroTurmaId,
    filtroAnoLetivo, filtroPresenca, filtroNivel, filtroFaixaMedia,
    filtroDisciplina, filtroTipoEnsino,
    abaAtiva, ordenacao, paginaAtual, itensPorPagina, paginasAnalises,
    modalAberto, alunoSelecionado,
    tipoUsuario, usuario, escolaNome, poloNome,
    pesquisaRealizada, filtrosCache,
  } = filters
  const {
    setFiltroPoloId, setFiltroEscolaId, setFiltroSerie, setFiltroTurmaId,
    setFiltroAnoLetivo, setFiltroPresenca, setFiltroNivel, setFiltroFaixaMedia,
    setFiltroDisciplina, setFiltroTipoEnsino,
    setAbaAtiva, setOrdenacao, setPaginaAtual, setPaginasAnalises,
    setModalAberto, setAlunoSelecionado,
    setTipoUsuario, setUsuario, setEscolaNome, setPoloNome,
    setPesquisaRealizada, setFiltrosCache,
  } = setters
  const { temFiltrosAtivos, qtdFiltros, limparFiltros, handleOrdenacao } = helpers

  const loading = useDadosLoading({
    filtroPoloId, filtroEscolaId, filtroSerie, filtroTurmaId,
    filtroAnoLetivo, filtroPresenca, filtroNivel, filtroFaixaMedia,
    filtroDisciplina, filtroTipoEnsino,
    setFiltrosCache,
    usuario, setTipoUsuario, setUsuario,
    setFiltroPoloId, setFiltroEscolaId, setEscolaNome, setPoloNome,
  })
  const {
    dados, setDados,
    dadosCache,
    carregando, carregandoEmSegundoPlano,
    erro,
    usandoDadosOffline, modoOffline, usandoCache, setUsandoCache,
    carregarDados, carregarDadosDebounced,
  } = loading

  const { calcularAnaliseDeResumos } = useAnaliseCalculation()
  const { filtrarDadosLocal } = useDadosFiltering({ dadosCache, calcularAnaliseDeResumos })

  const sorting = useSortingPagination({
    dados, dadosCache,
    filtroPoloId, filtroEscolaId, filtroSerie, filtroTurmaId,
    filtroTipoEnsino, filtroDisciplina,
    ordenacao, paginaAtual, itensPorPagina, abaAtiva,
  })
  const {
    isDisciplinaAplicavel, disciplinasExibir, getTotalQuestoesPorSerie,
    escolasFiltradas, turmasFiltradas: turmasFiltradas_select, seriesFiltradas,
    disciplinasDisponiveis, disciplinaSelecionadaInfo,
    escolasOrdenadas, escolasPaginadas,
    turmasOrdenadas, turmasPaginadas,
    alunosOrdenados, alunosPaginados,
    totalPaginas,
  } = sorting

  // Memoize static options for FiltroSelect to avoid new arrays every render
  const opcoesEtapaEnsino = useMemo(() => [
    { value: 'anos_iniciais', label: 'Anos Iniciais (2º, 3º, 5º)' },
    { value: 'anos_finais', label: 'Anos Finais (6º, 7º, 8º, 9º)' }
  ], [])

  const opcoesPresenca = useMemo(() => [
    { value: 'P', label: 'Presentes' },
    { value: 'F', label: 'Faltantes' }
  ], [])

  const abasNavegacao = useMemo(() => [
    { id: 'visao_geral', label: 'Visão Geral', icon: PieChartIcon },
    { id: 'escolas', label: 'Escolas', icon: School },
    { id: 'turmas', label: 'Turmas', icon: Layers },
    { id: 'alunos', label: 'Alunos', icon: Users },
    { id: 'analises', label: 'Análises', icon: Target },
  ], [])

  const opcoesAnoLetivo = useMemo(() =>
    dados?.filtros.anosLetivos.map(ano => ({ value: ano, label: ano })) || [],
    [dados?.filtros.anosLetivos]
  )

  const opcoesPolos = useMemo(() =>
    dados?.filtros.polos.map(polo => ({ value: polo.id, label: polo.nome })) || [],
    [dados?.filtros.polos]
  )

  const opcoesEscolas = useMemo(() =>
    escolasFiltradas.map(escola => ({ value: escola.id, label: escola.nome })),
    [escolasFiltradas]
  )

  const opcoesTurmas = useMemo(() =>
    turmasFiltradas_select.map(turma => ({ value: turma.id, label: turma.codigo })),
    [turmasFiltradas_select]
  )

  const opcoesDisciplinasFiltradas = useMemo(() =>
    disciplinasDisponiveis.filter(d => d.value !== ''),
    [disciplinasDisponiveis]
  )

  const opcoesNiveis = useMemo(() =>
    dados?.filtros.niveis.map(nivel => ({ value: nivel, label: nivel })) || [],
    [dados?.filtros.niveis]
  )

  const opcoesFaixasMedia = useMemo(() =>
    dados?.filtros.faixasMedia.map(faixa => ({ value: faixa, label: faixa })) || [],
    [dados?.filtros.faixasMedia]
  )

  // Função para alterar série via chips
  const handleSerieChipClick = useCallback((serie: string) => {
    setFiltroSerie(serie)
    setPaginaAtual(1)
    setPaginasAnalises(PAGINACAO_ANALISES_INICIAL)
    setFiltroTipoEnsino('')

    if (!pesquisaRealizada) return

    if (dadosCache) {
      const dadosFiltrados = filtrarDadosLocal(serie, filtroDisciplina)
      if (dadosFiltrados) {
        setDados(dadosFiltrados)
        setUsandoCache(true)
        return
      }
    }

    setUsandoCache(false)
    carregarDadosDebounced(true, undefined, true, serie)
  }, [pesquisaRealizada, dadosCache, filtroDisciplina, filtrarDadosLocal, setDados, setUsandoCache, carregarDadosDebounced, setFiltroSerie, setPaginaAtual, setPaginasAnalises, setFiltroTipoEnsino])

  // Função para pesquisar
  const handlePesquisar = useCallback(() => {
    setPesquisaRealizada(true)
    setPaginaAtual(1)
    setPaginasAnalises(PAGINACAO_ANALISES_INICIAL)
    setUsandoCache(false)
    carregarDadosDebounced(true, undefined, false, '')
  }, [setPesquisaRealizada, setPaginaAtual, setPaginasAnalises, setUsandoCache, carregarDadosDebounced])

  // useEffect para aplicar filtro de série/disciplina após cache ser atualizado
  useEffect(() => {
    if (dadosCache && pesquisaRealizada) {
      const dadosFiltrados = filtrarDadosLocal(filtroSerie, filtroDisciplina)
      if (dadosFiltrados) {
        setDados(dadosFiltrados)
        setUsandoCache(true)
      }
    }
  }, [dadosCache, filtroSerie, filtroDisciplina, pesquisaRealizada, filtrarDadosLocal])

  // Limpar disciplina selecionada se não estiver mais disponível na etapa/série atual
  useEffect(() => {
    if (!filtroDisciplina) return

    const isAnosIniciais = filtroTipoEnsino === 'anos_iniciais' ||
      (filtroSerie && isAnosIniciaisLib(filtroSerie))
    const isAnosFinais = filtroTipoEnsino === 'anos_finais' ||
      (filtroSerie && !isAnosIniciaisLib(filtroSerie) && filtroSerie.match(/\d+/)?.[0] &&
        ['6', '7', '8', '9'].includes(filtroSerie.match(/\d+/)![0]))

    if (isAnosIniciais && (filtroDisciplina === 'CH' || filtroDisciplina === 'CN')) {
      setFiltroDisciplina('')
    }
    if (isAnosFinais && filtroDisciplina === 'PT') {
      setFiltroDisciplina('')
    }
  }, [filtroTipoEnsino, filtroSerie, filtroDisciplina])

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'polo', 'escola']}>
        <div className="max-w-full">
          {/* Indicadores de status (offline/cache) */}
          <StatusIndicators
            modoOffline={modoOffline}
            usandoDadosOffline={usandoDadosOffline}
            usandoCache={usandoCache}
          />

          {/* Header */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4 mt-4">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2 sm:gap-3">
                <BarChart3 className="w-6 h-6 sm:w-8 sm:h-8 text-indigo-600 flex-shrink-0" />
                <span className="truncate">Painel de Dados</span>
              </h1>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
                {usuario?.tipo_usuario === 'escola' && escolaNome ? (
                  <>
                    {escolaNome}
                    {poloNome && <span className="text-gray-500 dark:text-gray-400"> - Polo: {poloNome}</span>}
                  </>
                ) : usuario?.tipo_usuario === 'polo' && poloNome ? (
                  <>Polo: {poloNome}</>
                ) : (
                  'Visualize e analise os resultados'
                )}
              </p>
            </div>
          </div>

          {/* Barra de Filtros */}
          <div className="bg-gradient-to-br from-white to-gray-50 dark:from-slate-800 dark:to-slate-900 rounded-xl shadow-lg border-2 border-gray-200 dark:border-slate-700 p-3 sm:p-4 md:p-6 mt-4">
            <div className="flex items-center gap-3 mb-4">
              <Filter className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-bold text-gray-800 dark:text-white">Filtros de Pesquisa</h2>
              {temFiltrosAtivos && (
                <span className="ml-auto flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {qtdFiltros} {qtdFiltros === 1 ? 'filtro ativo' : 'filtros ativos'}
                  </span>
                  <button
                    onClick={limparFiltros}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors shadow-sm"
                  >
                    <X className="w-4 h-4" />
                    Limpar Filtros
                  </button>
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {/* Ano Letivo */}
              <FiltroSelect
                label="Ano Letivo"
                value={filtroAnoLetivo}
                onChange={(v) => { setFiltroAnoLetivo(v); setPaginaAtual(1); }}
                opcoes={opcoesAnoLetivo}
                placeholder="Todos os anos"
              />

              {/* Polo */}
              <FiltroSelect
                label="Polo"
                value={filtroPoloId}
                onChange={(v) => { setFiltroPoloId(v); setFiltroEscolaId(''); setFiltroTurmaId(''); setPaginaAtual(1); }}
                opcoes={opcoesPolos}
                placeholder="Todos os polos"
                fixedValue={(usuario?.tipo_usuario === 'escola' || usuario?.tipo_usuario === 'polo') ? poloNome : undefined}
              />

              {/* Escola */}
              <FiltroSelect
                label="Escola"
                value={filtroEscolaId}
                onChange={(v) => { setFiltroEscolaId(v); setFiltroTurmaId(''); setPaginaAtual(1); }}
                opcoes={opcoesEscolas}
                placeholder="Todas as escolas"
                disabled={!filtroPoloId && usuario?.tipo_usuario !== 'escola'}
                disabledMessage="Selecione um polo primeiro"
                fixedValue={usuario?.tipo_usuario === 'escola' ? escolaNome : undefined}
              />

              {/* Tipo de Ensino */}
              <FiltroSelect
                label="Etapa de Ensino"
                value={filtroTipoEnsino}
                onChange={(v) => { setFiltroTipoEnsino(v); setFiltroSerie(''); setFiltroTurmaId(''); setPaginaAtual(1); }}
                opcoes={opcoesEtapaEnsino}
                placeholder="Todas as etapas"
              />

              {/* Turma */}
              <FiltroSelect
                label="Turma"
                value={filtroTurmaId}
                onChange={(v) => { setFiltroTurmaId(v); setPaginaAtual(1); }}
                opcoes={opcoesTurmas}
                placeholder="Todas as turmas"
                disabled={!filtroSerie}
                disabledMessage="Selecione uma série primeiro"
              />

              {/* Disciplina */}
              <FiltroSelect
                label="Disciplina"
                value={filtroDisciplina}
                onChange={(v) => { setFiltroDisciplina(v); setPaginaAtual(1); }}
                opcoes={opcoesDisciplinasFiltradas}
                placeholder="Todas as disciplinas"
              />

              {/* Presenca */}
              <FiltroSelect
                label="Presença"
                value={filtroPresenca}
                onChange={(v) => { setFiltroPresenca(v); setPaginaAtual(1); }}
                opcoes={opcoesPresenca}
                placeholder="Todos"
              />

              {/* Nivel */}
              <FiltroSelect
                label="Nível"
                value={filtroNivel}
                onChange={(v) => { setFiltroNivel(v); setPaginaAtual(1); }}
                opcoes={opcoesNiveis}
                placeholder="Todos os níveis"
              />

              {/* Faixa de Media */}
              <FiltroSelect
                label="Faixa de Média"
                value={filtroFaixaMedia}
                onChange={(v) => { setFiltroFaixaMedia(v); setPaginaAtual(1); }}
                opcoes={opcoesFaixasMedia}
                placeholder="Todas as faixas"
              />

              {/* Botão Pesquisar */}
              <div className="flex items-end p-3">
                <button
                  onClick={handlePesquisar}
                  disabled={carregando}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors text-sm font-semibold shadow-md"
                  title="Pesquisar dados (usa cache quando possível)"
                >
                  <RefreshCw className={`w-4 h-4 ${carregando ? 'animate-spin' : ''}`} />
                  Pesquisar
                </button>
              </div>

            </div>
          </div>

          {erro && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 p-4 rounded-lg">
              {erro}
            </div>
          )}

          {carregando ? (
            <TabelaCarregando mensagem="Carregando dados..." />
          ) : dados ? (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-10 gap-2 sm:gap-3">
                <MetricCard titulo="Alunos" valor={dados.metricas.total_alunos} icon={Users} cor="indigo" />
                <MetricCard titulo="Escolas" valor={dados.metricas.total_escolas} icon={School} cor="blue" />
                <MetricCard titulo="Turmas" valor={dados.metricas.total_turmas} icon={GraduationCap} cor="purple" />
                <MetricCard titulo="Presentes" valor={dados.metricas.total_presentes} subtitulo={`${(dados.metricas.taxa_presenca || 0).toFixed(1)}%`} icon={UserCheck} cor="green" />
                <MetricCard titulo="Faltantes" valor={dados.metricas.total_faltantes} icon={UserX} cor="red" />
                <MetricCard
                  titulo={disciplinaSelecionadaInfo ? `Media ${disciplinaSelecionadaInfo.sigla}` : "Media Geral"}
                  valor={(disciplinaSelecionadaInfo ? disciplinaSelecionadaInfo.media : dados.metricas.media_geral).toFixed(2)}
                  icon={Award}
                  cor={disciplinaSelecionadaInfo ? disciplinaSelecionadaInfo.cor : "amber"}
                  isDecimal
                />
                <MetricCard titulo="Menor" valor={dados.metricas.menor_media.toFixed(2)} icon={TrendingDown} cor="rose" isDecimal />
                <MetricCard titulo="Maior" valor={dados.metricas.maior_media.toFixed(2)} icon={TrendingUp} cor="emerald" isDecimal />
                {dados.metricas.taxa_acerto_geral !== undefined && dados.metricas.taxa_erro_geral !== undefined && (
                  <>
                    <MetricCard titulo="Taxa Acerto" valor={`${dados.metricas.taxa_acerto_geral.toFixed(1)}%`} icon={Target} cor="green" />
                    <MetricCard titulo="Taxa Erro" valor={`${dados.metricas.taxa_erro_geral.toFixed(1)}%`} icon={AlertTriangle} cor="red" />
                  </>
                )}
              </div>

              {/* Medias por Disciplina */}
              {(() => {
                const isAnosIniciaisFiltro = filtroTipoEnsino === 'anos_iniciais' ||
                  (filtroSerie && isAnosIniciaisLib(filtroSerie))
                const isAnosFinaisFiltro = filtroTipoEnsino === 'anos_finais' ||
                  (filtroSerie && !isAnosIniciaisLib(filtroSerie) && filtroSerie.match(/\d+/)?.[0] &&
                    ['6', '7', '8', '9'].includes(filtroSerie.match(/\d+/)![0]))

                const mostrarCH = !isAnosIniciaisFiltro
                const mostrarCN = !isAnosIniciaisFiltro
                const mostrarPT = !isAnosFinaisFiltro

                return (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3">
                    <DisciplinaCard titulo="Lingua Portuguesa" media={dados.metricas.media_lp} cor="blue" sigla="LP" destaque={filtroDisciplina === 'LP'} />
                    <DisciplinaCard titulo="Matematica" media={dados.metricas.media_mat} cor="purple" sigla="MAT" destaque={filtroDisciplina === 'MAT'} />
                    {mostrarCH && (
                      <DisciplinaCard titulo="Ciencias Humanas" media={dados.metricas.media_ch} cor="amber" sigla="CH" destaque={filtroDisciplina === 'CH'} />
                    )}
                    {mostrarCN && (
                      <DisciplinaCard titulo="Ciencias da Natureza" media={dados.metricas.media_cn} cor="green" sigla="CN" destaque={filtroDisciplina === 'CN'} />
                    )}
                    {mostrarPT && (
                      <DisciplinaCard titulo="Producao Textual" media={dados.metricas.media_producao} cor="rose" sigla="PROD.T" destaque={filtroDisciplina === 'PT'} />
                    )}
                  </div>
                )
              })()}

              {/* Container Sticky para Abas + Serie */}
              <div className="sticky top-14 sm:top-16 z-20 -mx-2 sm:-mx-4 md:-mx-6 lg:-mx-8 px-2 sm:px-4 md:px-6 lg:px-8 pt-4 pb-2 bg-gray-50 dark:bg-slate-900 space-y-2 shadow-md" style={{ marginTop: '1rem' }}>
                {/* Abas de Navegacao */}
                <AbaNavegacao
                  abas={abasNavegacao}
                  abaAtiva={abaAtiva}
                  onChange={(novaAba) => {
                    setAbaAtiva(novaAba as typeof abaAtiva)
                    setPaginaAtual(1)
                    if (novaAba === 'analises' && filtroSerie && pesquisaRealizada) {
                      setUsandoCache(false)
                      carregarDados(true, undefined, true, filtroSerie)
                    }
                  }}
                />

                {/* Chips de Series */}
                <SeriesChips
                  series={seriesFiltradas || []}
                  serieSelecionada={filtroSerie}
                  onChange={handleSerieChipClick}
                  carregando={carregandoEmSegundoPlano}
                />
              </div>

              {/* Conteudo das Abas */}
              {abaAtiva === 'visao_geral' && (
                <AbaVisaoGeral
                  dados={dados}
                  pesquisaRealizada={pesquisaRealizada}
                  filtroSerie={filtroSerie}
                  filtroTipoEnsino={filtroTipoEnsino}
                  filtroDisciplina={filtroDisciplina}
                />
              )}

              {abaAtiva === 'escolas' && (
                <AbaEscolas
                  pesquisaRealizada={pesquisaRealizada}
                  escolasPaginadas={escolasPaginadas}
                  escolasOrdenadas={escolasOrdenadas}
                  filtroSerie={filtroSerie}
                  filtroTipoEnsino={filtroTipoEnsino}
                  filtroDisciplina={filtroDisciplina}
                  ordenacao={ordenacao}
                  handleOrdenacao={handleOrdenacao}
                  paginaAtual={paginaAtual}
                  totalPaginas={totalPaginas}
                  setPaginaAtual={setPaginaAtual}
                  itensPorPagina={itensPorPagina}
                />
              )}

              {abaAtiva === 'turmas' && (
                <AbaTurmas
                  pesquisaRealizada={pesquisaRealizada}
                  dados={dados}
                  turmasPaginadas={turmasPaginadas}
                  turmasOrdenadas={turmasOrdenadas}
                  filtroSerie={filtroSerie}
                  filtroTipoEnsino={filtroTipoEnsino}
                  filtroDisciplina={filtroDisciplina}
                  ordenacao={ordenacao}
                  handleOrdenacao={handleOrdenacao}
                  paginaAtual={paginaAtual}
                  setPaginaAtual={setPaginaAtual}
                  itensPorPagina={itensPorPagina}
                />
              )}

              {abaAtiva === 'alunos' && (
                <AbaAlunos
                  pesquisaRealizada={pesquisaRealizada}
                  alunosPaginados={alunosPaginados}
                  alunosOrdenados={alunosOrdenados}
                  disciplinasExibir={disciplinasExibir}
                  filtroSerie={filtroSerie}
                  filtroTipoEnsino={filtroTipoEnsino}
                  filtroDisciplina={filtroDisciplina}
                  filtroAnoLetivo={filtroAnoLetivo}
                  ordenacao={ordenacao}
                  handleOrdenacao={handleOrdenacao}
                  paginaAtual={paginaAtual}
                  totalPaginas={totalPaginas}
                  setPaginaAtual={setPaginaAtual}
                  itensPorPagina={itensPorPagina}
                  isDisciplinaAplicavel={isDisciplinaAplicavel}
                  getTotalQuestoesPorSerie={getTotalQuestoesPorSerie}
                  setAlunoSelecionado={setAlunoSelecionado}
                  setModalAberto={setModalAberto}
                />
              )}

              {abaAtiva === 'analises' && (
                <AbaAnalises
                  pesquisaRealizada={pesquisaRealizada}
                  dados={dados}
                  filtroSerie={filtroSerie}
                  filtroDisciplina={filtroDisciplina}
                  ordenacao={ordenacao}
                  handleOrdenacao={handleOrdenacao}
                  paginasAnalises={paginasAnalises}
                  setPaginasAnalises={setPaginasAnalises}
                  itensPorPagina={itensPorPagina}
                />
              )}
            </>
          ) : (
            <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-xl">
              <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-500 dark:text-gray-400">Nenhum dado encontrado</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">Verifique se existem dados importados</p>
            </div>
          )}
        </div>

        {/* Modal de Questões do Aluno */}
        {alunoSelecionado && (
          <ModalQuestoesAluno
            isOpen={modalAberto}
            alunoId={alunoSelecionado.id}
            anoLetivo={alunoSelecionado.anoLetivo}
            mediaAluno={alunoSelecionado.mediaAluno}
            notasDisciplinas={alunoSelecionado.notasDisciplinas}
            niveisDisciplinas={alunoSelecionado.niveisDisciplinas}
            onClose={() => {
              setModalAberto(false)
              setAlunoSelecionado(null)
            }}
          />
        )}
    </ProtectedRoute>
  )
}
