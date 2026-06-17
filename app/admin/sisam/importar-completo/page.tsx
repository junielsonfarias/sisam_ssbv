'use client'

import ProtectedRoute from '@/components/protected-route'
import { AlertCircle, Loader2 } from 'lucide-react'
import { useImportacao } from './hooks/useImportacao'
import FormImportacao from './components/FormImportacao'
import ProgressoImportacao from './components/ProgressoImportacao'
import PreviewImportacao from './components/PreviewImportacao'

export default function ImportarCompletoPage() {
  const {
    arquivo,
    anoLetivo,
    setAnoLetivo,
    avaliacoes,
    avaliacaoId,
    setAvaliacaoId,
    carregando,
    resultado,
    erro,
    progresso,
    importacaoIdRef,
    handleFileChange,
    handleUpload,
    handlePausar,
    handleRetomar,
    handleCancelar,
    // Preview
    etapa,
    previewData,
    carregandoPreview,
    handlePreview,
    handleCancelarPreview,
  } = useImportacao()

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico']}>
        <div className="p-3 sm:p-4 md:p-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 dark:text-white mb-4 sm:mb-6 md:mb-8">Importacao Completa</h1>

          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 sm:p-6">

            {/* Etapa 1: Upload do arquivo */}
            {etapa === 'upload' && (
              <>
                <FormImportacao
                  arquivo={arquivo}
                  anoLetivo={anoLetivo}
                  onAnoLetivoChange={setAnoLetivo}
                  avaliacoes={avaliacoes}
                  avaliacaoId={avaliacaoId}
                  onAvaliacaoIdChange={setAvaliacaoId}
                  onFileChange={handleFileChange}
                />

                {erro && (
                  <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-lg flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                    {erro}
                  </div>
                )}

                <button
                  onClick={handlePreview}
                  disabled={!arquivo || carregandoPreview}
                  className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  {carregandoPreview ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Analisando arquivo...
                    </>
                  ) : (
                    'Pre-visualizar Importacao'
                  )}
                </button>

                <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2 mt-0.5" />
                    <div className="text-sm text-blue-800 dark:text-blue-300">
                      <p className="font-semibold mb-1">Importacao Completa:</p>
                      <ul className="list-disc list-inside space-y-1">
                        <li>Processa tudo em uma unica operacao</li>
                        <li>Cria automaticamente: polos, escolas, turmas, alunos e questoes</li>
                        <li>Importa todos os resultados das provas (Q1 a Q60 por aluno)</li>
                        <li>Inclui presenca e serie de cada aluno</li>
                        <li>Mantem todas as vinculacoes entre os dados</li>
                        <li>Evita duplicacao de cadastros</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Etapa 2: Pre-visualizacao */}
            {etapa === 'preview' && previewData && (
              <PreviewImportacao
                dados={previewData}
                onConfirmar={handleUpload}
                onCancelar={handleCancelarPreview}
                confirmando={carregando}
              />
            )}

            {/* Etapa 3: Importacao em andamento */}
            {etapa === 'importando' && (
              <ProgressoImportacao
                progresso={progresso}
                carregando={carregando}
                temImportacaoAtiva={!!importacaoIdRef.current}
                erro={erro}
                resultado={resultado}
                onPausar={handlePausar}
                onRetomar={handleRetomar}
                onCancelar={handleCancelar}
              />
            )}
          </div>
        </div>
    </ProtectedRoute>
  )
}
