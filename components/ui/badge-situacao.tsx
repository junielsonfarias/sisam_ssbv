import { SITUACAO_CONFIG } from '@/lib/types/common'

/**
 * Badge de situação do aluno (aprovado, reprovado, cursando, etc.)
 * Fonte única de verdade para cores e labels de situação.
 *
 * Uso:
 *   <BadgeSituacao situacao="aprovado" />
 *   <BadgeSituacao situacao={aluno.situacao} tamanho="sm" />
 */
export function BadgeSituacao({
  situacao,
  tamanho = 'sm',
}: {
  situacao: string | null | undefined
  tamanho?: 'xs' | 'sm' | 'md'
}) {
  const sit = situacao || 'cursando'
  const config = SITUACAO_CONFIG[sit] || SITUACAO_CONFIG.cursando

  const tamanhoClasses = {
    xs: 'text-[10px] px-1.5 py-0.5',
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-3 py-1',
  }

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${config.bg} ${config.cor} ${tamanhoClasses[tamanho]}`}>
      {config.label}
    </span>
  )
}
