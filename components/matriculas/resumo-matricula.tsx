'use client'

import { CheckCircle, Users, Plus, RotateCcw } from 'lucide-react'

interface ResumoMatriculaProps {
  resultado: {
    matriculados: number
    criados: number
    erros: string[]
    mensagem: string
  }
  escolaNome: string
  serieName: string
  turmaNome: string
  onNovaMatricula: () => void
  onMesmaTurma: () => void
}

export default function ResumoMatricula({
  resultado,
  escolaNome,
  serieName,
  turmaNome,
  onNovaMatricula,
  onMesmaTurma,
}: ResumoMatriculaProps) {
  return (
    <div className="text-center space-y-6">
      <div>
        <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-3" />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Matrícula Realizada!</h2>
        <p className="text-gray-500 dark:text-gray-400 mt-1">{resultado.mensagem}</p>
      </div>

      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 max-w-md mx-auto">
        <div className="space-y-2 text-sm text-left">
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Escola:</span>
            <span className="font-medium text-gray-900 dark:text-white">{escolaNome}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Série:</span>
            <span className="font-medium text-gray-900 dark:text-white">{serieName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Turma:</span>
            <span className="font-medium text-gray-900 dark:text-white">{turmaNome}</span>
          </div>
          <hr className="border-green-200 dark:border-green-700" />
          <div className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">Total matriculados:</span>
            <span className="font-bold text-green-700 dark:text-green-300">{resultado.matriculados}</span>
          </div>
          {resultado.criados > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Novos cadastros:</span>
              <span className="font-medium text-blue-700 dark:text-blue-300">{resultado.criados}</span>
            </div>
          )}
        </div>
      </div>

      {resultado.erros.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 max-w-md mx-auto text-left">
          <h3 className="text-sm font-semibold text-red-700 dark:text-red-300 mb-2">Erros:</h3>
          <ul className="text-sm text-red-600 dark:text-red-400 space-y-1">
            {resultado.erros.map((erro, i) => (
              <li key={i}>- {erro}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
        <button
          onClick={onMesmaTurma}
          className="px-6 py-2.5 border border-indigo-300 dark:border-indigo-600 text-indigo-700 dark:text-indigo-300 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 font-medium transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" /> Mais alunos na mesma turma
        </button>
        <button
          onClick={onNovaMatricula}
          className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-4 h-4" /> Nova matrícula
        </button>
      </div>
    </div>
  )
}
