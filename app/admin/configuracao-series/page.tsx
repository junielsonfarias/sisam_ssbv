'use client'

import ProtectedRoute from '@/components/protected-route'
import { Settings, Plus, Check, AlertTriangle } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useConfiguracaoSeries } from './useConfiguracaoSeries'
import SerieCard from './components/SerieCard'
import ConfirmarExclusaoModal from './components/ConfirmarExclusaoModal'
import NovaSerieModal from './components/NovaSerieModal'

export default function ConfiguracaoSeriesPage() {
  const {
    series,
    carregando,
    salvando,
    editandoSerie,
    disciplinasEditando,
    mostrarNovaSerieModal,
    novaSerieData,
    mensagem,
    excluindoSerie,
    confirmarExclusao,
    regrasEditando,
    salvandoRegras,
    setMostrarNovaSerieModal,
    setNovaSerieData,
    setConfirmarExclusao,
    handleEditarDisciplinas,
    handleAdicionarDisciplina,
    handleRemoverDisciplina,
    handleMoverDisciplina,
    handleAtualizarDisciplina,
    handleSalvarDisciplinas,
    handleAtualizarTipoEnsino,
    handleCriarSerie,
    handleExcluirSerie,
    handleSalvarRegras,
    handleAtualizarRegra,
    handleCancelarEdicao,
  } = useConfiguracaoSeries()

  return (
    <ProtectedRoute tiposPermitidos={['administrador']}>
        <div className="space-y-6">
          {/* Cabeçalho */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <Settings className="w-8 h-8 text-indigo-600" />
                Configuração de Séries
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Configure as disciplinas e mapeamento de questões para cada série
              </p>
            </div>
            <button
              onClick={() => setMostrarNovaSerieModal(true)}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Nova Série
            </button>
          </div>

          {/* Mensagem de feedback */}
          {mensagem && (
            <div className={`p-4 rounded-lg flex items-center gap-3 ${
              mensagem.tipo === 'sucesso'
                ? 'bg-green-50 dark:bg-green-900/30 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/30 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
            }`}>
              {mensagem.tipo === 'sucesso' ? (
                <Check className="w-5 h-5 flex-shrink-0" />
              ) : (
                <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              )}
              <span>{mensagem.texto}</span>
            </div>
          )}

          {/* Cards de Configuração */}
          {carregando ? (
            <LoadingSpinner text="Carregando configurações..." centered />
          ) : series.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-12 text-center">
              <Settings className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-500 dark:text-gray-400">Nenhuma série configurada</p>
              <p className="text-sm text-gray-400 mt-2">Clique em &quot;Nova Série&quot; para começar</p>
            </div>
          ) : (
            <div className="space-y-6">
              {series.map((config) => (
                <SerieCard
                  key={config.id}
                  config={config}
                  estaEditando={editandoSerie === config.id}
                  disciplinasEditando={disciplinasEditando}
                  salvando={salvando}
                  regras={regrasEditando[config.id]}
                  salvandoRegras={salvandoRegras}
                  onEditarDisciplinas={handleEditarDisciplinas}
                  onSalvarDisciplinas={handleSalvarDisciplinas}
                  onCancelarEdicao={handleCancelarEdicao}
                  onAtualizarTipoEnsino={handleAtualizarTipoEnsino}
                  onConfirmarExclusao={setConfirmarExclusao}
                  onAdicionarDisciplina={handleAdicionarDisciplina}
                  onRemoverDisciplina={handleRemoverDisciplina}
                  onMoverDisciplina={handleMoverDisciplina}
                  onAtualizarDisciplina={handleAtualizarDisciplina}
                  onAtualizarRegra={handleAtualizarRegra}
                  onSalvarRegras={handleSalvarRegras}
                />
              ))}
            </div>
          )}

          {/* Modal Confirmar Exclusão */}
          {confirmarExclusao && (
            <ConfirmarExclusaoModal
              config={confirmarExclusao}
              excluindoSerie={excluindoSerie}
              onConfirmar={handleExcluirSerie}
              onCancelar={() => setConfirmarExclusao(null)}
            />
          )}

          {/* Modal Nova Série */}
          {mostrarNovaSerieModal && (
            <NovaSerieModal
              novaSerieData={novaSerieData}
              salvando={salvando}
              onFechar={() => setMostrarNovaSerieModal(false)}
              onCriar={handleCriarSerie}
              onAtualizarDados={setNovaSerieData}
              onAdicionarDisciplina={handleAdicionarDisciplina}
              onRemoverDisciplina={handleRemoverDisciplina}
              onMoverDisciplina={handleMoverDisciplina}
              onAtualizarDisciplina={handleAtualizarDisciplina}
            />
          )}
        </div>
    </ProtectedRoute>
  )
}
