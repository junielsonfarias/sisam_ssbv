'use client'

import { useEffect, useState, useCallback } from 'react'
import { Search, UserPlus, GraduationCap, User, School, MapPin, AlertCircle, CheckCircle, X } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { EscolaSimples } from './types'

interface AlunoResultado {
  id: string
  codigo: string | null
  nome: string
  serie: string | null
  ano_letivo: string | null
  escola_id: string
  turma_id: string | null
  cpf: string | null
  data_nascimento: string | null
  pcd: boolean
  situacao?: string | null
  escola_nome: string
  turma_codigo: string | null
  turma_nome: string | null
}

interface TurmaDisponivel {
  id: string
  codigo: string
  nome: string | null
  serie: string | null
  ano_letivo: string
  capacidade_maxima: number
  total_alunos: number
}

export function AbaPesquisarAluno({
  podeEditar,
  tipoUsuario,
  escolaIdUsuario,
  toast,
}: {
  podeEditar: boolean
  tipoUsuario: string
  escolaIdUsuario: string
  toast: any
}) {
  // Estados de busca
  const [busca, setBusca] = useState('')
  const buscaDebounced = useDebounce(busca, 400)
  const [resultados, setResultados] = useState<AlunoResultado[]>([])
  const [buscando, setBuscando] = useState(false)
  const [buscaRealizada, setBuscaRealizada] = useState(false)

  // Estados de matrícula
  const [alunoSelecionado, setAlunoSelecionado] = useState<AlunoResultado | null>(null)
  const [mostrarMatricula, setMostrarMatricula] = useState(false)
  const [escolas, setEscolas] = useState<EscolaSimples[]>([])
  const [turmas, setTurmas] = useState<TurmaDisponivel[]>([])
  const [matriculaForm, setMatriculaForm] = useState({
    escola_id: '',
    turma_id: '',
    serie: '',
    ano_letivo: new Date().getFullYear().toString(),
  })
  const [matriculando, setMatriculando] = useState(false)
  const [carregandoTurmas, setCarregandoTurmas] = useState(false)

  // Estados de novo aluno
  const [mostrarNovoAluno, setMostrarNovoAluno] = useState(false)
  const [novoAlunoForm, setNovoAlunoForm] = useState({
    nome: '',
    codigo: '',
    cpf: '',
    data_nascimento: '',
    pcd: false,
  })
  const [criandoAluno, setCriandoAluno] = useState(false)

  // Buscar alunos com debounce
  useEffect(() => {
    if (!buscaDebounced || buscaDebounced.trim().length < 2) {
      setResultados([])
      setBuscaRealizada(false)
      return
    }

    const buscarAlunos = async () => {
      setBuscando(true)
      try {
        const res = await fetch(`/api/admin/matriculas/alunos/buscar?busca=${encodeURIComponent(buscaDebounced.trim())}`)
        if (res.ok) {
          const data = await res.json()
          setResultados(Array.isArray(data) ? data : [])
        } else {
          setResultados([])
        }
      } catch {
        setResultados([])
      } finally {
        setBuscando(false)
        setBuscaRealizada(true)
      }
    }

    buscarAlunos()
  }, [buscaDebounced])

  // Carregar escolas ao abrir matrícula
  useEffect(() => {
    if (tipoUsuario === 'escola' && escolaIdUsuario) {
      setMatriculaForm(prev => ({ ...prev, escola_id: escolaIdUsuario }))
      carregarTurmas(escolaIdUsuario)
    } else if (mostrarMatricula && escolas.length === 0) {
      fetch('/api/admin/escolas')
        .then(r => r.ok ? r.json() : [])
        .then(data => setEscolas(Array.isArray(data) ? data : []))
        .catch(() => {})
    }
  }, [mostrarMatricula, tipoUsuario, escolaIdUsuario])

  const carregarTurmas = async (escolaId: string) => {
    if (!escolaId) { setTurmas([]); return }
    setCarregandoTurmas(true)
    try {
      const anoLetivo = matriculaForm.ano_letivo || new Date().getFullYear().toString()
      const res = await fetch(`/api/admin/matriculas/turmas?escola_id=${escolaId}&ano_letivo=${anoLetivo}`)
      if (res.ok) {
        const data = await res.json()
        setTurmas(Array.isArray(data) ? data : [])
      }
    } catch {
      setTurmas([])
    } finally {
      setCarregandoTurmas(false)
    }
  }

  const selecionarAluno = (aluno: AlunoResultado) => {
    setAlunoSelecionado(aluno)
    setMostrarMatricula(false)
    setMostrarNovoAluno(false)
  }

  const iniciarMatricula = () => {
    if (!alunoSelecionado) return
    setMostrarMatricula(true)
    setMostrarNovoAluno(false)
    // Pre-preencher escola se aluno já tem uma
    if (alunoSelecionado.escola_id) {
      setMatriculaForm(prev => ({ ...prev, escola_id: alunoSelecionado!.escola_id }))
      carregarTurmas(alunoSelecionado.escola_id)
    }
  }

  const confirmarMatricula = async () => {
    if (!alunoSelecionado || !matriculaForm.escola_id || !matriculaForm.turma_id) {
      toast.warning('Selecione escola e turma para matricular')
      return
    }

    const turmaEscolhida = turmas.find(t => t.id === matriculaForm.turma_id)
    if (!turmaEscolhida) return

    setMatriculando(true)
    try {
      const res = await fetch('/api/admin/matriculas/alunos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          escola_id: matriculaForm.escola_id,
          turma_id: matriculaForm.turma_id,
          serie: turmaEscolhida.serie || matriculaForm.serie,
          ano_letivo: matriculaForm.ano_letivo,
          alunos: [{
            id: alunoSelecionado.id,
            nome: alunoSelecionado.nome,
            codigo: alunoSelecionado.codigo,
            cpf: alunoSelecionado.cpf,
            data_nascimento: alunoSelecionado.data_nascimento,
            pcd: alunoSelecionado.pcd,
          }],
        }),
      })

      const data = await res.json()
      if (res.ok) {
        toast.success(`${alunoSelecionado.nome} matriculado com sucesso na turma ${turmaEscolhida.codigo}!`)
        setMostrarMatricula(false)
        setAlunoSelecionado(null)
        // Refazer busca para atualizar dados
        if (buscaDebounced.trim().length >= 2) {
          setBusca(prev => prev + ' ')
          setTimeout(() => setBusca(prev => prev.trim()), 100)
        }
      } else {
        toast.error(data.mensagem || 'Erro ao matricular aluno')
      }
    } catch {
      toast.error('Erro ao matricular aluno')
    } finally {
      setMatriculando(false)
    }
  }

  const criarNovoAluno = async () => {
    if (!novoAlunoForm.nome.trim()) {
      toast.warning('Nome é obrigatório')
      return
    }

    if (!matriculaForm.escola_id) {
      toast.warning('Selecione uma escola')
      return
    }

    setCriandoAluno(true)
    try {
      const res = await fetch('/api/admin/alunos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: novoAlunoForm.nome.trim(),
          codigo: novoAlunoForm.codigo || null,
          cpf: novoAlunoForm.cpf || null,
          data_nascimento: novoAlunoForm.data_nascimento || null,
          pcd: novoAlunoForm.pcd,
          escola_id: matriculaForm.escola_id,
          turma_id: matriculaForm.turma_id || null,
          serie: turmas.find(t => t.id === matriculaForm.turma_id)?.serie || null,
          ano_letivo: matriculaForm.ano_letivo,
        }),
      })

      const data = await res.json()
      if (res.ok) {
        toast.success(`Aluno ${novoAlunoForm.nome} cadastrado${matriculaForm.turma_id ? ' e matriculado' : ''} com sucesso!`)
        setMostrarNovoAluno(false)
        setNovoAlunoForm({ nome: '', codigo: '', cpf: '', data_nascimento: '', pcd: false })
        // Buscar o aluno recém-criado
        setBusca(novoAlunoForm.nome)
      } else {
        toast.error(data.mensagem || 'Erro ao cadastrar aluno')
      }
    } catch {
      toast.error('Erro ao cadastrar aluno')
    } finally {
      setCriandoAluno(false)
    }
  }

  const formatarCPF = (cpf: string | null) => {
    if (!cpf) return '—'
    return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.***.$3-**')
  }

  const formatarData = (data: string | null) => {
    if (!data) return '—'
    try {
      return new Date(data + 'T12:00:00').toLocaleDateString('pt-BR')
    } catch { return data }
  }

  return (
    <div className="space-y-6">
      {/* Header + Busca — oculta quando aluno está selecionado */}
      {!alunoSelecionado && (
        <div>
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-3">Pesquisar Aluno</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar por nome, código ou CPF..."
              className="w-full pl-10 pr-4 py-3 text-base border border-gray-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              autoFocus
            />
            {buscando && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <LoadingSpinner size="sm" />
              </div>
            )}
          </div>
          {busca.length > 0 && busca.length < 2 && (
            <p className="text-xs text-gray-400 mt-1">Digite pelo menos 2 caracteres para buscar</p>
          )}
        </div>
      )}

      {/* Resultados da busca — oculta quando aluno está selecionado */}
      {!alunoSelecionado && buscaRealizada && resultados.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {resultados.length} aluno{resultados.length > 1 ? 's' : ''} encontrado{resultados.length > 1 ? 's' : ''}
          </p>
          <div className="grid gap-2">
            {resultados.map(aluno => (
              <div
                key={aluno.id}
                onClick={() => selecionarAluno(aluno)}
                className="p-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-indigo-300 cursor-pointer transition-all hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold
                      ${aluno.situacao === 'transferido' ? 'bg-orange-500' : aluno.situacao === 'abandono' ? 'bg-red-500' : 'bg-indigo-500'}`}>
                      {aluno.nome.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{aluno.nome}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        {aluno.codigo && <span>Cód: {aluno.codigo}</span>}
                        {aluno.cpf && <span>CPF: {formatarCPF(aluno.cpf)}</span>}
                        {aluno.pcd && <span className="text-blue-600 font-medium">PCD</span>}
                      </div>
                    </div>
                  </div>
                  <div className="text-right text-xs text-gray-500 dark:text-gray-400">
                    <p className="flex items-center gap-1"><School className="w-3 h-3" />{aluno.escola_nome}</p>
                    {aluno.turma_codigo && <p>Turma: {aluno.turma_codigo}</p>}
                    <p>{aluno.serie || '—'} | {aluno.ano_letivo || '—'}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Nenhum resultado — oculta quando aluno selecionado */}
      {!alunoSelecionado && buscaRealizada && resultados.length === 0 && busca.length >= 2 && !buscando && (
        <div className="text-center py-8">
          <User className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
          <p className="text-gray-500 dark:text-gray-400">Nenhum aluno encontrado para &quot;{busca}&quot;</p>
          {podeEditar && (
            <button
              onClick={() => {
                setMostrarNovoAluno(true)
                setMostrarMatricula(false)
                setAlunoSelecionado(null)
                setNovoAlunoForm(prev => ({ ...prev, nome: busca.trim() }))
              }}
              className="mt-3 inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-medium text-sm"
            >
              <UserPlus className="w-4 h-4" /> Cadastrar novo aluno
            </button>
          )}
        </div>
      )}

      {/* Card do aluno selecionado — visão focada */}
      {alunoSelecionado && (
        <div className="space-y-4">
          {/* Botão voltar */}
          <button
            onClick={() => { setAlunoSelecionado(null); setMostrarMatricula(false) }}
            className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-medium"
          >
            <Search className="w-4 h-4" /> ← Voltar à pesquisa
          </button>

          <div className="bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <User className="w-5 h-5 text-indigo-600" /> {alunoSelecionado.nome}
              </h3>
            </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">Código</p>
              <p className="font-medium text-gray-900 dark:text-white">{alunoSelecionado.codigo || '—'}</p>
            </div>
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">CPF</p>
              <p className="font-medium text-gray-900 dark:text-white">{formatarCPF(alunoSelecionado.cpf)}</p>
            </div>
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">Nascimento</p>
              <p className="font-medium text-gray-900 dark:text-white">{formatarData(alunoSelecionado.data_nascimento)}</p>
            </div>
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">Escola Atual</p>
              <p className="font-medium text-gray-900 dark:text-white truncate">{alunoSelecionado.escola_nome}</p>
            </div>
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">Série</p>
              <p className="font-medium text-gray-900 dark:text-white">{alunoSelecionado.serie || '—'}</p>
            </div>
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">Turma</p>
              <p className="font-medium text-gray-900 dark:text-white">{alunoSelecionado.turma_codigo || 'Sem turma'}</p>
            </div>
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">Ano Letivo</p>
              <p className="font-medium text-gray-900 dark:text-white">{alunoSelecionado.ano_letivo || '—'}</p>
            </div>
            <div className="bg-gray-50 dark:bg-slate-700/50 rounded-lg p-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">PCD</p>
              <p className="font-medium text-gray-900 dark:text-white">{alunoSelecionado.pcd ? 'Sim' : 'Não'}</p>
            </div>
          </div>

          {podeEditar && !mostrarMatricula && (
            <div className="flex gap-2">
              <button
                onClick={iniciarMatricula}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 text-sm transition-colors"
              >
                <GraduationCap className="w-4 h-4" /> Matricular em Turma
              </button>
            </div>
          )}
        </div>
        </div>
      )}

      {/* Form de matrícula */}
      {mostrarMatricula && alunoSelecionado && (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-5 space-y-4">
          <h3 className="font-semibold text-indigo-900 dark:text-indigo-300 flex items-center gap-2">
            <GraduationCap className="w-5 h-5" /> Matricular {alunoSelecionado.nome}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {tipoUsuario !== 'escola' && (
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Escola *</label>
                <select
                  value={matriculaForm.escola_id}
                  onChange={e => {
                    setMatriculaForm(prev => ({ ...prev, escola_id: e.target.value, turma_id: '' }))
                    carregarTurmas(e.target.value)
                  }}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                >
                  <option value="">Selecione a escola...</option>
                  {escolas.map(e => (
                    <option key={e.id} value={e.id}>{e.nome}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Turma *</label>
              {carregandoTurmas ? (
                <div className="py-2"><LoadingSpinner size="sm" /></div>
              ) : (
                <select
                  value={matriculaForm.turma_id}
                  onChange={e => setMatriculaForm(prev => ({ ...prev, turma_id: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                  disabled={!matriculaForm.escola_id}
                >
                  <option value="">Selecione a turma...</option>
                  {turmas.map(t => {
                    const vagas = (t.capacidade_maxima || 35) - (t.total_alunos || 0)
                    return (
                      <option key={t.id} value={t.id} disabled={vagas <= 0}>
                        {t.codigo} {t.nome ? `- ${t.nome}` : ''} | {t.serie} | {vagas > 0 ? `${vagas} vagas` : 'LOTADA'}
                      </option>
                    )
                  })}
                </select>
              )}
            </div>

            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Ano Letivo</label>
              <input
                type="text"
                value={matriculaForm.ano_letivo}
                onChange={e => setMatriculaForm(prev => ({ ...prev, ano_letivo: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
              />
            </div>
          </div>

          {/* Info da turma selecionada */}
          {matriculaForm.turma_id && (() => {
            const turma = turmas.find(t => t.id === matriculaForm.turma_id)
            if (!turma) return null
            const vagas = (turma.capacidade_maxima || 35) - (turma.total_alunos || 0)
            return (
              <div className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg ${vagas > 5 ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400' : vagas > 0 ? 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400' : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'}`}>
                {vagas > 0 ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                {turma.total_alunos}/{turma.capacidade_maxima} alunos — {vagas > 0 ? `${vagas} vaga${vagas > 1 ? 's' : ''} disponível${vagas > 1 ? 'eis' : ''}` : 'Sem vagas'}
              </div>
            )
          })()}

          <div className="flex gap-2">
            <button
              onClick={confirmarMatricula}
              disabled={matriculando || !matriculaForm.turma_id}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-colors"
            >
              {matriculando ? 'Matriculando...' : 'Confirmar Matrícula'}
            </button>
            <button
              onClick={() => setMostrarMatricula(false)}
              className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Form criar novo aluno */}
      {mostrarNovoAluno && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-emerald-900 dark:text-emerald-300 flex items-center gap-2">
              <UserPlus className="w-5 h-5" /> Cadastrar Novo Aluno
            </h3>
            <button onClick={() => setMostrarNovoAluno(false)} className="text-gray-400 hover:text-gray-600">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Nome *</label>
              <input
                type="text"
                value={novoAlunoForm.nome}
                onChange={e => setNovoAlunoForm(prev => ({ ...prev, nome: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                placeholder="Nome completo do aluno"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">CPF</label>
              <input
                type="text"
                value={novoAlunoForm.cpf}
                onChange={e => setNovoAlunoForm(prev => ({ ...prev, cpf: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                placeholder="000.000.000-00"
                maxLength={14}
              />
            </div>

            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Data de Nascimento</label>
              <input
                type="date"
                value={novoAlunoForm.data_nascimento}
                onChange={e => setNovoAlunoForm(prev => ({ ...prev, data_nascimento: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
              />
            </div>

            {tipoUsuario !== 'escola' && (
              <div>
                <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Escola *</label>
                <select
                  value={matriculaForm.escola_id}
                  onChange={e => {
                    setMatriculaForm(prev => ({ ...prev, escola_id: e.target.value, turma_id: '' }))
                    carregarTurmas(e.target.value)
                  }}
                  className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                >
                  <option value="">Selecione...</option>
                  {escolas.map(e => (
                    <option key={e.id} value={e.id}>{e.nome}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">Turma (opcional)</label>
              <select
                value={matriculaForm.turma_id}
                onChange={e => setMatriculaForm(prev => ({ ...prev, turma_id: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
                disabled={!matriculaForm.escola_id || carregandoTurmas}
              >
                <option value="">Sem turma (cadastrar apenas)</option>
                {turmas.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.codigo} {t.nome ? `- ${t.nome}` : ''} | {t.serie}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 sm:col-span-2">
              <input
                type="checkbox"
                id="novo-pcd"
                checked={novoAlunoForm.pcd}
                onChange={e => setNovoAlunoForm(prev => ({ ...prev, pcd: e.target.checked }))}
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded"
              />
              <label htmlFor="novo-pcd" className="text-sm text-gray-700 dark:text-gray-300">PCD (Pessoa com Deficiência)</label>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={criarNovoAluno}
              disabled={criandoAluno || !novoAlunoForm.nome.trim() || !matriculaForm.escola_id}
              className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm transition-colors"
            >
              {criandoAluno ? 'Cadastrando...' : matriculaForm.turma_id ? 'Cadastrar e Matricular' : 'Cadastrar Aluno'}
            </button>
            <button
              onClick={() => setMostrarNovoAluno(false)}
              className="px-4 py-2 border border-gray-300 dark:border-slate-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Botão cadastrar novo — oculta quando aluno selecionado */}
      {podeEditar && !mostrarNovoAluno && !alunoSelecionado && buscaRealizada && resultados.length > 0 && (
        <div className="text-center">
          <button
            onClick={() => {
              setMostrarNovoAluno(true)
              setMostrarMatricula(false)
              setAlunoSelecionado(null)
              setNovoAlunoForm({ nome: '', codigo: '', cpf: '', data_nascimento: '', pcd: false })
            }}
            className="inline-flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 font-medium text-sm"
          >
            <UserPlus className="w-4 h-4" /> Cadastrar novo aluno
          </button>
        </div>
      )}
    </div>
  )
}
