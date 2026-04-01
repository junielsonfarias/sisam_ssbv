'use client'

import { useState, useEffect, useCallback } from 'react'
import { X } from 'lucide-react'

/** Chaves de armazenamento local */
const STORAGE_KEY_FONT = 'sisam-acessibilidade-fonte'
const STORAGE_KEY_CONTRASTE = 'sisam-acessibilidade-contraste'
const STORAGE_KEY_MOVIMENTO = 'sisam-acessibilidade-movimento'

/** Niveis de tamanho de fonte disponiveis */
const FONT_SIZES = [
  { label: 'Pequeno', value: 87.5, classe: 'A-' },
  { label: 'Normal', value: 100, classe: 'A' },
  { label: 'Grande', value: 112.5, classe: 'A+' },
  { label: 'Muito grande', value: 125, classe: 'A++' },
]

/**
 * Barra de acessibilidade flutuante
 * Botao no canto inferior esquerdo que abre painel com opcoes:
 * - Tamanho da fonte (A-, A, A+, A++)
 * - Alto contraste
 * - Movimento reduzido
 * Preferencias salvas em localStorage
 */
export default function AccessibilityBar() {
  const [aberto, setAberto] = useState(false)
  const [indiceFonte, setIndiceFonte] = useState(1) // Normal
  const [altoContraste, setAltoContraste] = useState(false)
  const [movimentoReduzido, setMovimentoReduzido] = useState(false)

  // Carregar preferencias do localStorage
  useEffect(() => {
    try {
      const fonteStr = localStorage.getItem(STORAGE_KEY_FONT)
      if (fonteStr) {
        const idx = parseInt(fonteStr, 10)
        if (idx >= 0 && idx < FONT_SIZES.length) {
          setIndiceFonte(idx)
          document.documentElement.style.fontSize = `${FONT_SIZES[idx].value}%`
        }
      }

      const contrasteStr = localStorage.getItem(STORAGE_KEY_CONTRASTE)
      if (contrasteStr === 'true') {
        setAltoContraste(true)
        document.documentElement.classList.add('alto-contraste')
      }

      const movimentoStr = localStorage.getItem(STORAGE_KEY_MOVIMENTO)
      if (movimentoStr === 'true') {
        setMovimentoReduzido(true)
        document.documentElement.classList.add('movimento-reduzido')
      }
    } catch {
      // localStorage pode nao estar disponivel
    }
  }, [])

  /** Alterar tamanho da fonte */
  const alterarFonte = useCallback((novoIndice: number) => {
    if (novoIndice < 0 || novoIndice >= FONT_SIZES.length) return
    setIndiceFonte(novoIndice)
    document.documentElement.style.fontSize = `${FONT_SIZES[novoIndice].value}%`
    try {
      localStorage.setItem(STORAGE_KEY_FONT, String(novoIndice))
    } catch { /* sem localStorage */ }
  }, [])

  /** Alternar alto contraste */
  const alternarContraste = useCallback(() => {
    setAltoContraste(prev => {
      const novo = !prev
      if (novo) {
        document.documentElement.classList.add('alto-contraste')
      } else {
        document.documentElement.classList.remove('alto-contraste')
      }
      try {
        localStorage.setItem(STORAGE_KEY_CONTRASTE, String(novo))
      } catch { /* sem localStorage */ }
      return novo
    })
  }, [])

  /** Alternar movimento reduzido */
  const alternarMovimento = useCallback(() => {
    setMovimentoReduzido(prev => {
      const novo = !prev
      if (novo) {
        document.documentElement.classList.add('movimento-reduzido')
      } else {
        document.documentElement.classList.remove('movimento-reduzido')
      }
      try {
        localStorage.setItem(STORAGE_KEY_MOVIMENTO, String(novo))
      } catch { /* sem localStorage */ }
      return novo
    })
  }, [])

  /** Resetar todas as configuracoes */
  const resetar = useCallback(() => {
    alterarFonte(1) // Normal
    if (altoContraste) alternarContraste()
    if (movimentoReduzido) alternarMovimento()
  }, [alterarFonte, altoContraste, alternarContraste, movimentoReduzido, alternarMovimento])

  return (
    <>
      {/* Botao flutuante de acessibilidade */}
      <button
        onClick={() => setAberto(prev => !prev)}
        className="fixed bottom-4 left-4 z-50 w-12 h-12 rounded-full bg-blue-800 hover:bg-blue-700
                   text-white shadow-lg hover:shadow-xl transition-all duration-200
                   flex items-center justify-center
                   focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2
                   dark:bg-blue-700 dark:hover:bg-blue-600 print:hidden"
        aria-label={aberto ? 'Fechar painel de acessibilidade' : 'Abrir painel de acessibilidade'}
        aria-expanded={aberto}
        aria-controls="painel-acessibilidade"
        title="Acessibilidade"
      >
        {/* Icone de acessibilidade universal (pessoa com bracos abertos) */}
        <svg
          className="w-6 h-6"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="4" r="2" />
          <path d="M12 8v4" />
          <path d="M6 10l6 2 6-2" />
          <path d="M9 18l3-6 3 6" />
        </svg>
      </button>

      {/* Painel de opcoes */}
      {aberto && (
        <div
          id="painel-acessibilidade"
          role="dialog"
          aria-label="Opcoes de acessibilidade"
          aria-modal="false"
          className="fixed bottom-20 left-4 z-50 w-72 bg-white dark:bg-slate-800
                     rounded-2xl shadow-2xl border border-gray-200 dark:border-slate-700
                     p-5 print:hidden"
        >
          {/* Cabecalho */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              Acessibilidade
            </h2>
            <button
              onClick={() => setAberto(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100
                         dark:hover:text-slate-300 dark:hover:bg-slate-700
                         focus:outline-none focus:ring-2 focus:ring-blue-400"
              aria-label="Fechar painel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Tamanho da fonte */}
          <div className="mb-4">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
              Tamanho da fonte
            </p>
            <div className="flex gap-1.5">
              {FONT_SIZES.map((item, idx) => (
                <button
                  key={item.classe}
                  onClick={() => alterarFonte(idx)}
                  className={`flex-1 py-2 px-1 rounded-lg text-xs font-bold transition-colors
                    focus:outline-none focus:ring-2 focus:ring-blue-400
                    ${indiceFonte === idx
                      ? 'bg-blue-800 text-white dark:bg-blue-600'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                    }`}
                  aria-label={`Fonte ${item.label}`}
                  aria-pressed={indiceFonte === idx}
                  title={item.label}
                >
                  {item.classe}
                </button>
              ))}
            </div>
          </div>

          {/* Alto contraste */}
          <div className="mb-3">
            <button
              onClick={alternarContraste}
              className={`w-full flex items-center justify-between py-2.5 px-3 rounded-lg text-sm font-medium transition-colors
                focus:outline-none focus:ring-2 focus:ring-blue-400
                ${altoContraste
                  ? 'bg-blue-800 text-white dark:bg-blue-600'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                }`}
              role="switch"
              aria-checked={altoContraste}
            >
              <span>Alto contraste</span>
              <span className={`w-8 h-5 rounded-full relative transition-colors ${
                altoContraste ? 'bg-blue-400' : 'bg-slate-300 dark:bg-slate-500'
              }`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                  altoContraste ? 'translate-x-3.5' : 'translate-x-0.5'
                }`} />
              </span>
            </button>
          </div>

          {/* Movimento reduzido */}
          <div className="mb-4">
            <button
              onClick={alternarMovimento}
              className={`w-full flex items-center justify-between py-2.5 px-3 rounded-lg text-sm font-medium transition-colors
                focus:outline-none focus:ring-2 focus:ring-blue-400
                ${movimentoReduzido
                  ? 'bg-blue-800 text-white dark:bg-blue-600'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'
                }`}
              role="switch"
              aria-checked={movimentoReduzido}
            >
              <span>Reduzir animacoes</span>
              <span className={`w-8 h-5 rounded-full relative transition-colors ${
                movimentoReduzido ? 'bg-blue-400' : 'bg-slate-300 dark:bg-slate-500'
              }`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                  movimentoReduzido ? 'translate-x-3.5' : 'translate-x-0.5'
                }`} />
              </span>
            </button>
          </div>

          {/* Botao de reset */}
          <button
            onClick={resetar}
            className="w-full py-2 text-xs font-medium text-slate-400 hover:text-slate-600
                       dark:text-slate-500 dark:hover:text-slate-300
                       focus:outline-none focus:ring-2 focus:ring-blue-400 rounded-lg"
          >
            Restaurar padrao
          </button>
        </div>
      )}
    </>
  )
}
