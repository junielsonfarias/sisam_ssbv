'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { CheckCircle, XCircle, QrCode, User, Loader2 } from 'lucide-react'

export default function PresencaQrWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-emerald-600 flex items-center justify-center"><Loader2 className="w-8 h-8 text-white animate-spin" /></div>}>
      <PresencaQrPage />
    </Suspense>
  )
}

function PresencaQrPage() {
  const searchParams = useSearchParams()
  const token = searchParams.get('t')

  const [codigo, setCodigo] = useState('')
  const [registrando, setRegistrando] = useState(false)
  const [resultado, setResultado] = useState<{
    sucesso: boolean; aluno_nome?: string; tipo?: string; hora?: string; mensagem?: string
  } | null>(null)

  const registrar = async () => {
    if (!codigo.trim() || !token) return
    setRegistrando(true)
    setResultado(null)

    try {
      const res = await fetch('/api/presenca-qr/registrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, aluno_codigo: codigo.trim().toUpperCase() }),
      })

      const data = await res.json()

      if (res.ok) {
        setResultado({ sucesso: true, aluno_nome: data.aluno_nome, tipo: data.tipo, hora: data.hora })
        // Limpar para próximo aluno
        setTimeout(() => { setCodigo(''); setResultado(null) }, 4000)
      } else {
        setResultado({ sucesso: false, mensagem: data.mensagem || 'Erro ao registrar' })
      }
    } catch {
      setResultado({ sucesso: false, mensagem: 'Sem conexao. Tente novamente.' })
    } finally {
      setRegistrando(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center p-6">
        <div className="text-center">
          <XCircle className="w-16 h-16 mx-auto mb-4 text-red-400" />
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">QR Code Invalido</h1>
          <p className="text-sm text-gray-500 mt-2">Este link nao contem um QR code valido. Solicite ao professor um novo QR code.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-600 to-emerald-700 flex flex-col">
      {/* Header */}
      <div className="text-center text-white pt-8 pb-4 px-6">
        <QrCode className="w-10 h-10 mx-auto mb-3 opacity-80" />
        <h1 className="text-xl font-bold">Registro de Presenca</h1>
        <p className="text-emerald-200 text-sm mt-1">Digite seu codigo de matricula</p>
      </div>

      {/* Card principal */}
      <div className="flex-1 bg-white dark:bg-slate-900 rounded-t-3xl px-6 pt-8 pb-6">
        <div className="max-w-sm mx-auto space-y-6">

          {/* Resultado */}
          {resultado && (
            <div className={`rounded-2xl p-5 text-center ${
              resultado.sucesso
                ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-700'
                : 'bg-red-50 dark:bg-red-900/20 border-2 border-red-300 dark:border-red-700'
            }`}>
              {resultado.sucesso ? (
                <>
                  <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                  <p className="text-lg font-bold text-green-800 dark:text-green-200">{resultado.aluno_nome}</p>
                  <p className="text-sm text-green-600 dark:text-green-300 mt-1">
                    {resultado.tipo === 'entrada' ? 'Entrada registrada' : 'Saida registrada'} as {resultado.hora}
                  </p>
                </>
              ) : (
                <>
                  <XCircle className="w-12 h-12 mx-auto mb-2 text-red-500" />
                  <p className="text-sm font-medium text-red-700 dark:text-red-300">{resultado.mensagem}</p>
                </>
              )}
            </div>
          )}

          {/* Input código */}
          {!resultado && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Codigo de Matricula
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={codigo}
                    onChange={e => setCodigo(e.target.value.toUpperCase())}
                    onKeyDown={e => { if (e.key === 'Enter') registrar() }}
                    placeholder="Ex: MATA0001"
                    autoFocus
                    autoComplete="off"
                    className="w-full pl-12 pr-4 py-4 text-lg font-mono tracking-wider border-2 border-gray-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 placeholder:text-gray-400 uppercase"
                  />
                </div>
              </div>

              <button onClick={registrar}
                disabled={!codigo.trim() || registrando}
                className="w-full h-14 text-base font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl disabled:bg-gray-300 dark:disabled:bg-slate-600 disabled:text-gray-500 transition-colors flex items-center justify-center gap-2">
                {registrando ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Registrando...</>
                ) : (
                  <><CheckCircle className="w-5 h-5" /> Registrar Presenca</>
                )}
              </button>

              <p className="text-center text-xs text-gray-400 dark:text-gray-500">
                Seu codigo esta no boletim ou na carteirinha escolar
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
