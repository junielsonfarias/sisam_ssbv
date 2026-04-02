'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Download, Smartphone, CheckCircle, ArrowLeft, Shield, Wifi, Bell, Camera, QrCode, MessageCircle, RefreshCw } from 'lucide-react'

interface AppVersion {
  versao: string
  versao_codigo: number
  data_lancamento: string
  changelog: string[]
  download: { android: { url: string; tamanho_mb: number; min_android: string } }
  playstore: string | null
}

export default function AppDownloadPage() {
  const router = useRouter()
  const [versao, setVersao] = useState<AppVersion | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    fetch('/api/app-version')
      .then(r => r.json())
      .then(setVersao)
      .catch(() => {})
      .finally(() => setCarregando(false))
  }, [])

  const formatarData = (d: string) => {
    try { return new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) }
    catch { return d }
  }

  const recursos = [
    { icone: Camera, titulo: 'Reconhecimento Facial', desc: 'Presenca automatica com camera', cor: 'text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/30' },
    { icone: QrCode, titulo: 'QR Code Presenca', desc: 'Alternativa simples ao facial', cor: 'text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30' },
    { icone: Bell, titulo: 'Notificacoes Push', desc: 'Alertas de notas, faltas e mensagens', cor: 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30' },
    { icone: MessageCircle, titulo: 'Chat Professor-Pais', desc: 'Comunicacao direta sobre o aluno', cor: 'text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30' },
    { icone: Wifi, titulo: 'Funciona Offline', desc: 'Dados salvos sem internet', cor: 'text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30' },
    { icone: Shield, titulo: 'Modo Terminal', desc: 'Tela sempre ligada, auto-inicio', cor: 'text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 text-white px-4 sm:px-6 py-8 sm:py-12">
        <div className="max-w-2xl mx-auto text-center">
          <button onClick={() => router.back()} className="absolute left-4 top-4 p-2 rounded-xl bg-white/10 hover:bg-white/20 sm:hidden">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="bg-white/20 rounded-2xl p-4 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <Smartphone className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold">SISAM App</h1>
          <p className="text-indigo-200 mt-2 text-sm sm:text-base">
            Sistema de Gestao Escolar no seu celular
          </p>
          {versao && (
            <p className="text-indigo-300 text-xs mt-2">
              Versao {versao.versao} — {formatarData(versao.data_lancamento)}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 -mt-6 space-y-5 pb-8">
        {/* Botao de Download */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg border border-gray-200 dark:border-slate-700 p-6 text-center">
          {versao?.playstore ? (
            // Play Store disponível
            <a href={versao.playstore} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-8 py-4 bg-green-600 hover:bg-green-700 text-white text-lg font-bold rounded-2xl shadow-lg shadow-green-600/20 transition-all">
              <Download className="w-6 h-6" />
              Baixar na Play Store
            </a>
          ) : (
            // Download direto (APK)
            <>
              <a href={versao?.download.android.url || '#'}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-3 px-8 py-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-lg font-bold rounded-2xl shadow-lg shadow-indigo-600/20 transition-all">
                <Download className="w-6 h-6" />
                Baixar App Android
              </a>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">
                APK {versao?.download.android.tamanho_mb || '~20'}MB — Android {versao?.download.android.min_android || '7.0'}+
              </p>
            </>
          )}
        </div>

        {/* Instruções de instalação */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-5">
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">Como instalar</h2>
          <div className="space-y-4">
            {[
              { num: '1', texto: 'Toque em "Baixar App Android" acima' },
              { num: '2', texto: 'Quando o download terminar, toque no arquivo baixado' },
              { num: '3', texto: 'Se pedir permissao, toque em "Permitir instalacao de fontes desconhecidas"' },
              { num: '4', texto: 'Toque em "Instalar" e aguarde' },
              { num: '5', texto: 'Abra o app e faca login com seu email e senha do SISAM' },
            ].map(p => (
              <div key={p.num} className="flex items-start gap-3">
                <span className="shrink-0 w-7 h-7 rounded-full bg-indigo-600 text-white text-sm font-bold flex items-center justify-center">{p.num}</span>
                <p className="text-sm text-gray-700 dark:text-gray-300 pt-0.5">{p.texto}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recursos */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-5">
          <h2 className="text-base font-bold text-gray-900 dark:text-white mb-4">Recursos do App</h2>
          <div className="grid grid-cols-2 gap-3">
            {recursos.map(r => (
              <div key={r.titulo} className="flex items-start gap-2.5 p-3 rounded-xl bg-gray-50 dark:bg-slate-700/50">
                <div className={`shrink-0 p-1.5 rounded-lg ${r.cor}`}>
                  <r.icone className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-gray-800 dark:text-white">{r.titulo}</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{r.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Changelog */}
        {versao?.changelog && versao.changelog.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700 p-5">
            <h2 className="text-base font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-indigo-600" /> Novidades v{versao.versao}
            </h2>
            <ul className="space-y-2">
              {versao.changelog.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5">
                  <CheckCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Nota sobre Play Store */}
        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4 border border-indigo-200 dark:border-indigo-800">
          <p className="text-xs text-indigo-800 dark:text-indigo-200 leading-relaxed">
            <strong>Em breve na Play Store!</strong> O app sera publicado na Google Play Store para facilitar a instalacao e atualizacoes automaticas. Enquanto isso, use o download direto acima.
          </p>
        </div>
      </div>
    </div>
  )
}
