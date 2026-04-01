'use client'

import ProtectedRoute from '@/components/protected-route'
import { AlertCircle } from 'lucide-react'
import { useImportacao } from './hooks/useImportacao'
import FormImportacao from './components/FormImportacao'
import ProgressoImportacao from './components/ProgressoImportacao'

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
  } = useImportacao()

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico']}>
        <div className="p-3 sm:p-4 md:p-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4 sm:mb-6 md:mb-8">Importação Completa</h1>

          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-md p-4 sm:p-6">
            <FormImportacao
              arquivo={arquivo}
              anoLetivo={anoLetivo}
              onAnoLetivoChange={setAnoLetivo}
              avaliacoes={avaliacoes}
              avaliacaoId={avaliacaoId}
              onAvaliacaoIdChange={setAvaliacaoId}
              onFileChange={handleFileChange}
            />

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

            <button
              onClick={handleUpload}
              disabled={!arquivo || carregando}
              className="w-full bg-indigo-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {carregando ? 'Importando Dados Completos...' : 'Importar Tudo'}
            </button>

            <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">Importação Completa:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>Processa tudo em uma única operação</li>
                    <li>Cria automaticamente: polos, escolas, turmas, alunos e questões</li>
                    <li>Importa todos os resultados das provas (Q1 a Q60 por aluno)</li>
                    <li>Inclui presença e série de cada aluno</li>
                    <li>Mantém todas as vinculações entre os dados</li>
                    <li>Evita duplicação de cadastros</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
    </ProtectedRoute>
  )
}
