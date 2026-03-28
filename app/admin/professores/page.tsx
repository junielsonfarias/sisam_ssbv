'use client'

import { useState, useEffect } from 'react'
import {
  UserPlus, Search, Eye, EyeOff, GraduationCap, CheckCircle, XCircle,
  Clock, Trash2, ChevronDown, ChevronUp, School, BookOpen, Users,
  Filter
} from 'lucide-react'
import ProtectedRoute from '@/components/protected-route'

interface Professor {
  id: string
  nome: string
  email: string
  ativo: boolean
  criado_em: string
  cpf: string | null
  telefone: string | null
  total_turmas: string
  escolas: string[] | null
}

interface Vinculo {
  id: string
  tipo_vinculo: string
  ano_letivo: string
  professor_nome: string
  turma_id: string
  turma_nome: string
  serie: string
  turno: string
  escola_nome: string
  disciplina_nome: string | null
}

interface EscolaOption {
  id: string
  nome: string
}

function GerenciarProfessores() {
  const [professores, setProfessores] = useState<Professor[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'ativos' | 'pendentes'>('todos')
  const [filtroEscola, setFiltroEscola] = useState('')
  const [escolas, setEscolas] = useState<EscolaOption[]>([])
  const [criando, setCriando] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [novoEmail, setNovoEmail] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')
  const [expandido, setExpandido] = useState<string | null>(null)
  const [vinculos, setVinculos] = useState<Record<string, Vinculo[]>>({})
  const [carregandoVinculos, setCarregandoVinculos] = useState<string | null>(null)

  // Carregar escolas para o filtro
  useEffect(() => {
    fetch('/api/admin/escolas')
      .then(r => r.json())
      .then(data => {
        const lista = (data.escolas || data || [])
          .map((e: any) => ({ id: e.id, nome: e.nome }))
          .sort((a: EscolaOption, b: EscolaOption) => a.nome.localeCompare(b.nome))
        setEscolas(lista)
      })
      .catch(() => {})
  }, [])

  const fetchProfessores = async () => {
    try {
      const params = new URLSearchParams()
      if (filtroStatus === 'ativos') params.set('ativo', 'true')
      if (filtroStatus === 'pendentes') params.set('ativo', 'false')
      if (filtroEscola) params.set('escola_id', filtroEscola)
      const query = params.toString() ? `?${params.toString()}` : ''
      const res = await fetch('/api/admin/professores' + query)
      if (!res.ok) throw new Error('Erro ao carregar')
      const data = await res.json()
      setProfessores(data.professores)
    } catch (err: any) {
      setErro(err.message)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { fetchProfessores() }, [filtroStatus, filtroEscola])

  const criarProfessor = async (e: React.FormEvent) => {
    e.preventDefault()
    setMensagem('')
    setErro('')
    try {
      const res = await fetch('/api/admin/professores', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: novoNome, email: novoEmail, senha: novaSenha }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.mensagem)
      setMensagem('Professor criado com sucesso (ja ativo)')
      setNovoNome(''); setNovoEmail(''); setNovaSenha('')
      setCriando(false)
      fetchProfessores()
    } catch (err: any) {
      setErro(err.message)
    }
  }

  const ativarProfessor = async (id: string, ativo: boolean) => {
    setMensagem('')
    setErro('')
    try {
      const res = await fetch('/api/admin/professores', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ professor_id: id, ativo }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.mensagem)
      setMensagem(data.mensagem)
      fetchProfessores()
    } catch (err: any) {
      setErro(err.message)
    }
  }

  const rejeitarCadastro = async (id: string, nome: string) => {
    if (!confirm(`Rejeitar e excluir o cadastro de "${nome}"? Esta acao nao pode ser desfeita.`)) return
    setMensagem('')
    setErro('')
    try {
      const res = await fetch('/api/admin/professores', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ professor_id: id }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.mensagem)
      setMensagem(data.mensagem)
      fetchProfessores()
    } catch (err: any) {
      setErro(err.message)
    }
  }

  const toggleExpandir = async (professorId: string) => {
    if (expandido === professorId) {
      setExpandido(null)
      return
    }
    setExpandido(professorId)
    if (!vinculos[professorId]) {
      setCarregandoVinculos(professorId)
      try {
        const res = await fetch(`/api/admin/professor-turmas?professor_id=${professorId}`)
        if (res.ok) {
          const data = await res.json()
          setVinculos(prev => ({ ...prev, [professorId]: data.vinculos || [] }))
        }
      } catch { /* ignore */ }
      finally { setCarregandoVinculos(null) }
    }
  }

  const filtrados = professores.filter(p =>
    p.nome.toLowerCase().includes(busca.toLowerCase()) ||
    p.email.toLowerCase().includes(busca.toLowerCase())
  )

  const pendentes = professores.filter(p => !p.ativo).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-700 to-teal-700 rounded-2xl px-6 py-5 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <GraduationCap className="w-6 h-6" /> Gerenciar Professores
            </h1>
            {pendentes > 0 && (
              <p className="text-emerald-200 text-sm mt-1">
                {pendentes} cadastro(s) pendente(s) de ativacao
              </p>
            )}
          </div>
          <button
            onClick={() => setCriando(!criando)}
            className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-medium backdrop-blur-sm transition"
          >
            <UserPlus className="h-4 w-4" />
            Novo Professor
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* Status */}
        <div className="flex gap-2">
          {(['todos', 'pendentes', 'ativos'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFiltroStatus(f)}
              className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                filtroStatus === f
                  ? f === 'pendentes' ? 'bg-amber-500 text-white' : 'bg-emerald-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
              }`}
            >
              {f === 'todos' ? 'Todos' : f === 'pendentes' ? `Pendentes (${pendentes})` : 'Ativos'}
            </button>
          ))}
        </div>

        {/* Filtro escola */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={filtroEscola}
            onChange={e => setFiltroEscola(e.target.value)}
            className="px-3 py-1.5 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-xs"
          >
            <option value="">Todas as escolas</option>
            {escolas.map(e => (
              <option key={e.id} value={e.id}>{e.nome}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Formulário de criação */}
      {criando && (
        <form onSubmit={criarProfessor} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 space-y-3">
          <h2 className="font-semibold text-gray-900 dark:text-white">Novo Professor (criado pelo admin — ja ativo)</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <input type="text" placeholder="Nome completo" value={novoNome} onChange={e => setNovoNome(e.target.value)} required
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
            <input type="email" placeholder="Email" value={novoEmail} onChange={e => setNovoEmail(e.target.value)} required
              className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm" />
            <div className="relative">
              <input type={mostrarSenha ? 'text' : 'password'} placeholder="Senha (min. 6)" value={novaSenha} onChange={e => setNovaSenha(e.target.value)} required minLength={6}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm pr-10" />
              <button type="button" onClick={() => setMostrarSenha(!mostrarSenha)} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400">
                {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm">Criar</button>
            <button type="button" onClick={() => setCriando(false)} className="px-4 py-2 text-gray-500 text-sm">Cancelar</button>
          </div>
        </form>
      )}

      {/* Mensagens */}
      {mensagem && <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-sm">{mensagem}</div>}
      {erro && <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">{erro}</div>}

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input type="text" placeholder="Buscar professor por nome ou email..." value={busca} onChange={e => setBusca(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm" />
      </div>

      {/* Contagem */}
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {filtrados.length} professor(es) encontrado(s)
      </p>

      {/* Lista */}
      {carregando ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-20 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse" />)}
        </div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <GraduationCap className="mx-auto h-12 w-12 text-gray-400 mb-2" />
          Nenhum professor encontrado
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-200 dark:divide-gray-700">
          {filtrados.map(prof => (
            <div key={prof.id} className={`${!prof.ativo ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}`}>
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 dark:text-white">{prof.nome}</p>
                      {!prof.ativo ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-amber-100 dark:bg-amber-900 text-amber-700 dark:text-amber-300 rounded-full">
                          <Clock className="h-3 w-3" /> Pendente
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 rounded-full">
                          <CheckCircle className="h-3 w-3" /> Ativo
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{prof.email}</p>
                    <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-400">
                      {prof.cpf && <span>CPF: {prof.cpf}</span>}
                      {prof.telefone && <span>Tel: {prof.telefone}</span>}
                      {prof.escolas && prof.escolas.length > 0 && (
                        <span className="flex items-center gap-1">
                          <School className="h-3 w-3" /> {prof.escolas.join(', ')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full">
                      {prof.total_turmas} turma(s)
                    </span>
                    {/* Expandir vínculos */}
                    <button
                      onClick={() => toggleExpandir(prof.id)}
                      className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                      title="Ver turmas vinculadas"
                    >
                      {expandido === prof.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                    {!prof.ativo ? (
                      <>
                        <button
                          onClick={() => ativarProfessor(prof.id, true)}
                          className="p-2 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30 rounded-lg"
                          title="Ativar professor"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => rejeitarCadastro(prof.id, prof.nome)}
                          className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"
                          title="Rejeitar cadastro"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => ativarProfessor(prof.id, false)}
                        className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                        title="Desativar professor"
                      >
                        <XCircle className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Vínculos expandidos */}
              {expandido === prof.id && (
                <div className="px-4 pb-4 border-t border-gray-100 dark:border-gray-700 pt-3">
                  {carregandoVinculos === prof.id ? (
                    <div className="text-sm text-gray-400 animate-pulse">Carregando vinculos...</div>
                  ) : (vinculos[prof.id] || []).length === 0 ? (
                    <div className="text-sm text-gray-400 flex items-center gap-2">
                      <Users className="h-4 w-4" /> Nenhuma turma vinculada
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                        Turmas Vinculadas ({vinculos[prof.id].length})
                      </p>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {vinculos[prof.id].map(v => (
                          <div key={v.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-gray-900 dark:text-white">{v.turma_nome}</span>
                              <span className="text-xs text-gray-400">{v.ano_letivo}</span>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              <span>{v.serie} - {v.turno}</span>
                              <span className="mx-1">|</span>
                              <span className="flex items-center gap-1 inline-flex">
                                <School className="h-3 w-3" /> {v.escola_nome}
                              </span>
                            </div>
                            {v.disciplina_nome ? (
                              <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full">
                                <BookOpen className="h-3 w-3 inline mr-1" />{v.disciplina_nome}
                              </span>
                            ) : v.tipo_vinculo === 'polivalente' ? (
                              <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300 rounded-full">
                                Polivalente
                              </span>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function ProfessoresPage() {
  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'escola']}>
      <GerenciarProfessores />
    </ProtectedRoute>
  )
}
