'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users, BookOpen, CalendarCheck, Bell, LogOut, GraduationCap, TrendingUp, AlertTriangle, MessageCircle, Calendar, ClipboardList, Plus, Clock, XCircle, CheckCircle } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ModalBase, ModalFooter } from '@/components/ui/modal-base'

interface Filho {
  id: string
  nome: string
  codigo: string
  serie: string
  ano_letivo: string
  situacao: string
  escola_nome: string
  turma_codigo: string | null
  turma_nome: string | null
  tipo_vinculo: string
}

interface Solicitacao {
  id: string
  aluno_id: string
  aluno_nome: string
  aluno_codigo: string | null
  escola_nome: string
  status: 'pendente' | 'aprovado' | 'rejeitado'
  motivo_rejeicao: string | null
  solicitado_em: string
}

export default function DashboardResponsavel() {
  const router = useRouter()
  const [filhos, setFilhos] = useState<Filho[]>([])
  const [solicitacoes, setSolicitacoes] = useState<Solicitacao[]>([])
  const [carregando, setCarregando] = useState(true)
  const [nomeUsuario, setNomeUsuario] = useState('')

  // Modal "adicionar filho"
  const [adicionando, setAdicionando] = useState(false)
  const [novoAluno, setNovoAluno] = useState('')
  const [novoTipoVinculo, setNovoTipoVinculo] = useState<'mae' | 'pai' | 'responsavel' | 'avos' | 'outro'>('responsavel')
  const [salvando, setSalvando] = useState(false)
  const [erroModal, setErroModal] = useState('')
  const [sucessoModal, setSucessoModal] = useState('')

  useEffect(() => {
    const user = localStorage.getItem('educatec_offline_user')
    if (user) {
      try { setNomeUsuario(JSON.parse(user).nome || '') } catch { /* */ }
    }
    carregarFilhos()
    carregarSolicitacoes()
  }, [])

  const carregarFilhos = async () => {
    try {
      const res = await fetch('/api/responsavel/filhos', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setFilhos(data.filhos || [])
      }
    } catch { /* offline */ } finally {
      setCarregando(false)
    }
  }

  const carregarSolicitacoes = async () => {
    try {
      const res = await fetch('/api/responsavel/solicitar-vinculo', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setSolicitacoes(data.solicitacoes || [])
      }
    } catch { /* */ }
  }

  const solicitarVinculo = async () => {
    if (!novoAluno.trim()) { setErroModal('Informe o CPF ou código do aluno'); return }
    setSalvando(true); setErroModal(''); setSucessoModal('')
    try {
      const res = await fetch('/api/responsavel/solicitar-vinculo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ cpf_ou_codigo: novoAluno.trim(), tipo_vinculo: novoTipoVinculo }),
      })
      const data = await res.json()
      if (!res.ok) { setErroModal(data.mensagem || 'Erro ao solicitar'); return }
      setSucessoModal(data.mensagem)
      setNovoAluno('')
      carregarSolicitacoes()
      setTimeout(() => { setAdicionando(false); setSucessoModal('') }, 2500)
    } catch {
      setErroModal('Erro de conexão')
    } finally {
      setSalvando(false)
    }
  }

  const pendentes = solicitacoes.filter(s => s.status === 'pendente')
  const rejeitadas = solicitacoes.filter(s => s.status === 'rejeitado')

  const sair = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    localStorage.removeItem('educatec_offline_user')
    router.push('/login')
  }

  if (carregando) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <LoadingSpinner centered />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white px-4 sm:px-6 py-5 sm:py-6">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 rounded-xl p-2.5">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-indigo-200 text-xs">Portal do Responsavel</p>
                <h1 className="text-lg sm:text-xl font-bold">
                  Ola, {nomeUsuario.split(' ')[0] || 'Responsavel'}!
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button onClick={() => router.push('/responsavel/calendario')}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 transition-colors" title="Calendario">
                <Calendar className="w-5 h-5" />
              </button>
              <button onClick={() => router.push('/responsavel/mensagens')}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 transition-colors" title="Mensagens">
                <MessageCircle className="w-5 h-5" />
              </button>
              <button onClick={sair}
                className="p-2 rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 transition-colors" title="Sair">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-5 space-y-4">
        {/* Banner: solicitacoes pendentes */}
        {pendentes.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-start gap-3">
            <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                {pendentes.length} solicitação(ões) aguardando aprovação da escola
              </p>
              <ul className="mt-1 text-xs text-amber-800 dark:text-amber-300 space-y-0.5">
                {pendentes.map(p => (
                  <li key={p.id}>• {p.aluno_nome} ({p.escola_nome})</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Banner: solicitacoes rejeitadas */}
        {rejeitadas.length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4 flex items-start gap-3">
            <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 text-sm text-red-800 dark:text-red-300">
              <p className="font-medium mb-1">{rejeitadas.length} solicitação(ões) rejeitada(s)</p>
              {rejeitadas.map(r => (
                <p key={r.id} className="text-xs">
                  {r.aluno_nome}{r.motivo_rejeicao ? ` — ${r.motivo_rejeicao}` : ''}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Filhos */}
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {filhos.length === 1 ? 'Seu filho(a)' : filhos.length === 0 ? 'Seus filhos' : `Seus filhos (${filhos.length})`}
          </h2>
          <button
            onClick={() => { setAdicionando(true); setErroModal(''); setSucessoModal('') }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            <Plus className="w-3.5 h-3.5" />
            Adicionar filho
          </button>
        </div>

        {filhos.length === 0 ? (
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-8 text-center border border-gray-200 dark:border-slate-700">
            <AlertTriangle className="w-12 h-12 mx-auto mb-3 text-amber-400" />
            <p className="text-gray-600 dark:text-gray-300 font-medium">
              {pendentes.length > 0 ? 'Aguardando aprovação' : 'Nenhum aluno vinculado'}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {pendentes.length > 0
                ? 'Sua solicitação foi enviada para a escola. Você terá acesso aos dados após aprovação.'
                : 'Clique em "Adicionar filho" e informe o CPF ou código de matrícula do(a) aluno(a).'}
            </p>
          </div>
        ) : (
          filhos.map(filho => (
            <div key={filho.id}
              className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 overflow-hidden">
              {/* Info do aluno */}
              <div className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">{filho.nome}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      {filho.serie} {filho.turma_codigo ? `— ${filho.turma_codigo}` : ''} | {filho.escola_nome}
                    </p>
                  </div>
                  <span className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${
                    filho.situacao === 'cursando'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                      : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400'
                  }`}>
                    {filho.situacao === 'cursando' ? 'Cursando' : filho.situacao}
                  </span>
                </div>
              </div>

              {/* Acoes rapidas */}
              <div className="border-t border-gray-100 dark:border-slate-700 grid grid-cols-3 divide-x divide-gray-100 dark:divide-slate-700">
                <button
                  onClick={() => router.push(`/responsavel/filho?id=${filho.id}`)}
                  className="flex flex-col items-center gap-1.5 py-3.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 active:bg-indigo-100 transition-colors">
                  <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Boletim</span>
                </button>
                <button
                  onClick={() => router.push(`/responsavel/filho?id=${filho.id}&aba=frequencia`)}
                  className="flex flex-col items-center gap-1.5 py-3.5 hover:bg-green-50 dark:hover:bg-green-900/20 active:bg-green-100 transition-colors">
                  <CalendarCheck className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Frequencia</span>
                </button>
                <button
                  onClick={() => router.push(`/responsavel/comunicados?aluno_id=${filho.id}`)}
                  className="flex flex-col items-center gap-1.5 py-3.5 hover:bg-amber-50 dark:hover:bg-amber-900/20 active:bg-amber-100 transition-colors">
                  <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Comunicados</span>
                </button>
              </div>
            </div>
          ))
        )}

        {/* Info */}
        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4 flex items-start gap-3 border border-indigo-200 dark:border-indigo-800">
          <GraduationCap className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
          <div className="text-xs text-indigo-800 dark:text-indigo-200 leading-relaxed">
            <p className="font-semibold mb-1">SISAM — Portal do Responsavel</p>
            <p>Acompanhe as notas, frequencia e comunicados dos seus filhos. Em caso de duvidas, entre em contato com a secretaria da escola.</p>
          </div>
        </div>
      </div>

      {/* Modal: adicionar filho */}
      <ModalBase aberto={adicionando} onFechar={() => { if (!salvando) setAdicionando(false) }} titulo="Adicionar outro filho(a)" largura="md">
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Informe o CPF ou código de matrícula do(a) aluno(a). A escola revisa antes de liberar acesso.
          </p>
          {erroModal && (
            <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">
              {erroModal}
            </div>
          )}
          {sucessoModal && (
            <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> {sucessoModal}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              CPF ou código de matrícula *
            </label>
            <input
              type="text"
              value={novoAluno}
              onChange={e => setNovoAluno(e.target.value)}
              placeholder="000.000.000-00 ou código"
              disabled={salvando}
              className="w-full px-3 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-base"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vínculo</label>
            <select
              value={novoTipoVinculo}
              onChange={e => setNovoTipoVinculo(e.target.value as any)}
              disabled={salvando}
              className="w-full px-3 py-2.5 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm"
            >
              <option value="mae">Mãe</option>
              <option value="pai">Pai</option>
              <option value="responsavel">Responsável legal</option>
              <option value="avos">Avós</option>
              <option value="outro">Outro</option>
            </select>
          </div>
          <ModalFooter
            onFechar={() => setAdicionando(false)}
            onSalvar={solicitarVinculo}
            salvando={salvando}
            textoSalvar="Solicitar vínculo"
            textoSalvando="Solicitando..."
            desabilitado={!novoAluno.trim()}
          />
        </div>
      </ModalBase>
    </div>
  )
}
