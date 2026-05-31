'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  Users, CheckCircle, XCircle, Clock, AlertTriangle, Mail, Phone, Search,
  Filter, Loader2,
} from 'lucide-react'
import ProtectedRoute from '@/components/protected-route'
import { ConfirmModal } from '@/components/ui/confirm-modal'

interface Solicitacao {
  id: string
  status: 'pendente' | 'aprovado' | 'rejeitado'
  origem: string
  tipo_vinculo: string
  solicitado_em: string
  aprovado_em: string | null
  motivo_rejeicao: string | null
  usuario_id: string
  responsavel_nome: string
  responsavel_email: string
  responsavel_cpf: string | null
  responsavel_telefone: string | null
  aluno_id: string
  aluno_nome: string
  aluno_codigo: string | null
  escola_id: string
  escola_nome: string
  polo_id: string | null
  polo_nome: string | null
}

type Filtro = 'pendente' | 'aprovado' | 'rejeitado' | 'todos'

function PainelResponsaveis() {
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [busca, setBusca] = useState('')
  const [filtro, setFiltro] = useState<Filtro>('pendente')
  const [processando, setProcessando] = useState(false)

  const [confirmar, setConfirmar] = useState<null | { sol: Solicitacao; acao: 'aprovar' | 'rejeitar' }>(null)
  const [motivoRejeicao, setMotivoRejeicao] = useState('')

  const fetchSolicitacoes = async () => {
    setCarregando(true)
    setErro('')
    try {
      const res = await fetch(`/api/admin/responsaveis/solicitacoes?status=${filtro}`)
      if (!res.ok) throw new Error('Erro ao carregar')
      const data = await res.json()
      setSolicitacoes(data.solicitacoes || [])
    } catch (err: any) {
      setErro(err.message)
    } finally {
      setCarregando(false)
    }
  }
  useEffect(() => { fetchSolicitacoes() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [filtro])

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase()
    if (!q) return solicitacoes
    return solicitacoes.filter(s =>
      (s.responsavel_nome + ' ' + s.aluno_nome + ' ' + s.escola_nome + ' ' + (s.responsavel_email || '')).toLowerCase().includes(q)
    )
  }, [solicitacoes, busca])

  const confirmarAcao = async () => {
    if (!confirmar) return
    setProcessando(true)
    setErro(''); setMensagem('')
    try {
      const res = await fetch('/api/admin/responsaveis/solicitacoes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          solicitacao_id: confirmar.sol.id,
          acao: confirmar.acao,
          motivo_rejeicao: confirmar.acao === 'rejeitar' ? (motivoRejeicao.trim() || null) : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.mensagem || 'Erro')
      setMensagem(data.mensagem)
      setConfirmar(null)
      setMotivoRejeicao('')
      fetchSolicitacoes()
    } catch (err: any) {
      setErro(err.message)
    } finally {
      setProcessando(false)
    }
  }

  const formatarCpf = (cpf: string | null) => {
    if (!cpf) return '—'
    const c = cpf.replace(/\D/g, '')
    if (c.length !== 11) return cpf
    return `${c.slice(0,3)}.***.${c.slice(6,9)}-**`
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="h-6 w-6 text-indigo-600" /> Responsáveis — Vínculos com Alunos
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
            Aprove ou rejeite solicitações de vínculo feitas por pais/responsáveis.
          </p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome do responsável, aluno, e-mail ou escola..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
          />
        </div>
        <div className="inline-flex items-center gap-1 bg-gray-100 dark:bg-slate-800 rounded-lg p-1">
          {(['pendente', 'aprovado', 'rejeitado', 'todos'] as Filtro[]).map(f => (
            <button
              key={f}
              onClick={() => setFiltro(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded ${
                filtro === f ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-sm' : 'text-gray-600 dark:text-gray-300'
              }`}
            >
              {f === 'todos' ? 'Todos' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {mensagem && (
        <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-sm flex items-center gap-2">
          <CheckCircle className="h-4 w-4" /> {mensagem}
        </div>
      )}
      {erro && (
        <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" /> {erro}
        </div>
      )}

      {carregando ? (
        <div className="space-y-2">
          {[1,2,3].map(i => <div key={i} className="h-28 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />)}
        </div>
      ) : filtradas.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Users className="mx-auto h-12 w-12 text-gray-300 mb-2" />
          <p>Nenhuma solicitação {filtro === 'todos' ? '' : `(${filtro})`} encontrada.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtradas.map(s => (
            <article key={s.id} className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-gray-900 dark:text-white">{s.responsavel_nome}</h3>
                    <span className="px-2 py-0.5 text-xs rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300">
                      {s.tipo_vinculo}
                    </span>
                    {s.status === 'pendente' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                        <Clock className="h-3 w-3" /> Pendente
                      </span>
                    )}
                    {s.status === 'aprovado' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300">
                        <CheckCircle className="h-3 w-3" /> Aprovado
                      </span>
                    )}
                    {s.status === 'rejeitado' && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                        <XCircle className="h-3 w-3" /> Rejeitado
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-300 mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
                    <span className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-gray-400" /> {s.responsavel_email}</span>
                    {s.responsavel_telefone && <span className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5 text-gray-400" /> {s.responsavel_telefone}</span>}
                    <span className="text-xs text-gray-500">CPF: {formatarCpf(s.responsavel_cpf)}</span>
                    <span className="text-xs text-gray-500">Solicitado: {new Date(s.solicitado_em).toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div className="mt-3 p-2.5 bg-gray-50 dark:bg-slate-700/30 rounded-lg">
                    <p className="text-sm text-gray-900 dark:text-white">
                      <span className="font-medium">Aluno(a):</span> {s.aluno_nome}
                      {s.aluno_codigo && <span className="text-gray-500 dark:text-gray-400 ml-2">({s.aluno_codigo})</span>}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {s.escola_nome}{s.polo_nome && ` • ${s.polo_nome}`}
                    </p>
                  </div>
                  {s.status === 'rejeitado' && s.motivo_rejeicao && (
                    <p className="mt-2 text-xs text-red-600 dark:text-red-400">
                      <span className="font-medium">Motivo:</span> {s.motivo_rejeicao}
                    </p>
                  )}
                </div>

                {s.status === 'pendente' && (
                  <div className="flex gap-2 shrink-0">
                    <button
                      onClick={() => { setConfirmar({ sol: s, acao: 'aprovar' }); setMotivoRejeicao('') }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                    >
                      <CheckCircle className="h-4 w-4" /> Aprovar
                    </button>
                    <button
                      onClick={() => { setConfirmar({ sol: s, acao: 'rejeitar' }); setMotivoRejeicao('') }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 border border-red-600 text-red-700 dark:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-sm font-medium"
                    >
                      <XCircle className="h-4 w-4" /> Rejeitar
                    </button>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <ConfirmModal
        aberto={confirmar !== null}
        titulo={confirmar?.acao === 'aprovar' ? 'Aprovar vínculo' : 'Rejeitar solicitação'}
        mensagem={confirmar
          ? confirmar.acao === 'aprovar'
            ? `Confirmar que ${confirmar.sol.responsavel_nome} é responsável por ${confirmar.sol.aluno_nome}? Após aprovação, terá acesso ao boletim, frequência e comunicados do aluno.`
            : `Rejeitar a solicitação de ${confirmar.sol.responsavel_nome} para vincular ao aluno ${confirmar.sol.aluno_nome}?`
          : ''
        }
        variant={confirmar?.acao === 'aprovar' ? 'info' : 'danger'}
        textoConfirmar={confirmar?.acao === 'aprovar' ? 'Aprovar' : 'Rejeitar'}
        exigirJustificativa={confirmar?.acao === 'rejeitar'}
        placeholderJustificativa="Motivo da rejeição (visível para o responsável)"
        minCaracteresJustificativa={5}
        onConfirmar={(justificativa) => {
          if (confirmar?.acao === 'rejeitar') setMotivoRejeicao(justificativa || '')
          confirmarAcao()
        }}
        onFechar={() => { if (!processando) setConfirmar(null) }}
        processando={processando}
      />
    </div>
  )
}

export default function ResponsaveisPage() {
  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'escola', 'polo']}>
      <PainelResponsaveis />
    </ProtectedRoute>
  )
}
