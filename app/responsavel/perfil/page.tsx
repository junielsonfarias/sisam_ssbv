'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, User, Mail, Phone, FileText, Lock, CheckCircle, AlertCircle, Save } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface Perfil {
  id: string
  nome: string
  email: string
  cpf: string | null
  telefone: string | null
  foto_url: string | null
}

function iniciaisDe(nome: string) {
  return nome.split(' ').filter(Boolean).map(n => n[0]).slice(0, 2).join('').toUpperCase() || '?'
}

function mascaraCpf(cpf: string | null) {
  if (!cpf) return '—'
  const d = cpf.replace(/\D/g, '')
  if (d.length !== 11) return cpf
  return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`
}

export default function PerfilResponsavel() {
  const router = useRouter()
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null)

  // Campos editaveis
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')

  // Troca de senha
  const [senhaAtual, setSenhaAtual] = useState('')
  const [senhaNova, setSenhaNova] = useState('')
  const [senhaConfirma, setSenhaConfirma] = useState('')

  useEffect(() => { carregar() }, [])

  const carregar = async () => {
    try {
      const res = await fetch('/api/responsavel/perfil', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        const p: Perfil = data.perfil
        setPerfil(p)
        setNome(p.nome || '')
        setEmail(p.email || '')
        setTelefone(p.telefone || '')
      }
    } catch { /* offline */ } finally {
      setCarregando(false)
    }
  }

  const salvar = async () => {
    setMsg(null)
    if (nome.trim().length < 3) { setMsg({ tipo: 'erro', texto: 'Informe seu nome completo.' }); return }
    if (senhaNova || senhaConfirma || senhaAtual) {
      if (senhaNova.length < 6) { setMsg({ tipo: 'erro', texto: 'A nova senha deve ter ao menos 6 caracteres.' }); return }
      if (senhaNova !== senhaConfirma) { setMsg({ tipo: 'erro', texto: 'A confirmação da nova senha não confere.' }); return }
      if (!senhaAtual) { setMsg({ tipo: 'erro', texto: 'Informe sua senha atual para trocá-la.' }); return }
    }
    setSalvando(true)
    try {
      const body: Record<string, string> = { nome: nome.trim(), email: email.trim(), telefone: telefone.trim() }
      if (senhaNova) { body.senha_atual = senhaAtual; body.senha_nova = senhaNova }
      const res = await fetch('/api/responsavel/perfil', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setMsg({ tipo: 'erro', texto: data.mensagem || 'Erro ao salvar.' }); return }
      setMsg({ tipo: 'ok', texto: data.mensagem || 'Perfil atualizado.' })
      setSenhaAtual(''); setSenhaNova(''); setSenhaConfirma('')
      // Sincroniza o nome exibido no portal (hero do dashboard usa o localStorage)
      try {
        const u = localStorage.getItem('educatec_offline_user')
        if (u) { const o = JSON.parse(u); o.nome = nome.trim(); localStorage.setItem('educatec_offline_user', JSON.stringify(o)) }
      } catch { /* */ }
      setPerfil(prev => prev ? { ...prev, nome: nome.trim(), email: email.trim(), telefone: telefone.trim() } : prev)
    } catch {
      setMsg({ tipo: 'erro', texto: 'Erro de conexão.' })
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center">
        <LoadingSpinner centered />
      </div>
    )
  }

  const inputCls = 'w-full pl-10 pr-3 py-3 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-base focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition'
  const labelCls = 'block text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5 uppercase tracking-wide'

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50/60 to-gray-50 dark:from-slate-900 dark:to-slate-900 pb-12">
      {/* HERO */}
      <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-700 text-white">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-5 pb-8">
          <button onClick={() => router.push('/responsavel/dashboard')}
            className="inline-flex items-center gap-1.5 text-indigo-100 hover:text-white text-sm mb-4 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/15 ring-2 ring-white/30 flex items-center justify-center text-2xl font-extrabold shrink-0 backdrop-blur-sm">
              {iniciaisDe(nome || 'Responsável')}
            </div>
            <div className="min-w-0">
              <p className="text-indigo-200 text-[11px] font-medium uppercase tracking-wider">Meu perfil</p>
              <h1 className="text-xl font-bold leading-tight truncate">{nome || 'Responsável'}</h1>
              <p className="text-indigo-200 text-sm truncate">{email}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 -mt-4 relative z-10 space-y-4">
        {msg && (
          <div className={`rounded-2xl p-4 flex items-start gap-2.5 text-sm shadow-sm border ${
            msg.tipo === 'ok'
              ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200'
              : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
          }`}>
            {msg.tipo === 'ok' ? <CheckCircle className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
            <span>{msg.texto}</span>
          </div>
        )}

        {/* DADOS PESSOAIS */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <User className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Dados pessoais
          </h2>

          <div>
            <label className={labelCls}>Nome completo</label>
            <div className="relative">
              <User className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input type="text" value={nome} onChange={e => setNome(e.target.value)} disabled={salvando}
                className={inputCls} placeholder="Seu nome completo" />
            </div>
          </div>

          <div>
            <label className={labelCls}>E-mail</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} disabled={salvando}
                className={inputCls} placeholder="seu@email.com" />
            </div>
          </div>

          <div>
            <label className={labelCls}>Telefone / WhatsApp</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input type="tel" value={telefone} onChange={e => setTelefone(e.target.value)} disabled={salvando}
                className={inputCls} placeholder="(00) 00000-0000" />
            </div>
          </div>

          <div>
            <label className={labelCls}>CPF</label>
            <div className="relative">
              <FileText className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input type="text" value={mascaraCpf(perfil?.cpf || null)} disabled
                className={`${inputCls} bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-gray-400 cursor-not-allowed`} />
            </div>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">O CPF é gerenciado pela secretaria e não pode ser alterado aqui.</p>
          </div>
        </div>

        {/* TROCAR SENHA */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm p-5 space-y-4">
          <h2 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <Lock className="w-4 h-4 text-indigo-600 dark:text-indigo-400" /> Alterar senha
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 -mt-1">Deixe em branco para manter a senha atual.</p>

          <div>
            <label className={labelCls}>Senha atual</label>
            <input type="password" value={senhaAtual} onChange={e => setSenhaAtual(e.target.value)} disabled={salvando}
              autoComplete="current-password"
              className="w-full px-3 py-3 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-base focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="••••••••" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Nova senha</label>
              <input type="password" value={senhaNova} onChange={e => setSenhaNova(e.target.value)} disabled={salvando}
                autoComplete="new-password"
                className="w-full px-3 py-3 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-base focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Mín. 6 caracteres" />
            </div>
            <div>
              <label className={labelCls}>Confirmar nova senha</label>
              <input type="password" value={senhaConfirma} onChange={e => setSenhaConfirma(e.target.value)} disabled={salvando}
                autoComplete="new-password"
                className="w-full px-3 py-3 rounded-xl border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-base focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Repita a nova senha" />
            </div>
          </div>
        </div>

        {/* SALVAR */}
        <button onClick={salvar} disabled={salvando}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3.5 bg-indigo-600 text-white font-semibold rounded-xl hover:bg-indigo-700 active:scale-[0.99] transition disabled:opacity-60 min-h-[52px]">
          {salvando ? <LoadingSpinner /> : <><Save className="w-5 h-5" /> Salvar alterações</>}
        </button>
      </div>
    </div>
  )
}
