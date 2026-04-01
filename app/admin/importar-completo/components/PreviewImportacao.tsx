'use client'

import { AlertTriangle, CheckCircle, XCircle, Users, Building2, MapPin, BookOpen, FileSpreadsheet } from 'lucide-react'

// ============================================================================
// TIPOS
// ============================================================================

interface Duplicata {
  nome_original: string
  nome_similar: string
  linha_original: number
  linha_similar: number
}

interface SerieInvalida {
  serie: string
  linha: number
  aluno: string
}

interface ErroFormato {
  linha: number
  campo: string
  mensagem: string
}

export interface PreviewData {
  total_linhas: number
  polos: string[]
  escolas: string[]
  turmas: string[]
  alunos: number
  duplicatas: Duplicata[]
  series_invalidas: SerieInvalida[]
  erros_formato: ErroFormato[]
  amostra: Record<string, unknown>[]
}

interface PreviewImportacaoProps {
  dados: PreviewData
  onConfirmar: () => void
  onCancelar: () => void
  confirmando?: boolean
}

// ============================================================================
// COMPONENTES AUXILIARES
// ============================================================================

/** Card de resumo com icone e contagem */
function CardResumo({ icone, label, valor, cor }: {
  icone: React.ReactNode
  label: string
  valor: number | string
  cor: string
}) {
  return (
    <div className={`bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4`}>
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${cor}`}>
          {icone}
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
          <p className="text-xl font-bold text-gray-800 dark:text-white">{valor}</p>
        </div>
      </div>
    </div>
  )
}

/** Secao colapsavel de alertas */
function SecaoAlerta({ titulo, tipo, itens, children }: {
  titulo: string
  tipo: 'aviso' | 'erro'
  itens: number
  children: React.ReactNode
}) {
  if (itens === 0) return null

  const cores = tipo === 'aviso'
    ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
    : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'

  const icone = tipo === 'aviso'
    ? <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
    : <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />

  const corTexto = tipo === 'aviso'
    ? 'text-amber-800 dark:text-amber-300'
    : 'text-red-800 dark:text-red-300'

  return (
    <div className={`rounded-xl border p-4 ${cores}`}>
      <div className="flex items-center gap-2 mb-3">
        {icone}
        <h3 className={`font-semibold ${corTexto}`}>
          {titulo} ({itens})
        </h3>
      </div>
      {children}
    </div>
  )
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function PreviewImportacao({
  dados,
  onConfirmar,
  onCancelar,
  confirmando = false,
}: PreviewImportacaoProps) {
  const temAvisos = dados.duplicatas.length > 0 || dados.series_invalidas.length > 0
  const temErros = dados.erros_formato.length > 0

  return (
    <div className="space-y-6">
      {/* Titulo */}
      <div className="flex items-center gap-3">
        <CheckCircle className="w-6 h-6 text-green-600" />
        <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white">
          Pre-visualizacao da Importacao
        </h2>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <CardResumo
          icone={<FileSpreadsheet className="w-5 h-5 text-indigo-600" />}
          label="Total de Linhas"
          valor={dados.total_linhas.toLocaleString('pt-BR')}
          cor="bg-indigo-100 dark:bg-indigo-900/30"
        />
        <CardResumo
          icone={<MapPin className="w-5 h-5 text-blue-600" />}
          label="Polos"
          valor={dados.polos.length}
          cor="bg-blue-100 dark:bg-blue-900/30"
        />
        <CardResumo
          icone={<Building2 className="w-5 h-5 text-purple-600" />}
          label="Escolas"
          valor={dados.escolas.length}
          cor="bg-purple-100 dark:bg-purple-900/30"
        />
        <CardResumo
          icone={<BookOpen className="w-5 h-5 text-teal-600" />}
          label="Turmas"
          valor={dados.turmas.length}
          cor="bg-teal-100 dark:bg-teal-900/30"
        />
        <CardResumo
          icone={<Users className="w-5 h-5 text-green-600" />}
          label="Alunos"
          valor={dados.alunos.toLocaleString('pt-BR')}
          cor="bg-green-100 dark:bg-green-900/30"
        />
      </div>

      {/* Listas de polos e escolas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Polos encontrados</h3>
          <div className="flex flex-wrap gap-1.5">
            {dados.polos.map((polo) => (
              <span key={polo} className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
                {polo}
              </span>
            ))}
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Escolas encontradas</h3>
          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto">
            {dados.escolas.map((escola) => (
              <span key={escola} className="px-2 py-0.5 text-xs bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-full">
                {escola}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Avisos: Duplicatas */}
      <SecaoAlerta titulo="Possiveis duplicatas" tipo="aviso" itens={dados.duplicatas.length}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-amber-700 dark:text-amber-400">
                <th className="pb-1 pr-3">Nome Original</th>
                <th className="pb-1 pr-3">Linha</th>
                <th className="pb-1 pr-3">Nome Similar</th>
                <th className="pb-1">Linha</th>
              </tr>
            </thead>
            <tbody className="text-amber-800 dark:text-amber-300">
              {dados.duplicatas.slice(0, 20).map((d, i) => (
                <tr key={i} className="border-t border-amber-200 dark:border-amber-800/50">
                  <td className="py-1 pr-3">{d.nome_original}</td>
                  <td className="py-1 pr-3">{d.linha_original}</td>
                  <td className="py-1 pr-3">{d.nome_similar}</td>
                  <td className="py-1">{d.linha_similar}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {dados.duplicatas.length > 20 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
              ... e mais {dados.duplicatas.length - 20} duplicatas
            </p>
          )}
        </div>
      </SecaoAlerta>

      {/* Avisos: Series invalidas */}
      <SecaoAlerta titulo="Series invalidas" tipo="aviso" itens={dados.series_invalidas.length}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-amber-700 dark:text-amber-400">
                <th className="pb-1 pr-3">Linha</th>
                <th className="pb-1 pr-3">Aluno</th>
                <th className="pb-1">Serie</th>
              </tr>
            </thead>
            <tbody className="text-amber-800 dark:text-amber-300">
              {dados.series_invalidas.slice(0, 20).map((s, i) => (
                <tr key={i} className="border-t border-amber-200 dark:border-amber-800/50">
                  <td className="py-1 pr-3">{s.linha}</td>
                  <td className="py-1 pr-3">{s.aluno}</td>
                  <td className="py-1">{s.serie}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {dados.series_invalidas.length > 20 && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
              ... e mais {dados.series_invalidas.length - 20} series
            </p>
          )}
        </div>
      </SecaoAlerta>

      {/* Erros de formato */}
      <SecaoAlerta titulo="Erros de formato" tipo="erro" itens={dados.erros_formato.length}>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-red-700 dark:text-red-400">
                <th className="pb-1 pr-3">Linha</th>
                <th className="pb-1 pr-3">Campo</th>
                <th className="pb-1">Mensagem</th>
              </tr>
            </thead>
            <tbody className="text-red-800 dark:text-red-300">
              {dados.erros_formato.slice(0, 20).map((e, i) => (
                <tr key={i} className="border-t border-red-200 dark:border-red-800/50">
                  <td className="py-1 pr-3">{e.linha}</td>
                  <td className="py-1 pr-3 font-mono">{e.campo}</td>
                  <td className="py-1">{e.mensagem}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {dados.erros_formato.length > 20 && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-2">
              ... e mais {dados.erros_formato.length - 20} erros
            </p>
          )}
        </div>
      </SecaoAlerta>

      {/* Amostra de dados */}
      {dados.amostra.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Amostra dos dados (primeiras {dados.amostra.length} linhas)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-slate-700">
                  {Object.keys(dados.amostra[0]).slice(0, 8).map((col) => (
                    <th key={col} className="pb-2 pr-3 font-medium whitespace-nowrap">{col}</th>
                  ))}
                  {Object.keys(dados.amostra[0]).length > 8 && (
                    <th className="pb-2 font-medium">...</th>
                  )}
                </tr>
              </thead>
              <tbody className="text-gray-700 dark:text-gray-300">
                {dados.amostra.map((linha, i) => {
                  const colunas = Object.entries(linha).slice(0, 8)
                  return (
                    <tr key={i} className="border-t border-gray-100 dark:border-slate-700/50">
                      {colunas.map(([col, val]) => (
                        <td key={col} className="py-1.5 pr-3 whitespace-nowrap max-w-[150px] truncate">
                          {String(val ?? '')}
                        </td>
                      ))}
                      {Object.keys(linha).length > 8 && (
                        <td className="py-1.5 text-gray-400">...</td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Botoes de acao */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <button
          onClick={onCancelar}
          disabled={confirmando}
          className="flex-1 px-6 py-3 rounded-lg font-medium border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 bg-white dark:bg-slate-800 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>
        <button
          onClick={onConfirmar}
          disabled={confirmando}
          className="flex-1 px-6 py-3 rounded-lg font-medium text-white bg-indigo-600 hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {confirmando ? 'Importando...' : 'Confirmar Importacao'}
        </button>
      </div>

      {/* Aviso se ha problemas */}
      {(temAvisos || temErros) && (
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          {temErros
            ? 'Existem erros de formato. As linhas com erro serao ignoradas durante a importacao.'
            : 'Existem avisos. Verifique os detalhes acima antes de confirmar.'}
        </p>
      )}
    </div>
  )
}
