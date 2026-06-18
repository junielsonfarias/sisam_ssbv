'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, CalendarCheck, Bell, LogOut, GraduationCap, AlertTriangle, MessageCircle, Calendar, Plus, Clock, XCircle, CheckCircle, User, ChevronRight } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { ModalBase, ModalFooter } from '@/components/ui/modal-base'
import { EmptyCard } from '@/components/ui/empty-card'

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

function iniciaisDe(nome: string) {
  return nome.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?'
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
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/60 to-gray-50 dark:from-slate-900 dark:to-slate-900 pb-10">
      {/* ===================== HERO ===================== */}
      <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-5 pb-7">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-2xl bg-white/15 ring-2 ring-white/30 flex items-center justify-center text-lg font-extrabold shrink-0 backdrop-blur-sm">
                {iniciaisDe(nomeUsuario || 'Responsável')}
              </div>
              <div className="min-w-0">
                <p className="text-indigo-200 text-[11px] font-medium uppercase tracking-wider">Portal do Responsável</p>
                <h1 className="text-xl font-bold leading-tight truncate">Olá, {nomeUsuario.split(' ')[0] || 'Responsável'}!</h1>
              </div>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button onClick={() => router.push('/responsavel/perfil')}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 transition-colors" title="Meu perfil" aria-label="Meu perfil">
                <User className="w-5 h-5" />
              </button>
              <button onClick={() => router.push('/responsavel/calendario')}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 transition-colors" title="Calendário" aria-label="Calendário">
                <Calendar className="w-5 h-5" />
              </button>
              <button onClick={() => router.push('/responsavel/mensagens')}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 transition-colors" title="Mensagens" aria-label="Mensagens">
                <MessageCircle className="w-5 h-5" />
              </button>
              <button onClick={sair}
                className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 active:bg-white/30 transition-colors" title="Sair" aria-label="Sair">
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 -mt-3 relative z-10 space-y-3.5">
        {/* Banner: solicitacoes pendentes */}
        {pendentes.length > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
            <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
                {pendentes.length} solicitação(ões) aguardando aprovação da escola
              </p>
              <ul className="mt-1 text-xs text-amber-800 dark:text-amber-300 space-y-0.5">
                {pendentes.map(p => <li key={p.id}>• {p.aluno_nome} ({p.escola_nome})</li>)}
              </ul>
            </div>
          </div>
        )}

        {/* Banner: solicitacoes rejeitadas */}
        {rejeitadas.length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-4 flex items-start gap-3 shadow-sm">
            <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
            <div className="flex-1 text-sm text-red-800 dark:text-red-300">
              <p className="font-semibold mb-1">{rejeitadas.length} solicitação(ões) rejeitada(s)</p>
              {rejeitadas.map(r => (
                <p key={r.id} className="text-xs">{r.aluno_nome}{r.motivo_rejeicao ? ` — ${r.motivo_rejeicao}` : ''}</p>
              ))}
            </div>
          </div>
        )}

        {/* Filhos */}
        <div className="flex items-center justify-between pt-1">
          <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            {filhos.length === 1 ? 'Seu filho(a)' : filhos.length === 0 ? 'Seus filhos' : `Seus filhos · ${filhos.length}`}
          </h2>
          <button
            onClick={() => { setAdicionando(true); setErroModal(''); setSucessoModal('') }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 active:scale-95 transition min-h-[40px]"
          >
            <Plus className="w-4 h-4" /> Adicionar
          </button>
        </div>

        {filhos.length === 0 ? (
          <EmptyCard
            Icon={AlertTriangle}
            titulo={pendentes.length > 0 ? 'Aguardando aprovação' : 'Nenhum aluno vinculado'}
            texto={pendentes.length > 0
              ? 'Sua solicitação foi enviada para a escola. Você terá acesso aos dados após a aprovação.'
              : 'Toque em "Adicionar" e informe o CPF ou código de matrícula do(a) aluno(a).'}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
          {filhos.map(filho => (
            <div key={filho.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm overflow-hidden">
              <button
                onClick={() => router.push(`/responsavel/filho?id=${filho.id}&aba=matricula`)}
                className="w-full text-left p-4 sm:p-5 flex items-start gap-3.5 hover:bg-gray-50 dark:hover:bg-slate-700/40 active:bg-gray-100 dark:active:bg-slate-700/60 transition-colors"
                title="Ver dados cadastrais"
              >
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-base font-extrabold shrink-0">
                  {iniciaisDe(filho.nome)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-bold text-gray-900 dark:text-white leading-tight truncate">{filho.nome}</h3>
                    <span className={`shrink-0 text-[11px] font-semibold px-2.5 py-1 rounded-full ${
                      filho.situacao === 'cursando'
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                        : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-400'
                    }`}>
                      {filho.situacao === 'cursando' ? 'Cursando' : filho.situacao}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 flex items-center gap-1.5">
                    <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                    {filho.serie}{filho.turma_codigo ? ` · ${filho.turma_codigo}` : ''}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate mt-0.5">{filho.escola_nome}</p>
                  <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-indigo-600 dark:text-indigo-400 mt-1.5">
                    Ver dados cadastrais <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </button>

              <div className="border-t border-gray-100 dark:border-slate-700 grid grid-cols-3 divide-x divide-gray-100 dark:divide-slate-700">
                <button onClick={() => router.push(`/responsavel/filho?id=${filho.id}`)}
                  className="flex flex-col items-center gap-1.5 py-3.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 active:bg-indigo-100 dark:active:bg-indigo-900/40 transition-colors min-h-[64px]">
                  <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Boletim</span>
                </button>
                <button onClick={() => router.push(`/responsavel/filho?id=${filho.id}&aba=frequencia`)}
                  className="flex flex-col items-center gap-1.5 py-3.5 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 active:bg-emerald-100 dark:active:bg-emerald-900/40 transition-colors min-h-[64px]">
                  <CalendarCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Frequência</span>
                </button>
                <button onClick={() => router.push(`/responsavel/comunicados?aluno_id=${filho.id}`)}
                  className="flex flex-col items-center gap-1.5 py-3.5 hover:bg-amber-50 dark:hover:bg-amber-900/20 active:bg-amber-100 dark:active:bg-amber-900/40 transition-colors min-h-[64px]">
                  <Bell className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Comunicados</span>
                </button>
              </div>
            </div>
          ))}
          </div>
        )}

        {/* Info */}
        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl p-4 flex items-start gap-3 border border-indigo-100 dark:border-indigo-800">
          <GraduationCap className="w-5 h-5 text-indigo-600 dark:text-indigo-400 mt-0.5 shrink-0" />
          <div className="text-xs text-indigo-800 dark:text-indigo-200 leading-relaxed">
            <p className="font-semibold mb-0.5">SISAM — Portal do Responsável</p>
            <p>Acompanhe notas, frequência e comunicados dos seus filhos. Em caso de dúvidas, procure a secretaria da escola.</p>
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
            <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">{erroModal}</div>
          )}
          {sucessoModal && (
            <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> {sucessoModal}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CPF ou código de matrícula *</label>
            <input
              type="text" value={novoAluno} onChange={e => setNovoAluno(e.target.value)}
              placeholder="000.000.000-00 ou código" disabled={salvando}
              className="w-full px-3 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-base"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vínculo</label>
            <select
              value={novoTipoVinculo} onChange={e => setNovoTipoVinculo(e.target.value as any)} disabled={salvando}
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
