'use client'

import { Loader2, Pause, Play, StopCircle, CheckCircle, XCircle, Database, TrendingUp, AlertCircle } from 'lucide-react'
import type { ProgressoImportacao as ProgressoType } from '../hooks/useImportacao'

interface ProgressoImportacaoProps {
  progresso: ProgressoType | null
  carregando: boolean
  temImportacaoAtiva: boolean
  erro: string
  resultado: any
  onPausar: () => void
  onRetomar: () => void
  onCancelar: () => void
}

export default function ProgressoImportacao({
  progresso,
  carregando,
  temImportacaoAtiva,
  erro,
  resultado,
  onPausar,
  onRetomar,
  onCancelar,
}: ProgressoImportacaoProps) {
  const status = progresso?.status || 'processando'

  return (
    <>
      {erro && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center">
          <XCircle className="w-5 h-5 mr-2" />
          {erro}
        </div>
      )}

      {(progresso || (carregando && temImportacaoAtiva)) && (
        <div className={`mb-6 rounded-lg p-4 sm:p-6 border ${
          status === 'pausado'
            ? 'bg-yellow-50 border-yellow-200'
            : status === 'cancelado'
            ? 'bg-red-50 border-red-200'
            : 'bg-blue-50 border-blue-200'
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center">
              {status === 'processando' && <Loader2 className="w-5 h-5 text-blue-600 mr-2 animate-spin" />}
              {status === 'pausado' && <Pause className="w-5 h-5 text-yellow-600 mr-2" />}
              {status === 'cancelado' && <StopCircle className="w-5 h-5 text-red-600 mr-2" />}
              <span className={`text-sm sm:text-base font-semibold ${
                status === 'pausado' ? 'text-yellow-800' : status === 'cancelado' ? 'text-red-800' : 'text-blue-800'
              }`}>
                {status === 'pausado' ? 'Importação Pausada' : status === 'cancelado' ? 'Importação Cancelada' : 'Importando...'}
              </span>
            </div>
            <span className={`text-sm sm:text-base font-bold ${
              status === 'pausado' ? 'text-yellow-600' : status === 'cancelado' ? 'text-red-600' : 'text-blue-600'
            }`}>
              {progresso?.porcentagem || 0}%
            </span>
          </div>

          <div className={`w-full rounded-full h-3 sm:h-4 mb-3 ${
            status === 'pausado' ? 'bg-yellow-200' : status === 'cancelado' ? 'bg-red-200' : 'bg-blue-200'
          }`}>
            <div
              className={`h-3 sm:h-4 rounded-full transition-all duration-300 ease-out ${
                status === 'pausado' ? 'bg-yellow-600' : status === 'cancelado' ? 'bg-red-600' : 'bg-blue-600'
              }`}
              style={{ width: `${progresso?.porcentagem || 0}%` }}
            />
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0 mb-3">
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-xs sm:text-sm">
              <span className={status === 'pausado' ? 'text-yellow-700' : status === 'cancelado' ? 'text-red-700' : 'text-blue-700'}>
                Linhas processadas: <strong>{progresso?.linhas_processadas || 0}</strong> / {progresso?.total_linhas || 0}
              </span>
              <span className={status === 'pausado' ? 'text-yellow-700' : status === 'cancelado' ? 'text-red-700' : 'text-blue-700'}>
                Status: <strong className="capitalize">{status}</strong>
              </span>
            </div>
          </div>

          {status === 'processando' && (
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <button onClick={onPausar} className="flex items-center px-3 sm:px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors text-xs sm:text-sm font-medium">
                <Pause className="w-4 h-4 mr-1 sm:mr-2" /> Pausar
              </button>
              <button onClick={onCancelar} className="flex items-center px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs sm:text-sm font-medium">
                <StopCircle className="w-4 h-4 mr-1 sm:mr-2" /> Cancelar
              </button>
            </div>
          )}

          {status === 'pausado' && (
            <div className="flex flex-wrap gap-2 sm:gap-3">
              <button onClick={onRetomar} className="flex items-center px-3 sm:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs sm:text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                <Play className="w-4 h-4 mr-1 sm:mr-2" /> Retomar
              </button>
              <button onClick={onCancelar} className="flex items-center px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs sm:text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                <StopCircle className="w-4 h-4 mr-1 sm:mr-2" /> Cancelar
              </button>
            </div>
          )}

          {status === 'cancelado' && (
            <div className="text-xs sm:text-sm text-red-700">
              <p>A importação foi cancelada. Os dados processados até o momento foram salvos.</p>
            </div>
          )}
        </div>
      )}

      {resultado && resultado.resultado && (
        <div className="mb-6 space-y-4">
          {resultado.resultado.resultados && resultado.resultado.resultados.processados > 0 ? (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
              <div className="flex items-center mb-2">
                <CheckCircle className="w-5 h-5 mr-2" />
                <strong>Importação completa realizada com sucesso!</strong>
              </div>
            </div>
          ) : (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
              <div className="flex items-center mb-2">
                <XCircle className="w-5 h-5 mr-2" />
                <strong>Nenhuma linha foi processada!</strong>
              </div>
            </div>
          )}

          {resultado.resultado && resultado.resultado.resultados && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <Database className="w-5 h-5 text-blue-600 mr-2" />
                  <h3 className="font-semibold text-gray-800 dark:text-white">Polos</h3>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>Total: {resultado.resultado.polos.total}</p>
                  <p className="text-green-600 dark:text-green-400">Criados: {resultado.resultado.polos.criados}</p>
                  <p className="text-gray-500 dark:text-gray-400">Existentes: {resultado.resultado.polos.existentes}</p>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <Database className="w-5 h-5 text-green-600 mr-2" />
                  <h3 className="font-semibold text-gray-800 dark:text-white">Escolas</h3>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>Total: {resultado.resultado.escolas.total}</p>
                  <p className="text-green-600 dark:text-green-400">Criadas: {resultado.resultado.escolas.criados}</p>
                  <p className="text-gray-500 dark:text-gray-400">Existentes: {resultado.resultado.escolas.existentes}</p>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <Database className="w-5 h-5 text-purple-600 mr-2" />
                  <h3 className="font-semibold text-gray-800 dark:text-white">Turmas</h3>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <p className="text-green-600 dark:text-green-400">Criadas: {resultado.resultado.turmas.criados}</p>
                  <p className="text-gray-500 dark:text-gray-400">Existentes: {resultado.resultado.turmas.existentes}</p>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <Database className="w-5 h-5 text-indigo-600 mr-2" />
                  <h3 className="font-semibold text-gray-800 dark:text-white">Alunos</h3>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <p className="text-green-600 dark:text-green-400">Criados: {resultado.resultado.alunos.criados}</p>
                  <p className="text-gray-500 dark:text-gray-400">Existentes: {resultado.resultado.alunos.existentes}</p>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <Database className="w-5 h-5 text-yellow-600 mr-2" />
                  <h3 className="font-semibold text-gray-800 dark:text-white">Questões</h3>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <p className="text-green-600 dark:text-green-400">Criadas: {resultado.resultado.questoes.criadas}</p>
                  <p className="text-gray-500 dark:text-gray-400">Existentes: {resultado.resultado.questoes.existentes}</p>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex items-center mb-2">
                  <TrendingUp className="w-5 h-5 text-indigo-600 mr-2" />
                  <h3 className="font-semibold text-gray-800 dark:text-white">Resultados</h3>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>Alunos processados: {resultado.resultado.resultados.processados}</p>
                  <p className="text-green-600 dark:text-green-400">Questões novas: {resultado.resultado.resultados.novos || 0}</p>
                  {resultado.resultado.resultados.duplicados > 0 && (
                    <p className="text-gray-500 dark:text-gray-400">Duplicados ignorados: {resultado.resultado.resultados.duplicados}</p>
                  )}
                  <p className="text-green-600 dark:text-green-400">&#10003; Notas e médias importadas</p>
                  {resultado.resultado.resultados.erros > 0 && (
                    <p className="text-orange-600">Erros: {resultado.resultado.resultados.erros}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {resultado.resultado && (
            <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
              <h3 className="font-semibold text-indigo-800 mb-3">Dados Importados por Aluno:</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                <div>
                  <p className="text-indigo-700 font-medium">&#10003; Notas por Área</p>
                  <p className="text-gray-600 text-xs">LP, CH, MAT, CN</p>
                </div>
                <div>
                  <p className="text-indigo-700 font-medium">&#10003; Totais de Acertos</p>
                  <p className="text-gray-600 text-xs">Por área de conhecimento</p>
                </div>
                <div>
                  <p className="text-indigo-700 font-medium">&#10003; Média do Aluno</p>
                  <p className="text-gray-600 text-xs">Média geral</p>
                </div>
                <div>
                  <p className="text-indigo-700 font-medium">&#10003; Presença</p>
                  <p className="text-gray-600 text-xs">P (Presente) / F (Falta)</p>
                </div>
              </div>
            </div>
          )}

          {resultado.ano_letivo && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Ano Letivo:</strong> {resultado.ano_letivo}
              </p>
            </div>
          )}

          {resultado.erros && resultado.erros.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="font-semibold text-yellow-800 mb-2">Primeiros Erros Encontrados:</p>
              <div className="max-h-60 overflow-y-auto text-sm">
                {resultado.erros.map((erro: string, index: number) => (
                  <p key={index} className="text-yellow-700 mb-1">{erro}</p>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
}
