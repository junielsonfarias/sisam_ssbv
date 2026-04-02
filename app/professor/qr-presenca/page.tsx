'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ProtectedRoute from '@/components/protected-route'
import { QrCode, Clock, RefreshCw, CheckCircle, Users, ArrowLeft } from 'lucide-react'
import { useToast } from '@/components/toast'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface Turma {
  turma_id: string; turma_nome: string; serie: string; turno: string
  escola_nome: string; total_alunos: number
}

interface QrData {
  token: string; url: string; data: string; expira_em: string; validade_minutos: number
  turma: { codigo: string; nome: string; serie: string; escola_nome: string }
}

export default function QrPresencaPage() {
  const router = useRouter()
  const toast = useToast()
  const [turmas, setTurmas] = useState<Turma[]>([])
  const [carregando, setCarregando] = useState(true)
  const [gerando, setGerando] = useState(false)
  const [qrData, setQrData] = useState<QrData | null>(null)
  const [tempoRestante, setTempoRestante] = useState('')

  useEffect(() => { carregarTurmas() }, [])

  // Timer de expiração
  useEffect(() => {
    if (!qrData) return
    const interval = setInterval(() => {
      const agora = Date.now()
      const expira = new Date(qrData.expira_em).getTime()
      const diff = expira - agora
      if (diff <= 0) {
        setTempoRestante('Expirado')
        setQrData(null)
        toast.error('QR code expirou. Gere um novo.')
        clearInterval(interval)
        return
      }
      const min = Math.floor(diff / 60000)
      const seg = Math.floor((diff % 60000) / 1000)
      setTempoRestante(`${min}:${String(seg).padStart(2, '0')}`)
    }, 1000)
    return () => clearInterval(interval)
  }, [qrData])

  const carregarTurmas = async () => {
    try {
      const res = await fetch('/api/professor/turmas', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setTurmas(data.turmas || [])
      }
    } catch { /* offline */ } finally { setCarregando(false) }
  }

  const gerarQr = async (turmaId: string) => {
    setGerando(true)
    try {
      const res = await fetch('/api/presenca-qr/gerar', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ turma_id: turmaId, validade_minutos: 30 }),
      })
      if (res.ok) {
        const data = await res.json()
        setQrData(data)
        toast.success('QR code gerado! Valido por 30 minutos.')
      } else {
        const err = await res.json().catch(() => ({}))
        toast.error(err.mensagem || 'Erro ao gerar QR code')
      }
    } catch {
      toast.error('Erro de conexao')
    } finally { setGerando(false) }
  }

  if (carregando) return (
    <ProtectedRoute tiposPermitidos={['professor']}>
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900 flex items-center justify-center"><LoadingSpinner centered /></div>
    </ProtectedRoute>
  )

  // TELA DO QR CODE GERADO (fullscreen para projetar)
  if (qrData) {
    // Gerar URL do QR via API pública do Google Charts (simples, sem dependência)
    const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(qrData.url)}`

    return (
      <ProtectedRoute tiposPermitidos={['professor']}>
        <div className="min-h-screen bg-white dark:bg-slate-900 flex flex-col items-center justify-center p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              {qrData.turma.nome}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {qrData.turma.serie} — {qrData.turma.escola_nome}
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {new Date(qrData.data).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
            </p>
          </div>

          {/* QR Code */}
          <div className="bg-white p-6 rounded-2xl shadow-lg border-2 border-gray-100 dark:border-slate-700">
            <img src={qrImageUrl} alt="QR Code Presenca" className="w-64 h-64 sm:w-80 sm:h-80" />
          </div>

          {/* Timer */}
          <div className={`mt-6 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${
            tempoRestante === 'Expirado'
              ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
              : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
          }`}>
            <Clock className="w-4 h-4" />
            {tempoRestante === 'Expirado' ? 'Expirado' : `Expira em ${tempoRestante}`}
          </div>

          {/* Instrução */}
          <p className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400 max-w-sm">
            Projete este QR code na tela ou mostre no celular. Os alunos devem escanear com a camera para registrar presenca.
          </p>

          {/* Ações */}
          <div className="mt-6 flex gap-3">
            <button onClick={() => setQrData(null)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-slate-700 rounded-xl hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Voltar
            </button>
            <button onClick={() => gerarQr(qrData.turma.codigo)}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-xl hover:bg-emerald-700 transition-colors">
              <RefreshCw className="w-4 h-4" /> Novo QR
            </button>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  // LISTA DE TURMAS PARA GERAR QR
  return (
    <ProtectedRoute tiposPermitidos={['professor']}>
      <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
        <div className="bg-emerald-600 text-white px-4 sm:px-6 py-5">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-3">
              <button onClick={() => router.push('/professor/dashboard')} className="p-1">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <QrCode className="w-6 h-6" />
              <div>
                <h1 className="text-lg font-bold">Presenca por QR Code</h1>
                <p className="text-emerald-200 text-xs">Selecione a turma para gerar o QR</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 space-y-3">
          {turmas.length === 0 ? (
            <div className="bg-white dark:bg-slate-800 rounded-xl p-8 text-center border border-gray-200 dark:border-slate-700">
              <QrCode className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-500">Nenhuma turma vinculada</p>
            </div>
          ) : (
            turmas.map(t => (
              <button key={t.turma_id}
                onClick={() => gerarQr(t.turma_id)}
                disabled={gerando}
                className="w-full bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-4 flex items-center gap-4 hover:border-emerald-300 dark:hover:border-emerald-700 active:bg-gray-50 dark:active:bg-slate-700 transition-colors text-left">
                <div className="shrink-0 w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                  <QrCode className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate">{t.turma_nome}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{t.serie} — {t.turno}</p>
                  <p className="text-xs text-gray-400">{t.escola_nome}</p>
                </div>
                <div className="shrink-0 text-right">
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Users className="w-3.5 h-3.5" />
                    <span>{t.total_alunos}</span>
                  </div>
                  {gerando ? <LoadingSpinner /> : (
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Gerar QR</span>
                  )}
                </div>
              </button>
            ))
          )}

          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 border border-emerald-200 dark:border-emerald-800">
            <p className="text-xs text-emerald-800 dark:text-emerald-200 leading-relaxed">
              <strong>Como funciona:</strong> Gere o QR code e mostre na tela para os alunos. Cada aluno escaneia com o celular e informa seu codigo de matricula. A presenca e registrada automaticamente. O QR expira em 30 minutos.
            </p>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
