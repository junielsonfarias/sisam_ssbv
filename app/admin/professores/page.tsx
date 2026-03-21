'use client'

import { useState, useEffect } from 'react'
import { UserPlus, Search, Eye, EyeOff, GraduationCap, CheckCircle, XCircle, Clock, Trash2 } from 'lucide-react'
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

function GerenciarProfessores() {
  const [professores, setProfessores] = useState<Professor[]>([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'ativos' | 'pendentes'>('todos')
  const [criando, setCriando] = useState(false)
  const [novoNome, setNovoNome] = useState('')
  const [novoEmail, setNovoEmail] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [erro, setErro] = useState('')

  const fetchProfessores = async () => {
    try {
      const params = filtroStatus === 'ativos' ? '?ativo=true' : filtroStatus === 'pendentes' ? '?ativo=false' : ''
      const res = await fetch('/api/admin/professores' + params)
      if (!res.ok) throw new Error('Erro ao carregar')
      const data = await res.json()
      setProfessores(data.professores)
    } catch (err: any) {
      setErro(err.message)
    } finally {
      setCarregando(false)
    }
  }

  useEffect(() => { fetchProfessores() }, [filtroStatus])

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
      setMensagem('Professor criado com sucesso (já ativo)')
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
    if (!confirm(`Rejeitar e excluir o cadastro de "${nome}"? Esta ação não pode ser desfeita.`)) return
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

  const filtrados = professores.filter(p =>
    p.nome.toLowerCase().includes(busca.toLowerCase()) ||
    p.email.toLowerCase().includes(busca.toLowerCase())
  )

  const pendentes = professores.filter(p => !p.ativo).length

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gerenciar Professores</h1>
          {pendentes > 0 && (
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
              {pendentes} cadastro(s) pendente(s) de ativação
            </p>
          )}
        </div>
        <button
          onClick={() => setCriando(!criando)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm"
        >
          <UserPlus className="h-4 w-4" />
          Novo Professor
        </button>
      </div>

      {/* Filtro de status */}
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

      {/* Formulário de criação */}
      {criando && (
        <form onSubmit={criarProfessor} className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 space-y-3">
          <h2 className="font-semibold text-gray-900 dark:text-white">Novo Professor (criado pelo admin — já ativo)</h2>
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
        <input type="text" placeholder="Buscar professor..." value={busca} onChange={e => setBusca(e.target.value)}
          className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm" />
      </div>

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
            <div key={prof.id} className={`p-4 ${!prof.ativo ? 'bg-amber-50/50 dark:bg-amber-900/10' : ''}`}>
              <div className="flex items-center justify-between">
                <div className="min-w-0">
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
                  <div className="flex flex-wrap gap-2 mt-1">
                    {prof.cpf && <span className="text-xs text-gray-400">CPF: {prof.cpf}</span>}
                    {prof.telefone && <span className="text-xs text-gray-400">Tel: {prof.telefone}</span>}
                    {prof.escolas && prof.escolas.length > 0 && (
                      <span className="text-xs text-gray-400">{prof.escolas.join(', ')}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 text-xs bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded-full">
                    {prof.total_turmas} turma(s)
                  </span>
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
