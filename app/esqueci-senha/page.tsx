'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Mail, CheckCircle2, Send } from 'lucide-react'
import { ThemeToggleSimple } from '@/components/theme-toggle'

export default function EsqueciSenhaPage() {
  const [email, setEmail] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [enviado, setEnviado] = useState(false)
  const [erro, setErro] = useState('')

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    setEnviando(true)

    try {
      const res = await fetch('/api/auth/recuperar-senha', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setErro(data.mensagem || 'Erro ao processar solicitação')
        return
      }

      setEnviado(true)
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
          {enviado ? (
            <div className="text-center space-y-4">
              <div className="inline-flex p-3 bg-green-100 dark:bg-green-900/30 rounded-full">
                <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
              </div>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                Verifique seu e-mail
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
                Se <strong>{email}</strong> estiver cadastrado em nossa base, enviaremos
                em alguns instantes um link para você redefinir sua senha.
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Não esqueça de verificar a caixa de spam.
              </p>
              <div className="pt-4">
                <Link
                  href="/login"
                  className="inline-block px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Ir para o login
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="inline-flex p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-full mb-3">
                  <Mail className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                </div>
                <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
                  Esqueci minha senha
                </h1>
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                  Informe o seu e-mail cadastrado e enviaremos um link para você criar uma nova senha.
                </p>
              </div>

              <form onSubmit={onSubmit} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    E-mail
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    autoFocus
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-3 text-base text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="seu@email.com"
                  />
                </div>

                {erro && (
                  <p className="text-sm text-red-600 dark:text-red-400" role="alert">
                    {erro}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={enviando || !email}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
                >
                  {enviando ? (
                    <>Enviando...</>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Enviar link de recuperação
                    </>
                  )}
                </button>
              </form>

              <p className="mt-6 text-center text-xs text-gray-500 dark:text-gray-400">
                Lembrou a senha?{' '}
                <Link href="/login" className="text-indigo-600 dark:text-indigo-400 hover:underline">
                  Voltar ao login
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
