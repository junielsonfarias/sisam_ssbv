'use client'

import { useEffect, useRef, useState } from 'react'

interface ScrollAnimationOptions {
  /** Percentual do elemento visivel para disparar (0 a 1) */
  threshold?: number
  /** Margem do root para antecipar/atrasar deteccao */
  rootMargin?: string
  /** Disparar apenas uma vez (padrao: true) */
  triggerOnce?: boolean
}

/**
 * Hook para animacoes ao rolar (scroll-triggered animations)
 * Usa IntersectionObserver para detectar visibilidade do elemento
 * Respeita prefers-reduced-motion automaticamente
 */
export function useScrollAnimation(options: ScrollAnimationOptions = {}) {
  const { threshold = 0.1, rootMargin = '0px 0px -50px 0px', triggerOnce = true } = options
  const ref = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Respeitar preferencia de movimento reduzido
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) {
      setIsVisible(true)
      return
    }

    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          if (triggerOnce) observer.unobserve(el)
        } else if (!triggerOnce) {
          setIsVisible(false)
        }
      },
      { threshold, rootMargin }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [threshold, rootMargin, triggerOnce])

  return { ref, isVisible }
}
