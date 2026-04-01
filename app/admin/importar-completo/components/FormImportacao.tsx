'use client'

import { Upload, FileSpreadsheet } from 'lucide-react'

interface AvaliacaoOpcao { id: string; nome: string; tipo: string }

interface FormImportacaoProps {
  arquivo: File | null
  anoLetivo: string
  onAnoLetivoChange: (valor: string) => void
  avaliacoes: AvaliacaoOpcao[]
  avaliacaoId: string
  onAvaliacaoIdChange: (valor: string) => void
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}

export default function FormImportacao({
  arquivo,
  anoLetivo,
  onAnoLetivoChange,
  avaliacoes,
  avaliacaoId,
  onAvaliacaoIdChange,
  onFileChange,
}: FormImportacaoProps) {
  return (
    <div className="mb-4 sm:mb-6">
      <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">
        Importação Completa de Dados
      </h2>
      <p className="text-sm sm:text-base text-gray-600 mb-3 sm:mb-4">
        Esta funcionalidade importa <strong>tudo de uma vez</strong>:
      </p>
      <ul className="list-disc list-inside text-xs sm:text-sm text-gray-600 mb-4 space-y-1 sm:space-y-2 bg-blue-50 p-3 sm:p-4 rounded-lg">
        <li><strong>Polos</strong> - Extraídos da coluna POLO</li>
        <li><strong>Escolas</strong> - Extraídas da coluna ESCOLA e vinculadas aos polos</li>
        <li><strong>Turmas</strong> - Extraídas da coluna TURMA com série e ano letivo</li>
        <li><strong>Alunos</strong> - Extraídos da coluna ALUNO com série e vinculados às turmas</li>
        <li><strong>Questões</strong> - Cria questões Q1 a Q60 automaticamente</li>
        <li><strong>Resultados</strong> - Processa todas as questões (Q1 a Q60) de cada aluno</li>
        <li><strong>Presença</strong> - Extraída da coluna FALTA (P = Presente, F = Falta)</li>
        <li><strong>Série</strong> - Extraída da coluna ANO/SÉRIE</li>
      </ul>

      <div className="mb-4">
        <label htmlFor="ano_letivo" className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
          Ano Letivo
        </label>
        <input
          id="ano_letivo"
          type="text"
          value={anoLetivo}
          onChange={(e) => onAnoLetivoChange(e.target.value)}
          className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          placeholder="Ex: 2024"
        />
        <p className="text-xs text-gray-500 mt-1">Ano letivo ao qual se referem os dados</p>
      </div>

      {avaliacoes.length > 0 && (
        <div className="mb-4">
          <label htmlFor="avaliacao_id" className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Avaliação
          </label>
          <select
            id="avaliacao_id"
            value={avaliacaoId}
            onChange={(e) => onAvaliacaoIdChange(e.target.value)}
            className="w-full px-3 sm:px-4 py-2 text-sm sm:text-base border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="">Selecione a avaliação</option>
            {avaliacoes.map(av => (
              <option key={av.id} value={av.id}>{av.nome}</option>
            ))}
          </select>
          <p className="text-xs text-gray-500 mt-1">Selecione para qual avaliação os dados serão importados</p>
        </div>
      )}

      <div className="border-2 border-dashed border-gray-300 dark:border-slate-600 rounded-lg p-4 sm:p-6 md:p-8 text-center">
        <FileSpreadsheet className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-3 sm:mb-4" />
        <input
          id="arquivo"
          type="file"
          accept=".xlsx,.xls"
          onChange={onFileChange}
          className="hidden"
        />
        <label
          htmlFor="arquivo"
          className="cursor-pointer inline-block bg-indigo-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-indigo-700 transition-colors text-sm sm:text-base"
        >
          <Upload className="w-4 h-4 sm:w-5 sm:h-5 inline-block mr-2" />
          Selecionar Arquivo Excel
        </label>
        {arquivo && (
          <p className="mt-3 sm:mt-4 text-xs sm:text-sm text-gray-700 dark:text-gray-300">
            Arquivo selecionado: <strong className="break-all">{arquivo.name}</strong>
          </p>
        )}
      </div>
    </div>
  )
}
