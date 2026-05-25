'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Eye, EyeOff, KeyRound, CheckCircle2, AlertCircle } from 'lucide-react'
import { ThemeToggleSimple } from '@/components/theme-toggle'
import { IndicadorForcaSenha } from '@/components/ui/indicador-forca-senha'

function RedefinirSenhaInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token') || ''

  const [novaSenha, setNovaSenha] = useState('')
  const [confirmarSenha, setConfirmarSenha] = useState('')
  const [mostrarSenha, setMostrarSenha] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [sucesso, setSucesso] = useState(false)
  const [erro, setErro] = useState('')

  useEffect(() => {
    if (!token || !/^[a-f0-9]{64}$/.test(token)) {
      setErro('Link inválido ou expirado. Solicite um novo.')
    }
  }, [token])

  useEffect(() => {
    if (sucesso) {
      const t = setTimeout(() => router.push('/login'), 4000)
      return () => clearTimeout(t)
    }
  }, [sucesso, router])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')

    if (novaSenha !== confirmarSenha) {
      setErro('As senhas não coincidem')
      return
    }

    setEnviando(true)
    try {
      const res = await fetch('/api/auth/redefinir-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, novaSenha, confirmarSenha }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        if (data.erros?.length) {
          setErro(data.erros[0].mensagem)
        } else {
          setErro(data.mensagem || 'Erro ao redefinir senha')
        }
        return
      }

      setSucesso(true)
    } catch {
      setErro('Erro de conexão. Tente novamente.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 px-4 py-8">
      <div className="absolute top-4 right-4">
        <ThemeToggleSimple />
      </div>

      <div className="w-full max-w-md">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao login
        </Link>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700 p-8">
          {sucesso ? (
            <div className="text-center space-y-4">
              <div className="inline-flex p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Senha alterada!
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Sua senha foi alterada com sucesso. Você será redirecionado para o login em instantes.
              </p>
              <Link
                href="/login"
                className="inline-block px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Ir para o login agora
              </Link>
            </div>
          ) : !token || !/^[a-f0-9]{64}$/.test(token) ? (
            <div className="text-center space-y-4">
              <div className="inline-flex p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                <AlertCircle className="w-10 h-10 text-red-600 dark:text-red-400" />
              </div>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Link inválido
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Este link de recuperação não é válido ou já expirou.
              </p>
              <Link
                href="/esqueci-senha"
                className="inline-block px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Solicitar novo link
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="inline-flex p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-full mb-3">
                  <KeyRound className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  Criar nova senha
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                  Escolha uma senha forte que você não usa em nenhum outro serviço.
                </p>
              </div>

              <form onSubmit={onSubmit} className="space-y-4">
                <div>
                  <label htmlFor="nova-senha" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Nova senha
                  </label>
                  <div className="relative">
                    <input
                      id="nova-senha"
                      type={mostrarSenha ? 'text' : 'password'}
                      required
                      autoFocus
                      autoComplete="new-password"
                      value={novaSenha}
                      onChange={(e) => setNovaSenha(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-3 pr-10 text-base text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="••••••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setMostrarSenha(!mostrarSenha)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      aria-label={mostrarSenha ? 'Ocultar senha' : 'Mostrar senha'}
                    >
                      {mostrarSenha ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                  <IndicadorForcaSenha senha={novaSenha} />
                </div>

                <div>
                  <label htmlFor="confirmar-senha" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Confirmar senha
                  </label>
                  <input
                    id="confirmar-senha"
                    type={mostrarSenha ? 'text' : 'password'}
                    required
                    autoComplete="new-password"
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-3 text-base text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="••••••••••••"
                  />
                  {confirmarSenha && confirmarSenha !== novaSenha && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      As senhas não coincidem
                    </p>
                  )}
                </div>

                {erro && (
                  <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                    {erro}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={enviando || !novaSenha || novaSenha !== confirmarSenha}
                  className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                >
                  {enviando ? 'Salvando...' : 'Redefinir senha'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function RedefinirSenhaPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Carregando...</div>}>
      <RedefinirSenhaInner />
    </Suspense>
  )
}
