'use client'

import { useState, useCallback, useEffect } from 'react'
import { Search, Plus, X, UserPlus, GraduationCap, Accessibility } from 'lucide-react'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { ButtonSpinner } from '@/components/ui/loading-spinner'

interface AlunoExistente {
  id: string
  codigo: string | null
  nome: string
  serie: string | null
  escola_nome?: string
  turma_codigo?: string
  cpf?: string
}

interface AlunoParaMatricula {
  id?: string
  nome: string
  codigo?: string | null
  cpf?: string | null
  data_nascimento?: string | null
  pcd?: boolean
  existente?: boolean
  serie_individual?: string
}

interface EtapaAlunosProps {
  escolaId: string
  turmaId: string
  serie: string
  alunosSelecionados: AlunoParaMatricula[]
  onAlunosChange: (alunos: AlunoParaMatricula[]) => void
  onMatricular: () => void
  onVoltar: () => void
  matriculando: boolean
  turmaMultiserie?: boolean
  turmaMultietapa?: boolean
}

export default function EtapaAlunos({
  escolaId,
  turmaId,
  serie,
  alunosSelecionados,
  onAlunosChange,
  onMatricular,
  onVoltar,
  matriculando,
  turmaMultiserie,
  turmaMultietapa,
}: EtapaAlunosProps) {
  const isMulti = turmaMultiserie || turmaMultietapa
  const [busca, setBusca] = useState('')
  const buscaDebounced = useDebounce(busca, 400)
  const [resultadosBusca, setResultadosBusca] = useState<AlunoExistente[]>([])
  const [buscando, setBuscando] = useState(false)
  const [mostrarFormNovo, setMostrarFormNovo] = useState(false)
  const [novoAluno, setNovoAluno] = useState<AlunoParaMatricula>({
    nome: '',
    cpf: '',
    data_nascimento: '',
    pcd: false,
    serie_individual: '',
  })

  // Buscar alunos existentes
  const buscarAlunos = useCallback(async (termo: string) => {
    if (termo.length < 2) { setResultadosBusca([]); return }
    setBuscando(true)
    try {
      const res = await fetch(`/api/admin/matriculas/alunos/buscar?busca=${encodeURIComponent(termo)}`)
      const data = await res.json()
      setResultadosBusca(Array.isArray(data) ? data : [])
    } catch {
      setResultadosBusca([])
    } finally {
      setBuscando(false)
    }
  }, [])

  // Reagir ao debounce
  useEffect(() => {
    if (buscaDebounced) buscarAlunos(buscaDebounced)
    else setResultadosBusca([])
  }, [buscaDebounced, buscarAlunos])

  const adicionarExistente = (aluno: AlunoExistente) => {
    if (alunosSelecionados.some(a => a.id === aluno.id)) return
    onAlunosChange([
      ...alunosSelecionados,
      { id: aluno.id, nome: aluno.nome, codigo: aluno.codigo, cpf: aluno.cpf, existente: true },
    ])
  }

  const adicionarNovo = () => {
    if (!novoAluno.nome.trim()) return
    onAlunosChange([
      ...alunosSelecionados,
      { ...novoAluno, nome: novoAluno.nome.trim(), existente: false },
    ])
    setNovoAluno({ nome: '', cpf: '', data_nascimento: '', pcd: false, serie_individual: '' })
    setMostrarFormNovo(false)
  }

  const removerAluno = (index: number) => {
    onAlunosChange(alunosSelecionados.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <GraduationCap className="w-12 h-12 mx-auto text-indigo-500 mb-2" />
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Adicionar Alunos</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">Busque alunos existentes ou cadastre novos</p>
      </div>

      {/* Buscar alunos existentes */}
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
          <Search className="w-4 h-4" /> Buscar Aluno Existente
        </h3>
        <input
          type="text"
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Digite nome, código ou CPF do aluno..."
          className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
        />

        {buscando && <p className="text-sm text-gray-500 mt-2">Buscando...</p>}

        {resultadosBusca.length > 0 && (
          <div className="mt-2 max-h-48 overflow-y-auto border border-gray-200 dark:border-slate-700 rounded-lg divide-y divide-gray-100 dark:divide-slate-700">
            {resultadosBusca.map(aluno => {
              const jaSelecionado = alunosSelecionados.some(a => a.id === aluno.id)
              return (
                <div key={aluno.id} className="flex items-center justify-between p-2.5 hover:bg-gray-50 dark:hover:bg-slate-700/50">
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{aluno.nome}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {aluno.codigo && <span>Cód: {aluno.codigo}</span>}
                      {aluno.escola_nome && <span> | {aluno.escola_nome}</span>}
                      {aluno.turma_codigo && <span> | Turma: {aluno.turma_codigo}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => adicionarExistente(aluno)}
                    disabled={jaSelecionado}
                    className="flex-shrink-0 ml-2 p-1.5 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                    title={jaSelecionado ? 'Já adicionado' : 'Adicionar'}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Cadastrar novo aluno */}
      <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
            <UserPlus className="w-4 h-4" /> Cadastrar Novo Aluno
          </h3>
          {!mostrarFormNovo && (
            <button
              onClick={() => setMostrarFormNovo(true)}
              className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium"
            >
              + Novo aluno
            </button>
          )}
        </div>

        {mostrarFormNovo && (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Nome *</label>
                <input
                  type="text"
                  value={novoAluno.nome}
                  onChange={e => setNovoAluno({ ...novoAluno, nome: e.target.value })}
                  placeholder="Nome completo"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">CPF (opcional)</label>
                <input
                  type="text"
                  value={novoAluno.cpf || ''}
                  onChange={e => setNovoAluno({ ...novoAluno, cpf: e.target.value })}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Data de Nascimento (opcional)</label>
                <input
                  type="date"
                  value={novoAluno.data_nascimento || ''}
                  onChange={e => setNovoAluno({ ...novoAluno, data_nascimento: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
                />
              </div>
              {isMulti && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Série do Aluno *</label>
                  <input
                    type="text"
                    value={novoAluno.serie_individual || ''}
                    onChange={e => setNovoAluno({ ...novoAluno, serie_individual: e.target.value })}
                    placeholder="Ex: 1º Ano, 2º Ano"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-gray-900 dark:text-white text-sm"
                  />
                </div>
              )}
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 pb-2">
                  <input
                    type="checkbox"
                    checked={novoAluno.pcd || false}
                    onChange={e => setNovoAluno({ ...novoAluno, pcd: e.target.checked })}
                    className="rounded"
                  />
                  <Accessibility className="w-4 h-4" />
                  PCD
                </label>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setMostrarFormNovo(false)}
                className="px-3 py-1.5 text-sm border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700"
              >
                Cancelar
              </button>
              <button
                onClick={adicionarNovo}
                disabled={!novoAluno.nome.trim()}
                className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Adicionar à Lista
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Lista de alunos selecionados */}
      {alunosSelecionados.length > 0 && (
        <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            Alunos para Matrícula ({alunosSelecionados.length})
            {isMulti && <span className="text-xs font-normal text-amber-600 dark:text-amber-400 ml-2">— Informe a série de cada aluno</span>}
          </h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {alunosSelecionados.map((aluno, index) => (
              <div key={index} className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-slate-700/50 rounded-lg">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-gray-900 dark:text-white truncate flex items-center gap-2">
                    {aluno.nome}
                    {aluno.existente ? (
                      <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">Existente</span>
                    ) : (
                      <span className="text-[10px] px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">Novo</span>
                    )}
                    {aluno.pcd && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded flex items-center gap-0.5">
                        <Accessibility className="w-3 h-3" /> PCD
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {aluno.cpf && <span className="text-xs text-gray-500 dark:text-gray-400">CPF: {aluno.cpf}</span>}
                    {isMulti && (
                      <input
                        type="text"
                        value={aluno.serie_individual || ''}
                        onChange={e => {
                          const novos = [...alunosSelecionados]
                          novos[index] = { ...novos[index], serie_individual: e.target.value }
                          onAlunosChange(novos)
                        }}
                        placeholder="Série do aluno..."
                        className="px-2 py-0.5 text-xs border border-amber-300 dark:border-amber-700 rounded bg-amber-50 dark:bg-amber-900/20 text-gray-800 dark:text-gray-200 w-28"
                      />
                    )}
                  </div>
                </div>
                <button
                  onClick={() => removerAluno(index)}
                  className="flex-shrink-0 ml-2 p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between pt-4">
        <button
          onClick={onVoltar}
          className="px-6 py-2.5 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-700 font-medium transition-colors"
        >
          Voltar
        </button>
        <button
          onClick={onMatricular}
          disabled={alunosSelecionados.length === 0 || matriculando}
          className="px-6 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors flex items-center gap-2"
        >
          {matriculando ? (
            <><ButtonSpinner /> Matriculando...</>
          ) : (
            <>Matricular {alunosSelecionados.length} Aluno(s)</>
          )}
        </button>
      </div>
    </div>
  )
}
