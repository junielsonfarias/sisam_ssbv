'use client'

import { getNivelBadgeClass } from '@/lib/dados/utils'

interface NivelBadgeProps {
  nivel: string | null | undefined
  className?: string
}

export default function NivelBadge({ nivel, className = '' }: NivelBadgeProps) {
  if (!nivel) return null

  return (
    <span className={`inline-flex items-center justify-center px-1.5 py-0.5 rounded-full text-[9px] font-bold ${getNivelBadgeClass(nivel)} ${className}`}>
      {nivel.toUpperCase()}
    </span>
  )
}
