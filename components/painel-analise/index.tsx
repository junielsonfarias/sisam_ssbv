'use client'

import { RefreshCw } from 'lucide-react'
import ModalQuestoesAluno from '@/components/modal-questoes-aluno'
import { PainelAnaliseProps } from './types'
import { usePainelAnalise } from './use-painel-analise'
import CardsEstatisticas from './cards-estatisticas'
import CardsDisciplinas from './cards-disciplinas'
import FiltrosAnaliseComponent from './filtros-analise'
import TabelaResultados from './tabela-resultados'

export default function PainelAnalise({
  tipoUsuario,
  titulo,
  subtitulo,
  resultadosEndpoint,
  escolasEndpoint,
  turmasEndpoint,
  polosEndpoint,
  mostrarFiltroPolo = false,
  mostrarFiltroEscola = true,
  escolaIdFixo,
  poloIdFixo
}: PainelAnaliseProps) {
  const {
    resultados,
    carregando,
    busca,
    setBusca,
    filtros,
    polos,
    turmas,
    series,
    avaliacoesOpcoes,
    modalAberto,
    alunoSelecionado,
    paginaAtual,
    paginacao,
    estatisticasAPI,
    temFiltrosAtivos,
    mediaGeralCalculada,
    escolasFiltradas,
    carregarResultados,
    handleFiltroChange,
    limparFiltros,
    handleBuscar,
    handleLimparBusca,
    proximaPagina,
    paginaAnterior,
    getTotalQuestoesPorSerie,
    handleVisualizarQuestoes,
    handleFecharModal,
  } = usePainelAnalise({
    resultadosEndpoint,
    escolasEndpoint,
    turmasEndpoint,
    polosEndpoint,
    mostrarFiltroPolo,
    mostrarFiltroEscola,
    escolaIdFixo,
    poloIdFixo,
  })

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 overflow-x-hidden max-w-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 dark:text-white">{titulo}</h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">
            {subtitulo}
          </p>
        </div>
        <button
          onClick={() => carregarResultados(1, true)}
          disabled={carregando}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors text-sm sm:text-base flex-shrink-0"
          title="Pesquisar dados (forca atualizacao)"
        >
          <RefreshCw className={`w-4 h-4 ${carregando ? 'animate-spin' : ''}`} />
          <span>Pesquisar</span>
        </button>
      </div>

      <FiltrosAnaliseComponent
        filtros={filtros}
        busca={busca}
        setBusca={setBusca}
        handleFiltroChange={handleFiltroChange}
        limparFiltros={limparFiltros}
        temFiltrosAtivos={temFiltrosAtivos}
        carregando={carregando}
        onBuscar={handleBuscar}
        onLimparBusca={handleLimparBusca}
        polos={polos}
        escolasFiltradas={escolasFiltradas}
        turmas={turmas}
        series={series}
        avaliacoesOpcoes={avaliacoesOpcoes}
        mostrarFiltroPolo={mostrarFiltroPolo}
        mostrarFiltroEscola={mostrarFiltroEscola}
        escolaIdFixo={escolaIdFixo}
        poloIdFixo={poloIdFixo}
      />

      <CardsEstatisticas
        estatisticas={estatisticasAPI}
        paginacao={paginacao}
        mediaGeralCalculada={mediaGeralCalculada}
        carregando={carregando}
      />

      <CardsDisciplinas
        estatisticas={estatisticasAPI}
        paginacao={paginacao}
        carregando={carregando}
        serieFiltro={filtros.serie}
      />

      <TabelaResultados
        resultados={resultados}
        carregando={carregando}
        paginaAtual={paginaAtual}
        paginacao={paginacao}
        filtros={filtros}
        getTotalQuestoesPorSerie={getTotalQuestoesPorSerie}
        onVisualizarQuestoes={handleVisualizarQuestoes}
        onProximaPagina={proximaPagina}
        onPaginaAnterior={paginaAnterior}
      />

      {/* Modal */}
      {alunoSelecionado && (
        <ModalQuestoesAluno
          alunoId={alunoSelecionado.id}
          anoLetivo={alunoSelecionado.anoLetivo}
          mediaAluno={alunoSelecionado.mediaAluno}
          notasDisciplinas={alunoSelecionado.notasDisciplinas}
          niveisDisciplinas={alunoSelecionado.niveisDisciplinas}
          isOpen={modalAberto}
          onClose={handleFecharModal}
        />
      )}
    </div>
  )
}
