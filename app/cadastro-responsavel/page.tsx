'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Eye, EyeOff, CheckCircle, ArrowLeft, Clock } from 'lucide-react'
import Link from 'next/link'
import Rodape from '@/components/rodape'

type TipoVinculo = 'mae' | 'pai' | 'responsavel' | 'avos' | 'outro'

export default function CadastroResponsavelPage() {
  const router = useRouter()
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [cpf, setCpf] = useState('')
  const [telefone, setTelefone] = useState('')
  const [senha, setSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)

  // Filho opcional no cadastro inicial
  const [vincularAgora, setVincularAgora] = useState(false)
  const [alunoIdent, setAlunoIdent] = useState('')
  const [tipoVinculo, setTipoVinculo] = useState<TipoVinculo>('responsavel')

  const [carregando, setCarregando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState<{ msg: string; comAluno: boolean } | null>(null)

  const formatarCPF = (v: string) => {
    const n = v.replace(/\D/g, '').slice(0, 11)
    return n.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})/, '$1-$2')
  }
  const formatarTelefone = (v: string) => {
    const n = v.replace(/\D/g, '').slice(0, 11)
    if (n.length <= 10) return n.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3')
    return n.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    if (senha !== confirmarSenha) return setErro('As senhas não coincidem')
    if (senha.length < 8) return setErro('Senha deve ter pelo menos 8 caracteres')
    const cpfDigits = cpf.replace(/\D/g, '')
    if (cpfDigits.length !== 11) return setErro('CPF deve ter 11 dígitos')

    setCarregando(true)
    try {
      const body: any = {
        nome: nome.trim(),
        email: email.trim().toLowerCase(),
        senha,
        cpf: cpfDigits,
        telefone: telefone.replace(/\D/g, '') || undefined,
      }
      if (vincularAgora && alunoIdent.trim()) {
        body.aluno = { cpf_ou_codigo: alunoIdent.trim(), tipo_vinculo: tipoVinculo }
      }

      const res = await fetch('/api/auth/cadastro-responsavel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok) { setErro(data.mensagem || 'Erro ao realizar cadastro'); return }
      setSucesso({ msg: data.mensagem, comAluno: !!data.requer_aprovacao })
    } catch {
      setErro('Erro ao conectar com o servidor. Verifique sua conexão.')
    } finally {
      setCarregando(false)
    }
  }

  if (sucesso) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full p-6 sm:p-8 text-center">
          <div className="w-16 h-16 mx-auto bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
            <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Cadastro criado!</h1>
          <p className="text-sm text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">{sucesso.msg}</p>
          {sucesso.comAluno && (
            <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-lg text-left mb-4">
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700 dark:text-amber-300">
                A escola precisa aprovar seu vínculo antes de você ver as informações do(a) aluno(a).
                Você receberá acesso assim que aprovado.
              </p>
            </div>
          )}
          <button
            onClick={() => router.push('/login')}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-lg font-medium"
          >
            Ir para login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-6 flex flex-col items-center">
        <Link href="/login" className="self-start inline-flex items-center gap-2 text-sm text-indigo-700 dark:text-indigo-300 hover:underline mb-4">
          <ArrowLeft className="w-4 h-4" /> Voltar ao login
        </Link>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-lg w-full p-6 sm:p-8">
          <div className="text-center mb-6">
            <div className="w-14 h-14 mx-auto bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mb-3">
              <Users className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Sou responsável de aluno</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Crie sua conta para acompanhar boletim, frequência e comunicados do(a) seu(sua) filho(a).
            </p>
          </div>

          {erro && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-sm">
              {erro}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome completo *</label>
              <input type="text" required value={nome} onChange={e => setNome(e.target.value)}
                className="w-full px-3 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-base" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">CPF *</label>
                <input type="text" required inputMode="numeric" value={cpf}
                  onChange={e => setCpf(formatarCPF(e.target.value))}
                  placeholder="000.000.000-00"
                  className="w-full px-3 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-base" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Telefone</label>
                <input type="text" value={telefone} onChange={e => setTelefone(formatarTelefone(e.target.value))}
                  placeholder="(00) 00000-0000"
                  className="w-full px-3 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-base" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">E-mail *</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="w-full px-3 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-base" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Senha *</label>
                <div className="relative">
                  <input type={mostrarSenha ? 'text' : 'password'} required value={senha}
                    onChange={e => setSenha(e.target.value)}
                    minLength={8}
                    className="w-full px-3 py-3 pr-10 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-base" />
                  <button type="button" onClick={() => setMostrarSenha(!mostrarSenha)}
                    aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirmar *</label>
                <input type={mostrarSenha ? 'text' : 'password'} required value={confirmarSenha}
                  onChange={e => setConfirmarSenha(e.target.value)} minLength={8}
                  className="w-full px-3 py-3 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-base" />
              </div>
            </div>

            {/* Vincular aluno opcional */}
            <div className="border-t border-gray-200 dark:border-slate-700 pt-3 mt-3">
              <label className="flex items-start gap-2 cursor-pointer">
                <input type="checkbox" checked={vincularAgora} onChange={e => setVincularAgora(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded text-indigo-600" />
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  Já solicitar vínculo com um aluno agora?
                  <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    (Você também pode fazer isso depois no painel)
                  </span>
                </span>
              </label>

              {vincularAgora && (
                <div className="mt-3 space-y-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3 border border-indigo-200 dark:border-indigo-800">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      CPF ou código de matrícula do(a) aluno(a) *
                    </label>
                    <input type="text" required={vincularAgora} value={alunoIdent}
                      onChange={e => setAlunoIdent(e.target.value)}
                      placeholder="CPF ou código fornecido pela escola"
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vínculo</label>
                    <select value={tipoVinculo} onChange={e => setTipoVinculo(e.target.value as TipoVinculo)}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-gray-900 dark:text-white text-sm">
                      <option value="mae">Mãe</option>
                      <option value="pai">Pai</option>
                      <option value="responsavel">Responsável legal</option>
                      <option value="avos">Avós</option>
                      <option value="outro">Outro</option>
                    </select>
                  </div>
                  <p className="text-xs text-indigo-700 dark:text-indigo-300 flex items-start gap-1">
                    <Clock className="w-3 h-3 mt-0.5 shrink-0" />
                    A escola revisa a solicitação antes de liberar acesso.
                  </p>
                </div>
              )}
            </div>

            <button type="submit" disabled={carregando}
              className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white py-3 rounded-lg font-medium mt-2">
              {carregando ? 'Criando conta...' : 'Criar minha conta'}
            </button>

            <p className="text-center text-xs text-gray-500 dark:text-gray-400">
              Já tem conta? <Link href="/login" className="text-indigo-600 hover:underline font-medium">Fazer login</Link>
            </p>
          </form>
        </div>

        <Rodape />
      </div>
    </div>
  )
}
