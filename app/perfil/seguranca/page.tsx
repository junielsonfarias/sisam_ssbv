'use client'

import { useEffect, useState } from 'react'
import { Shield, ShieldCheck, ShieldAlert, Copy, Check, KeyRound } from 'lucide-react'
import ProtectedRoute from '@/components/protected-route'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface StatusResponse {
  configurado: boolean
  ativado: boolean
  backupCodesRestantes: number
  ultimoUsoEm: string | null
  obrigatorio: boolean
}

interface SetupResponse {
  secret: string
  otpauthUrl: string
  qrCodeDataUrl: string
  backupCodes: string[]
  aviso: string
}

export default function SegurancaPage() {
  const [status, setStatus] = useState<StatusResponse | null>(null)
  const [setup, setSetup] = useState<SetupResponse | null>(null)
  const [codigo, setCodigo] = useState('')
  const [carregando, setCarregando] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [copiado, setCopiado] = useState(false)

  useEffect(() => {
    carregarStatus()
  }, [])

  const carregarStatus = async () => {
    setCarregando(true)
    try {
      const res = await fetch('/api/auth/2fa/status')
      if (res.ok) setStatus(await res.json())
    } finally {
      setCarregando(false)
    }
  }

  const iniciarSetup = async () => {
    setErro('')
    setSucesso('')
    setSalvando(true)
    try {
      const res = await fetch('/api/auth/2fa/setup', { method: 'POST' })
      if (!res.ok) throw new Error('Falha no setup')
      const data = await res.json()
      setSetup(data)
    } catch (e) {
      setErro((e as Error).message)
    } finally {
      setSalvando(false)
    }
  }

  const confirmarAtivacao = async () => {
    setErro('')
    setSalvando(true)
    try {
      const res = await fetch('/api/auth/2fa/ativar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErro(data.mensagem || 'Código inválido')
        return
      }
      setSucesso(data.mensagem || '2FA ativado!')
      setSetup(null)
      setCodigo('')
      await carregarStatus()
    } catch {
      setErro('Erro de conexão')
    } finally {
      setSalvando(false)
    }
  }

  const desativar = async () => {
    if (!confirm('Tem certeza que deseja desativar o 2FA? Sua conta ficará menos protegida.')) return
    const codigoAtual = prompt('Informe o código atual do app autenticador para confirmar:')
    if (!codigoAtual) return

    setSalvando(true)
    try {
      const res = await fetch('/api/auth/2fa/desativar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigo: codigoAtual }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErro(data.mensagem || 'Não foi possível desativar')
        return
      }
      setSucesso('2FA desativado.')
      await carregarStatus()
    } catch {
      setErro('Erro de conexão')
    } finally {
      setSalvando(false)
    }
  }

  const copiarCodigos = () => {
    if (!setup) return
    navigator.clipboard.writeText(setup.backupCodes.join('\n'))
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  if (carregando) {
    return (
      <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'polo', 'escola', 'professor', 'editor', 'publicador', 'responsavel']}>
        <LoadingSpinner centered />
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute tiposPermitidos={['administrador', 'tecnico', 'polo', 'escola', 'professor', 'editor', 'publicador', 'responsavel']}>
      <div className="max-w-3xl mx-auto p-4 sm:p-6 lg:p-8">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-white flex items-center gap-3">
            <Shield className="w-7 h-7 text-indigo-600" />
            Segurança da conta
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
            Configure a autenticação em dois fatores (2FA) para proteger sua conta.
          </p>
        </div>

        {erro && (
          <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-800 dark:text-red-200">
            {erro}
          </div>
        )}

        {sucesso && (
          <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-800 dark:text-green-200">
            {sucesso}
          </div>
        )}

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-gray-200 dark:border-slate-700 p-6">
          {/* Status atual */}
          <div className="flex items-start gap-4 mb-6">
            {status?.ativado ? (
              <ShieldCheck className="w-12 h-12 text-green-500 flex-shrink-0" />
            ) : status?.obrigatorio ? (
              <ShieldAlert className="w-12 h-12 text-red-500 flex-shrink-0" />
            ) : (
              <Shield className="w-12 h-12 text-gray-400 flex-shrink-0" />
            )}
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Autenticação em dois fatores (2FA)
              </h2>
              {status?.ativado ? (
                <>
                  <p className="text-sm text-green-700 dark:text-green-400 mt-1">
                    ✓ Ativo. Sua conta tem proteção adicional.
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Códigos de backup restantes: <strong>{status.backupCodesRestantes}</strong>
                    {status.backupCodesRestantes < 3 && (
                      <span className="text-amber-600 dark:text-amber-400 ml-1">— recomendamos gerar novos</span>
                    )}
                  </p>
                </>
              ) : status?.obrigatorio ? (
                <p className="text-sm text-red-700 dark:text-red-400 mt-1">
                  ⚠ Obrigatório para seu perfil. Ative agora para continuar usando o sistema.
                </p>
              ) : (
                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                  Não está ativado. Recomendamos fortemente que você ative.
                </p>
              )}
            </div>
          </div>

          {/* Fluxo de setup */}
          {setup ? (
            <div className="border-t border-gray-200 dark:border-slate-700 pt-6 space-y-6">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  1. Escaneie o QR code no app autenticador
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                  Use o Google Authenticator, Microsoft Authenticator, Authy ou 1Password.
                </p>
                <div className="flex justify-center bg-white p-4 rounded-lg border border-gray-200">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={setup.qrCodeDataUrl} alt="QR code 2FA" className="w-56 h-56" />
                </div>
                <details className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                  <summary className="cursor-pointer">Não consigo escanear? Mostrar código manual</summary>
                  <code className="mt-2 block p-2 bg-gray-100 dark:bg-slate-900 rounded font-mono break-all">
                    {setup.secret}
                  </code>
                </details>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  2. Guarde seus códigos de backup
                </h3>
                <p className="text-sm text-amber-700 dark:text-amber-400 mb-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded border-l-4 border-amber-500">
                  <strong>Importante:</strong> {setup.aviso}
                </p>
                <div className="bg-gray-50 dark:bg-slate-900 rounded-lg p-4 font-mono text-sm text-gray-800 dark:text-gray-200 grid grid-cols-2 gap-2">
                  {setup.backupCodes.map((c, i) => (
                    <div key={i}>{c}</div>
                  ))}
                </div>
                <button
                  onClick={copiarCodigos}
                  className="mt-3 inline-flex items-center gap-2 text-sm px-3 py-2 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 rounded-lg"
                >
                  {copiado ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copiado ? 'Copiado!' : 'Copiar todos'}
                </button>
              </div>

              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                  3. Digite o código de 6 dígitos do app
                </h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="\d{6}"
                    maxLength={6}
                    value={codigo}
                    onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
                    className="flex-1 rounded-lg border border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-3 text-2xl font-mono text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="••••••"
                    autoFocus
                  />
                  <button
                    onClick={confirmarAtivacao}
                    disabled={salvando || codigo.length !== 6}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg font-medium"
                  >
                    {salvando ? 'Validando...' : 'Ativar 2FA'}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="border-t border-gray-200 dark:border-slate-700 pt-6 flex flex-wrap gap-3">
              {!status?.ativado && (
                <button
                  onClick={iniciarSetup}
                  disabled={salvando}
                  className="inline-flex items-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg font-medium"
                >
                  <KeyRound className="w-4 h-4" />
                  {status?.configurado ? 'Reconfigurar 2FA' : 'Ativar 2FA'}
                </button>
              )}
              {status?.ativado && !status?.obrigatorio && (
                <button
                  onClick={desativar}
                  disabled={salvando}
                  className="px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg font-medium"
                >
                  Desativar 2FA
                </button>
              )}
              {status?.ativado && (
                <button
                  onClick={iniciarSetup}
                  disabled={salvando}
                  className="px-4 py-3 border border-gray-300 dark:border-slate-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-slate-700 rounded-lg font-medium"
                >
                  Gerar novos códigos de backup
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  )
}
