'use client'

import { useEffect, useRef, useState } from 'react'
import { AlertTriangle, Info, X, Loader2 } from 'lucide-react'

export type ConfirmVariant = 'info' | 'warning' | 'danger'

export interface ConfirmModalProps {
  aberto: boolean
  titulo: string
  mensagem: string
  variant?: ConfirmVariant
  /** Se true, mostra textarea exigindo input do usuário antes de confirmar */
  exigirJustificativa?: boolean
  /** Placeholder do textarea (apenas se exigirJustificativa) */
  placeholderJustificativa?: string
  /** Tamanho mínimo da justificativa */
  minCaracteresJustificativa?: number
  /** Texto do botão de confirmação */
  textoConfirmar?: string
  /** Texto do botão de cancelar */
  textoCancelar?: string
  /** Callback ao confirmar — recebe justificativa se exigirJustificativa */
  onConfirmar: (justificativa?: string) => void | Promise<void>
  /** Callback ao fechar/cancelar */
  onFechar: () => void
  /** Se true, desabilita botão de confirmar e mostra spinner */
  processando?: boolean
}

const VARIANT_CONFIG: Record<ConfirmVariant, {
  Icon: typeof AlertTriangle
  iconColor: string
  iconBg: string
  btnConfirmarBg: string
  btnConfirmarHover: string
}> = {
  info: {
    Icon: Info,
    iconColor: 'text-blue-600',
    iconBg: 'bg-blue-100 dark:bg-blue-900/30',
    btnConfirmarBg: 'bg-blue-600',
    btnConfirmarHover: 'hover:bg-blue-700',
  },
  warning: {
    Icon: AlertTriangle,
    iconColor: 'text-amber-600',
    iconBg: 'bg-amber-100 dark:bg-amber-900/30',
    btnConfirmarBg: 'bg-amber-600',
    btnConfirmarHover: 'hover:bg-amber-700',
  },
  danger: {
    Icon: AlertTriangle,
    iconColor: 'text-red-600',
    iconBg: 'bg-red-100 dark:bg-red-900/30',
    btnConfirmarBg: 'bg-red-600',
    btnConfirmarHover: 'hover:bg-red-700',
  },
}

export function ConfirmModal({
  aberto,
  titulo,
  mensagem,
  variant = 'info',
  exigirJustificativa = false,
  placeholderJustificativa = 'Informe o motivo...',
  minCaracteresJustificativa = 5,
  textoConfirmar = 'Confirmar',
  textoCancelar = 'Cancelar',
  onConfirmar,
  onFechar,
  processando = false,
}: ConfirmModalProps) {
  const [justificativa, setJustificativa] = useState('')
  const dialogRef = useRef<HTMLDivElement>(null)
  const btnCancelarRef = useRef<HTMLButtonElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const cfg = VARIANT_CONFIG[variant]
  const Icon = cfg.Icon

  // Reset ao abrir
  useEffect(() => {
    if (aberto) {
      setJustificativa('')
      // Foco no textarea (se exigirJustificativa) ou no botão cancelar
      setTimeout(() => {
        if (exigirJustificativa) textareaRef.current?.focus()
        else btnCancelarRef.current?.focus()
      }, 50)
    }
  }, [aberto, exigirJustificativa])

  // ESC fecha modal
  useEffect(() => {
    if (!aberto) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !processando) onFechar()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [aberto, processando, onFechar])

  // Focus trap básico — Tab cicla entre elementos focáveis do modal
  useEffect(() => {
    if (!aberto || !dialogRef.current) return
    const dialog = dialogRef.current
    function handleTab(e: KeyboardEvent) {
      if (e.key !== 'Tab') return
      const focusables = dialog.querySelectorAll<HTMLElement>(
        'button, textarea, input, [href], [tabindex]:not([tabindex="-1"])'
      )
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    dialog.addEventListener('keydown', handleTab)
    return () => dialog.removeEventListener('keydown', handleTab)
  }, [aberto])

  if (!aberto) return null

  const justificativaOk = !exigirJustificativa || justificativa.trim().length >= minCaracteresJustificativa

  async function handleConfirmar() {
    if (!justificativaOk || processando) return
    await onConfirmar(exigirJustificativa ? justificativa.trim() : undefined)
  }

  return (
    <div
      className="fixed inset-0 z-[110] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm"
      onClick={() => !processando && onFechar()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-titulo"
      aria-describedby="confirm-msg"
    >
      <div
        ref={dialogRef}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className={`${cfg.iconBg} rounded-full p-2 flex-shrink-0`}>
              <Icon className={`w-6 h-6 ${cfg.iconColor}`} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 id="confirm-titulo" className="text-lg font-bold text-gray-800 dark:text-gray-100">
                {titulo}
              </h2>
              <p id="confirm-msg" className="text-sm text-gray-600 dark:text-gray-300 mt-1 whitespace-pre-wrap">
                {mensagem}
              </p>
            </div>
            <button
              type="button"
              onClick={onFechar}
              disabled={processando}
              className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700 disabled:opacity-50"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {exigirJustificativa && (
            <div className="mt-4">
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1 block">
                Justificativa <span className="text-red-500">*</span>
                <span className="ml-1 text-gray-400">(mín. {minCaracteresJustificativa} caracteres)</span>
              </label>
              <textarea
                ref={textareaRef}
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
                rows={3}
                placeholder={placeholderJustificativa}
                disabled={processando}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-700 text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-50"
              />
              <p className="text-[10px] text-gray-400 mt-1 text-right">
                {justificativa.trim().length}/{minCaracteresJustificativa}+
              </p>
            </div>
          )}
        </div>

        <div className="px-6 py-3 bg-gray-50 dark:bg-slate-900/50 flex justify-end gap-2 border-t border-gray-200 dark:border-slate-700">
          <button
            ref={btnCancelarRef}
            type="button"
            onClick={onFechar}
            disabled={processando}
            className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-gray-200 text-sm font-bold hover:bg-gray-200 dark:hover:bg-slate-600 disabled:opacity-50"
          >
            {textoCancelar}
          </button>
          <button
            type="button"
            onClick={handleConfirmar}
            disabled={!justificativaOk || processando}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg ${cfg.btnConfirmarBg} ${cfg.btnConfirmarHover} text-white text-sm font-bold disabled:opacity-50`}
          >
            {processando && <Loader2 className="w-4 h-4 animate-spin" />}
            {textoConfirmar}
          </button>
        </div>
      </div>
    </div>
  )
}
