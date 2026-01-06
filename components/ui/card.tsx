'use client'

import { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  /** Variante de estilo do card */
  variant?: 'default' | 'elevated' | 'outlined' | 'ghost'
  /** Padding interno */
  padding?: 'none' | 'sm' | 'md' | 'lg'
  /** Se o card é interativo (hover effect) */
  interactive?: boolean
}

/**
 * Card - Componente de container com suporte a tema claro/escuro
 *
 * Variantes:
 * - default: Background sólido com sombra sutil
 * - elevated: Sombra mais pronunciada
 * - outlined: Apenas borda, sem sombra
 * - ghost: Background transparente
 */
export function Card({
  children,
  className = '',
  variant = 'default',
  padding = 'md',
  interactive = false
}: CardProps) {
  const baseClasses = 'rounded-lg transition-all duration-200'

  const variantClasses = {
    default: 'bg-white dark:bg-slate-800 shadow-sm dark:shadow-slate-900/30 border border-gray-200 dark:border-slate-700',
    elevated: 'bg-white dark:bg-slate-800 shadow-md dark:shadow-slate-900/50 border border-gray-100 dark:border-slate-700',
    outlined: 'bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700',
    ghost: 'bg-transparent'
  }

  const paddingClasses = {
    none: '',
    sm: 'p-3 sm:p-4',
    md: 'p-4 sm:p-6',
    lg: 'p-6 sm:p-8'
  }

  const interactiveClasses = interactive
    ? 'hover:shadow-md dark:hover:shadow-slate-900/50 hover:border-gray-300 dark:hover:border-slate-600 cursor-pointer'
    : ''

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${paddingClasses[padding]} ${interactiveClasses} ${className}`}>
      {children}
    </div>
  )
}

interface CardHeaderProps {
  children: ReactNode
  className?: string
}

export function CardHeader({ children, className = '' }: CardHeaderProps) {
  return (
    <div className={`mb-4 ${className}`}>
      {children}
    </div>
  )
}

interface CardTitleProps {
  children: ReactNode
  className?: string
  as?: 'h1' | 'h2' | 'h3' | 'h4'
}

export function CardTitle({ children, className = '', as: Tag = 'h3' }: CardTitleProps) {
  return (
    <Tag className={`text-lg font-semibold text-gray-900 dark:text-white ${className}`}>
      {children}
    </Tag>
  )
}

interface CardDescriptionProps {
  children: ReactNode
  className?: string
}

export function CardDescription({ children, className = '' }: CardDescriptionProps) {
  return (
    <p className={`text-sm text-gray-600 dark:text-gray-400 ${className}`}>
      {children}
    </p>
  )
}

interface CardContentProps {
  children: ReactNode
  className?: string
}

export function CardContent({ children, className = '' }: CardContentProps) {
  return (
    <div className={className}>
      {children}
    </div>
  )
}

interface CardFooterProps {
  children: ReactNode
  className?: string
}

export function CardFooter({ children, className = '' }: CardFooterProps) {
  return (
    <div className={`mt-4 pt-4 border-t border-gray-200 dark:border-slate-700 ${className}`}>
      {children}
    </div>
  )
}

// ========================================
// COMPONENTES DE MÉTRICAS (DASHBOARD)
// ========================================

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: ReactNode
  trend?: {
    value: number
    label: string
    positive?: boolean
  }
  className?: string
}

/**
 * MetricCard - Card para exibição de métricas/estatísticas
 */
export function MetricCard({
  title,
  value,
  subtitle,
  icon,
  trend,
  className = ''
}: MetricCardProps) {
  return (
    <Card className={className}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          <p className="mt-1 text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
          {subtitle && (
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{subtitle}</p>
          )}
          {trend && (
            <div className={`mt-2 flex items-center text-sm ${
              trend.positive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>
              <span className="font-medium">{trend.positive ? '+' : ''}{trend.value}%</span>
              <span className="ml-1 text-gray-500 dark:text-gray-400">{trend.label}</span>
            </div>
          )}
        </div>
        {icon && (
          <div className="flex-shrink-0 p-3 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg text-indigo-600 dark:text-indigo-400">
            {icon}
          </div>
        )}
      </div>
    </Card>
  )
}

// ========================================
// COMPONENTE DE ALERTA/STATUS
// ========================================

interface AlertCardProps {
  children: ReactNode
  variant?: 'info' | 'success' | 'warning' | 'error'
  icon?: ReactNode
  className?: string
}

/**
 * AlertCard - Card para mensagens de alerta/status
 */
export function AlertCard({
  children,
  variant = 'info',
  icon,
  className = ''
}: AlertCardProps) {
  const variantClasses = {
    info: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
    success: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200',
    warning: 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200',
    error: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
  }

  return (
    <div className={`rounded-lg border p-4 ${variantClasses[variant]} ${className}`}>
      <div className="flex items-start gap-3">
        {icon && <div className="flex-shrink-0 mt-0.5">{icon}</div>}
        <div className="flex-1">{children}</div>
      </div>
    </div>
  )
}
