'use client'

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, CheckCircle, AlertTriangle, Cloud, ChevronDown, Trash2, Loader2 } from 'lucide-react'
import {
  obterFila,
  totalPendentes as getTotalPendentes,
  totalFalhas as getTotalFalhas,
  processarFila,
  removerDaFila,
  limparFila,
  type SyncItem,
} from '@/lib/offline-sync-queue'

/**
 * Badge compacto de status de sincronização offline
 * Mostra indicador visual + dropdown com detalhes
 */
export function SyncStatusBadge() {
  const [pendentes, setPendentes] = useState(0)
  const [falhas, setFalhas] = useState(0)
  const [aberto, setAberto] = useState(false)
  const [fila, setFila] = useState<SyncItem[]>([])
  const [sincronizando, setSincronizando] = useState(false)
  const [mensagem, setMensagem] = useState('')

  const atualizar = useCallback(() => {
    setPendentes(getTotalPendentes())
    setFalhas(getTotalFalhas())
    if (aberto) setFila(obterFila())
  }, [aberto])

  useEffect(() => {
    atualizar()
    const interval = setInterval(atualizar, 5000)
    return () => clearInterval(interval)
  }, [atualizar])

  const sincronizar = async () => {
    setSincronizando(true)
    setMensagem('')
    try {
      const result = await processarFila()
      setMensagem(`${result.sucesso} enviado(s), ${result.falhas} falha(s)`)
      atualizar()
    } catch {
      setMensagem('Erro ao sincronizar')
    } finally {
      setSincronizando(false)
      setTimeout(() => setMensagem(''), 3000)
    }
  }

  const removerItem = (id: string) => {
    removerDaFila(id)
    atualizar()
  }

  const limparTudo = () => {
    limparFila()
    atualizar()
    setAberto(false)
  }

  // Não mostrar nada se não há itens pendentes
  if (pendentes === 0 && !aberto) return null

  const tipoLabel: Record<string, string> = {
    frequencia: 'Freq.',
    nota: 'Nota',
    diario: 'Diário',
  }

  return (
    <div className="relative">
      <button
        onClick={() => { setAberto(!aberto); if (!aberto) setFila(obterFila()) }}
        className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all ${
          falhas > 0
            ? 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300'
            : pendentes > 0
              ? 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300'
              : 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300'
        }`}
        title={`${pendentes} pendente(s), ${falhas} falha(s)`}
      >
        {falhas > 0 ? (
          <AlertTriangle className="w-3 h-3" />
        ) : pendentes > 0 ? (
          <Cloud className="w-3 h-3" />
        ) : (
          <CheckCircle className="w-3 h-3" />
        )}
        <span>{pendentes}</span>
        <ChevronDown className={`w-2.5 h-2.5 transition-transform ${aberto ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {aberto && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setAberto(false)} />
          <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-200 dark:border-slate-700 z-50 overflow-hidden">
            <div className="p-3 border-b border-gray-100 dark:border-slate-700 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-800 dark:text-white">Fila de Sincronização</span>
              <div className="flex items-center gap-1">
                <button onClick={sincronizar} disabled={sincronizando || pendentes === 0}
                  className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/30 text-emerald-600 disabled:opacity-50 transition-colors"
                  title="Sincronizar agora">
                  {sincronizando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                </button>
                {fila.length > 0 && (
                  <button onClick={limparTudo}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/30 text-red-500 transition-colors"
                    title="Limpar fila">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {mensagem && (
              <div className="px-3 py-2 bg-emerald-50 dark:bg-emerald-900/20 text-xs text-emerald-600 dark:text-emerald-400">
                {mensagem}
              </div>
            )}

            <div className="max-h-48 overflow-y-auto">
              {fila.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-slate-400">
                  <CheckCircle className="w-6 h-6 mx-auto mb-1 opacity-40" />
                  <p>Nenhum item pendente</p>
                </div>
              ) : (
                fila.map(item => (
                  <div key={item.id} className="px-3 py-2 border-b border-gray-50 dark:border-slate-700/50 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-700/50">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                          item.tentativas >= 3
                            ? 'bg-red-100 text-red-600'
                            : 'bg-amber-100 text-amber-600'
                        }`}>
                          {tipoLabel[item.tipo] || item.tipo}
                        </span>
                        <span className="text-[10px] text-slate-400">{item.method}</span>
                        {item.tentativas > 0 && (
                          <span className="text-[10px] text-red-400">#{item.tentativas}</span>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">
                        {new Date(item.criadoEm).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <button onClick={() => removerItem(item.id)}
                      className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/30 text-slate-400 hover:text-red-500 flex-shrink-0">
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
