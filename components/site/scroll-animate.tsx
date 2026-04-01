'use client'

import { useScrollAnimation } from '@/lib/hooks/useScrollAnimation'

type AnimationType = 'fade-up' | 'fade-left' | 'fade-right' | 'zoom-in' | 'fade'

interface ScrollAnimateProps {
  children: React.ReactNode
  /** Tipo de animacao (padrao: fade-up) */
  animation?: AnimationType
  /** Atraso em milissegundos */
  delay?: number
  className?: string
}

/** Classes CSS para cada tipo de animacao (estado oculto) */
const animacaoOculta: Record<AnimationType, string> = {
  'fade-up': 'translate-y-8 opacity-0',
  'fade-left': '-translate-x-8 opacity-0',
  'fade-right': 'translate-x-8 opacity-0',
  'zoom-in': 'scale-95 opacity-0',
  'fade': 'opacity-0',
}

/** Classes CSS para estado visivel (resetar transformacoes) */
const animacaoVisivel = 'translate-y-0 translate-x-0 scale-100 opacity-100'

/**
 * Componente wrapper para animacoes ao rolar a pagina
 * Usa IntersectionObserver internamente e respeita prefers-reduced-motion
 */
export function ScrollAnimate({
  children,
  animation = 'fade-up',
  delay = 0,
  className = '',
}: ScrollAnimateProps) {
  const { ref, isVisible } = useScrollAnimation()

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${
        isVisible ? animacaoVisivel : animacaoOculta[animation]
      } ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}
