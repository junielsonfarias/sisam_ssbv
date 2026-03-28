'use client'

import React from 'react'

interface KpiGridProps {
  children: React.ReactNode
  cols?: 2 | 3 | 4 | 5
}

const colsMap: Record<NonNullable<KpiGridProps['cols']>, string> = {
  2: 'grid grid-cols-2 gap-4',
  3: 'grid grid-cols-2 sm:grid-cols-3 gap-4',
  4: 'grid grid-cols-2 sm:grid-cols-4 gap-4',
  5: 'grid grid-cols-2 sm:grid-cols-5 gap-4',
}

/**
 * KpiGrid - Wrapper de grid responsivo para KpiCards
 */
export function KpiGrid({ children, cols = 4 }: KpiGridProps) {
  return <div className={colsMap[cols]}>{children}</div>
}
