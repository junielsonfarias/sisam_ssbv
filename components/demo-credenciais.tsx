'use client'

/**
 * Botão + modal de credenciais de DEMONSTRAÇÃO.
 *
 * Só aparece quando `NEXT_PUBLIC_DEMO_MODE === 'true'` (definido apenas no
 * deploy de demonstração — educanet). Em produção real fica oculto.
 *
 * As credenciais espelham o seed `scripts/seed/seed-demo.js`. Para REMOVER a
 * demonstração: rodar `database/seeds/remove-demo.sql` e desligar a env.
 */

import { useState } from 'react'
import { Eye, Copy, Check, X, ShieldCheck } from 'lucide-react'

export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

interface Credencial {
  perfil: string
  email: string
  senha: string
  descricao: string
}

const SENHA_DEMO = 'Educanet@2026'

export const CREDENCIAIS_DEMO: Credencial[] = [
  { perfil: 'Administrador', email: 'admin.demo@educanet.app', senha: SENHA_DEMO, descricao: 'Acesso total (SEMED + Admin)' },
  { perfil: 'Técnico (SEMED)', email: 'tecnico.demo@educanet.app', senha: SENHA_DEMO, descricao: 'Gestão da rede municipal' },
  { perfil: 'Direção de Escola', email: 'escola.demo@educanet.app', senha: SENHA_DEMO, descricao: 'Gestão da Escola Demonstração' },
  { perfil: 'Professor', email: 'professor.demo@educanet.app', senha: SENHA_DEMO, descricao: 'Diário, notas e frequência' },
  { perfil: 'Responsável', email: 'responsavel.demo@educanet.app', senha: SENHA_DEMO, descricao: 'Portal dos pais (boletim do filho)' },
]

interface Props {
  /** Preenche o formulário de login ao clicar em "Usar". Opcional. */
  onPreencher?: (email: string, senha: string) => void
}

export function DemoCredenciais({ onPreencher }: Props) {
  const [aberto, setAberto] = useState(false)
  const [copiado, setCopiado] = useState<string | null>(null)

  if (!DEMO_MODE) return null

  async function copiar(texto: string, id: string) {
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(id)
      setTimeout(() => setCopiado(null), 1500)
    } catch { /* clipboard indisponível */ }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 py-2.5 px-4 text-sm font-semibold hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors min-h-[44px] active:scale-[0.98]"
      >
        <Eye className="w-4 h-4" />
        Ver credenciais de demonstração
      </button>

      {aberto && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-0 sm:p-4"
          onClick={() => setAberto(false)}
        >
          <div
            className="bg-white dark:bg-slate-800 rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 dark:border-slate-700">
              <h3 className="text-base font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                Credenciais de demonstração
              </h3>
              <button onClick={() => setAberto(false)} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-slate-700" aria-label="Fechar">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-5 py-3 text-xs text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-900/40">
              Ambiente de <strong>demonstração</strong> — todos os dados são fictícios. Senha de todos: <strong>{SENHA_DEMO}</strong>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {CREDENCIAIS_DEMO.map((c) => (
                <div key={c.email} className="rounded-xl border border-gray-200 dark:border-slate-700 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">{c.perfil}</p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">{c.descricao}</p>
                      <p className="text-xs text-gray-700 dark:text-gray-300 mt-1 font-mono break-all">{c.email}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => copiar(c.email, c.email)}
                        title="Copiar e-mail"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      >
                        {copiado === c.email ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                      {onPreencher && (
                        <button
                          onClick={() => { onPreencher(c.email, c.senha); setAberto(false) }}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-blue-800 text-white hover:bg-blue-900"
                        >
                          Usar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
