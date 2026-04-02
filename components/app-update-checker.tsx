'use client'

import { useEffect, useState } from 'react'
import { Download, X, Sparkles } from 'lucide-react'
import { isNativeApp } from '@/lib/capacitor'

interface UpdateInfo {
  versao: string
  versao_codigo: number
  obrigatoria: boolean
  changelog: string[]
  download: { android: { url: string } }
  playstore: string | null
}

// Versão atual embutida no app (atualizar a cada build)
const VERSAO_ATUAL_CODIGO = 260402

/**
 * Componente que verifica atualizações do app.
 * Exibe banner quando há nova versão disponível.
 *
 * Incluir nos layouts de professor, responsavel, escola, admin.
 */
export function AppUpdateChecker() {
  const [update, setUpdate] = useState<UpdateInfo | null>(null)
  const [dispensado, setDispensado] = useState(false)

  useEffect(() => {
    // Só verificar se estiver no app nativo ou se o usuário acessou pelo celular
    verificarAtualizacao()

    // Re-verificar a cada 4 horas
    const interval = setInterval(verificarAtualizacao, 4 * 60 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const verificarAtualizacao = async () => {
    try {
      // Verificar se já dispensou nesta sessão
      const dispensadoKey = `sisam_update_dispensado_${VERSAO_ATUAL_CODIGO}`
      if (sessionStorage.getItem(dispensadoKey)) return

      const res = await fetch('/api/app-version', { cache: 'no-store' })
      if (!res.ok) return

      const data: UpdateInfo = await res.json()

      // Há atualização se versão do servidor > versão local
      if (data.versao_codigo > VERSAO_ATUAL_CODIGO) {
        setUpdate(data)
      }
    } catch {
      // Sem internet — ignorar
    }
  }

  const dispensar = () => {
    setDispensado(true)
    sessionStorage.setItem(`sisam_update_dispensado_${VERSAO_ATUAL_CODIGO}`, 'true')
  }

  const baixar = () => {
    if (update?.playstore) {
      window.open(update.playstore, '_blank')
    } else if (update?.download.android.url) {
      window.location.href = update.download.android.url
    }
  }

  if (!update || dispensado) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:max-w-sm animate-in slide-in-from-bottom">
      <div className={`rounded-2xl shadow-2xl border overflow-hidden ${
        update.obrigatoria
          ? 'bg-red-50 dark:bg-red-900/30 border-red-300 dark:border-red-700'
          : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700'
      }`}>
        {/* Header */}
        <div className="px-4 pt-4 pb-2 flex items-start justify-between">
          <div className="flex items-center gap-2.5">
            <div className="bg-indigo-100 dark:bg-indigo-900/40 rounded-xl p-2">
              <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900 dark:text-white">
                {update.obrigatoria ? 'Atualizacao obrigatoria' : 'Nova versao disponivel!'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">SISAM v{update.versao}</p>
            </div>
          </div>
          {!update.obrigatoria && (
            <button onClick={dispensar} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700">
              <X className="w-4 h-4 text-gray-400" />
            </button>
          )}
        </div>

        {/* Changelog resumido */}
        {update.changelog.length > 0 && (
          <div className="px-4 pb-2">
            <ul className="space-y-1">
              {update.changelog.slice(0, 3).map((item, i) => (
                <li key={i} className="text-xs text-gray-600 dark:text-gray-300 flex items-start gap-1.5">
                  <span className="text-indigo-500 mt-0.5">•</span> {item}
                </li>
              ))}
              {update.changelog.length > 3 && (
                <li className="text-[10px] text-gray-400">+{update.changelog.length - 3} mais...</li>
              )}
            </ul>
          </div>
        )}

        {/* Botão */}
        <div className="px-4 pb-4 pt-1">
          <button onClick={baixar}
            className="w-full py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl flex items-center justify-center gap-2 transition-colors">
            <Download className="w-4 h-4" />
            {update.playstore ? 'Atualizar na Play Store' : 'Baixar atualizacao'}
          </button>
          {!update.obrigatoria && (
            <button onClick={dispensar} className="w-full mt-1.5 py-1.5 text-xs text-gray-400 hover:text-gray-600">
              Lembrar mais tarde
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
