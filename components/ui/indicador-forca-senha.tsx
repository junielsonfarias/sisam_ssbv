'use client'

import { avaliarSenha, AvaliacaoSenha } from '@/lib/utils/senha-forca'

interface Props {
  senha: string
  /** Esconder lista de problemas (mostra só barra). Default: false */
  apenasBarra?: boolean
}

const CORES: Record<AvaliacaoSenha['pontuacao'], string> = {
  0: 'bg-red-500',
  1: 'bg-red-500',
  2: 'bg-orange-500',
  3: 'bg-yellow-500',
  4: 'bg-green-500',
  5: 'bg-green-600',
}

/**
 * Indicador visual de força de senha — barra + rótulo + lista de problemas.
 *
 * Usa `lib/utils/senha-forca` (mesma lógica do server Zod schema).
 */
export function IndicadorForcaSenha({ senha, apenasBarra = false }: Props) {
  if (!senha) return null

  const avaliacao = avaliarSenha(senha)
  const cor = CORES[avaliacao.pontuacao]
  const porcentagem = (avaliacao.pontuacao / 5) * 100

  return (
    <div className="mt-2 space-y-1">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full ${cor} transition-all duration-200`}
            style={{ width: `${porcentagem}%` }}
            role="progressbar"
            aria-valuenow={avaliacao.pontuacao}
            aria-valuemin={0}
            aria-valuemax={5}
            aria-label={`Força da senha: ${avaliacao.rotulo}`}
          />
        </div>
        <span className="text-xs font-medium text-gray-600 dark:text-gray-300 w-24 text-right">
          {avaliacao.rotulo}
        </span>
      </div>

      {!apenasBarra && avaliacao.problemas.length > 0 && (
        <ul className="text-xs text-red-600 dark:text-red-400 space-y-0.5 mt-1">
          {avaliacao.problemas.map((problema, i) => (
            <li key={i}>• {problema}</li>
          ))}
        </ul>
      )}
    </div>
  )
}
