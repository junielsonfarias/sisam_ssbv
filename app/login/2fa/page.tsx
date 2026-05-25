'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Shield, ArrowLeft } from 'lucide-react'
import { ThemeToggleSimple } from '@/components/theme-toggle'
import * as offlineStorage from '@/lib/offline-storage'

export default function Login2FAPage() {
  const router = useRouter()
  const [codigo, setCodigo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [token, setToken] = useState('')
  const [email, setEmail] = useState('')
  const [usarBackup, setUsarBackup] = useState(false)

  useEffect(() => {
    const t = sessionStorage.getItem('preAuthToken')
    const e = sessionStorage.getItem('preAuthEmail')
    if (!t) {
      router.replace('/login')
      return
    }
    setToken(t)
    setEmail(e || '')
  }, [router])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    setEnviando(true)

    try {
      const res = await fetch('/api/auth/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preAuthToken: token, codigo }),
        credentials: 'include',
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setErro(data.mensagem || 'Código inválido')
        return
      }

      sessionStorage.removeItem('preAuthToken')
      sessionStorage.removeItem('preAuthEmail')

      // Salvar usuário offline
      offlineStorage.saveUser({
        id: data.usuario.id?.toString(),
        nome: data.usuario.nome,
        email: data.usuario.email,
        tipo_usuario: data.usuario.tipo_usuario,
        polo_id: data.usuario.polo_id,
        escola_id: data.usuario.escola_id,
        acesso_sisam: data.usuario.acesso_sisam,
        acesso_gestor: data.usuario.acesso_gestor,
      })

      // Direcionar conforme tipo
      const tipo = data.usuario.tipo_usuario
      if (tipo === 'polo') router.push('/polo/dashboard')
      else if (tipo === 'professor') router.push('/professor/dashboard')
      else if (tipo === 'responsavel') router.push('/responsavel/dashboard')
      else if (tipo === 'editor') router.push('/editor/noticias')
      else {
        offlineStorage.clearModuloAtivo()
        router.push('/modulos')
      }
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
        <Link href="/login" className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-indigo-600 mb-6">
          <ArrowLeft className="w-4 h-4" />
          Cancelar e voltar
        </Link>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700 p-8">
          <div className="text-center mb-6">
            <div className="inline-flex p-3 bg-indigo-100 dark:bg-indigo-900/30 rounded-full mb-3">
              <Shield className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Verificação em dois fatores
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
              {email && <span className="block text-xs mb-1">Conta: <strong>{email}</strong></span>}
              {usarBackup
                ? 'Informe um código de backup.'
                : 'Abra seu app autenticador e digite o código de 6 dígitos.'}
            </p>
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div>
              <input
                type="text"
                inputMode={usarBackup ? 'text' : 'numeric'}
                pattern={usarBackup ? undefined : '\\d{6}'}
                maxLength={usarBackup ? 11 : 6}
                value={codigo}
                onChange={(e) => setCodigo(usarBackup ? e.target.value.toUpperCase() : e.target.value.replace(/\D/g, ''))}
                className="w-full rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-4 text-2xl font-mono text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder={usarBackup ? 'XXXXX-XXXXX' : '••••••'}
                autoFocus
              />
            </div>

            {erro && (
              <p className="text-sm text-red-600 dark:text-red-400 text-center" role="alert">
                {erro}
              </p>
            )}

            <button
              type="submit"
              disabled={enviando || !codigo}
              className="w-full px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium rounded-lg transition-colors"
            >
              {enviando ? 'Verificando...' : 'Verificar e entrar'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
            <button
              type="button"
              onClick={() => { setUsarBackup(!usarBackup); setCodigo(''); setErro('') }}
              className="text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              {usarBackup
                ? 'Usar código do app autenticador'
                : 'Não tenho acesso ao app — usar código de backup'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
