'use client'

/**
 * Setup obrigatório de 2FA no fluxo de login.
 *
 * Renderizado quando o tipo do usuário (administrador, tecnico) exige 2FA
 * mas ainda não tem configurado. Esta página redireciona para /perfil/seguranca
 * onde o usuário pode configurar o app autenticador.
 *
 * Como ainda não temos JWT (só o preAuthToken), o fluxo é:
 *  1. Avisar o usuário que precisa configurar 2FA
 *  2. Pedir para configurar via app autenticador (mostra QR aqui mesmo)
 *  3. Após confirmar o código, o backend ativa o 2FA E faz o login
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ShieldAlert, Shield, ArrowLeft, Copy, Check } from 'lucide-react'
import { ThemeToggleSimple } from '@/components/theme-toggle'

interface SetupData {
  secret: string
  qrCodeDataUrl: string
  backupCodes: string[]
}

export default function Setup2FAPage() {
  const router = useRouter()
  const [token, setToken] = useState('')
  const [email, setEmail] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [setup, setSetup] = useState<SetupData | null>(null)
  const [codigo, setCodigo] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [erro, setErro] = useState('')
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    const t = sessionStorage.getItem('preAuthToken')
    const e = sessionStorage.getItem('preAuthEmail')
    if (!t) {
      router.replace('/login')
      return
    }
    setToken(t)
    setEmail(e || '')
    iniciarSetup(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router])

  const iniciarSetup = async (preAuthToken: string) => {
    setCarregando(true)
    try {
      const res = await fetch('/api/auth/2fa/setup-prelogin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preAuthToken }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErro(data.mensagem || 'Erro ao iniciar configuração')
        return
      }
      setSetup({
        secret: data.secret,
        qrCodeDataUrl: data.qrCodeDataUrl,
        backupCodes: data.backupCodes,
      })
    } catch {
      setErro('Erro de conexão')
    } finally {
      setCarregando(false)
    }
  }

  const confirmar = async (e: React.FormEvent) => {
    e.preventDefault()
    setErro('')
    setEnviando(true)
    try {
      const res = await fetch('/api/auth/2fa/ativar-prelogin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preAuthToken: token, codigo }),
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok) {
        setErro(data.mensagem || 'Código inválido')
        return
      }
      sessionStorage.removeItem('preAuthToken')
      sessionStorage.removeItem('preAuthEmail')
      router.push('/modulos')
    } catch {
      setErro('Erro de conexão')
    } finally {
      setEnviando(false)
    }
  }

  const copiarBackup = () => {
    if (!setup) return
    navigator.clipboard.writeText(setup.backupCodes.join('\n'))
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-amber-50 via-white to-amber-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 px-4 py-8">
      <div className="absolute top-4 right-4">
        <ThemeToggleSimple />
      </div>

      <div className="w-full max-w-xl">
        <Link href="/login" className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 hover:text-indigo-600 mb-6">
          <ArrowLeft className="w-4 h-4" />
          Cancelar e voltar
        </Link>

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-amber-200 dark:border-amber-800 p-8">
          <div className="text-center mb-6">
            <div className="inline-flex p-3 bg-amber-100 dark:bg-amber-900/30 rounded-full mb-3">
              <ShieldAlert className="w-8 h-8 text-amber-600 dark:text-amber-400" />
            </div>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
              Ative 2FA para continuar
            </h1>
            <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
              {email && <span className="block text-xs mb-1">Conta: <strong>{email}</strong></span>}
              Seu perfil exige autenticação em dois fatores. Configure agora para concluir o login.
            </p>
          </div>

          {carregando ? (
            <div className="text-center py-8 text-gray-500">Carregando...</div>
          ) : !setup ? (
            <div className="text-center py-8 text-red-600">{erro || 'Erro ao iniciar setup'}</div>
          ) : (
            <div className="space-y-6">
              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white mb-2">
                  1. Escaneie o QR code
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                  Use Google Authenticator, Microsoft Authenticator, Authy ou 1Password.
                </p>
                <div className="flex justify-center bg-white p-4 rounded-lg border border-gray-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={setup.qrCodeDataUrl} alt="QR code 2FA" className="w-56 h-56" />
                </div>
                <details className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                  <summary className="cursor-pointer">Código manual</summary>
                  <code className="mt-2 block p-2 bg-gray-100 dark:bg-slate-900 rounded font-mono break-all">
                    {setup.secret}
                  </code>
                </details>
              </div>

              <div>
                <h2 className="font-semibold text-gray-900 dark:text-white mb-2">
                  2. Guarde os códigos de backup
                </h2>
                <p className="text-xs text-amber-700 dark:text-amber-400 mb-3">
                  Eles serão mostrados <strong>uma única vez</strong>. Use se perder acesso ao app.
                </p>
                <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4 font-mono text-sm grid grid-cols-2 gap-2">
                  {setup.backupCodes.map((c, i) => (
                    <div key={i}>{c}</div>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={copiarBackup}
                  className="mt-2 inline-flex items-center gap-2 text-sm px-3 py-2 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg"
                >
                  {copiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copiado ? 'Copiado' : 'Copiar todos'}
                </button>
              </div>

              <form onSubmit={confirmar}>
                <h2 className="font-semibold text-gray-900 dark:text-white mb-2">
                  3. Digite o código de 6 dígitos do app
                </h2>
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
                    className="flex-1 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-3 text-2xl font-mono text-center tracking-widest"
                    placeholder="••••••"
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={enviando || codigo.length !== 6}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg font-medium"
                  >
                    <Shield className="w-4 h-4 inline mr-1" />
                    {enviando ? 'Ativando...' : 'Ativar e entrar'}
                  </button>
                </div>
                {erro && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-2 text-center">{erro}</p>
                )}
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
