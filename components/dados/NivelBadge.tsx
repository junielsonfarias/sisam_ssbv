'use client'

import { getNivelBadgeClass } from '@/lib/dados/utils'

type TamanhoBadge = 'xs' | 'sm' | 'md'

interface NivelBadgeProps {
  nivel: string | null | undefined
  className?: string
  tamanho?: TamanhoBadge
}

const tamanhoClasses: Record<TamanhoBadge, string> = {
  xs: 'px-1 py-0.5 text-[8px]',
  sm: 'px-1.5 py-0.5 text-[9px]',
  md: 'px-2 py-1 text-xs'
}

export default function NivelBadge({ nivel, className = '', tamanho = 'sm' }: NivelBadgeProps) {
  if (!nivel) return null

  return (
    <span className={`inline-flex items-center justify-center rounded-full font-bold ${tamanhoClasses[tamanho]} ${getNivelBadgeClass(nivel)} ${className}`}>
      {nivel.toUpperCase()}
    </span>
  )
}
